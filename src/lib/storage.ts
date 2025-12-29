import { writeFile, mkdir, unlink, stat } from 'fs/promises'
import path from 'path'
import {
  isS3Configured,
  uploadFile as s3UploadFile,
  uploadBuffer as s3UploadBuffer,
  deleteObject as s3DeleteObject,
  getPresignedUrl as s3GetPresignedUrl,
  generateStorageKey,
  getS3Bucket,
  S3_PREFIXES,
  type SignedUrlOptions,
} from './s3'

// ============================================
// Configuration
// ============================================

// In production (Coolify/Docker), we want to use a path that we can mount a volume to.
// /app/uploads is a good standard.
// In development, we use local project uploads folder.
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export const STORAGE_DIRS = {
  BOARDS: 'backgrounds',
  COVERS: 'covers',
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments'
}

// Re-export S3 prefixes for convenience
export { S3_PREFIXES }

// ============================================
// Storage Mode Detection
// ============================================

export type StorageMode = 's3' | 'local'

/**
 * Get the current storage mode
 */
export function getStorageMode(): StorageMode {
  return isS3Configured() ? 's3' : 'local'
}

// ============================================
// Local Storage Functions (fallback)
// ============================================

/**
 * Ensures the upload directory exists
 */
async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true })
  } catch (error) {
    if ((error as any).code !== 'EEXIST') throw error
  }
}

/**
 * Save a file to local storage (legacy/fallback)
 */
async function saveFileLocal(
  file: File | Buffer, 
  folder: string, 
  filename: string,
  resourceId?: string
): Promise<{ path: string; url: string; relativePath: string; storageKey: string }> {
  const bytes = file instanceof File ? await file.arrayBuffer() : file
  const buffer = Buffer.from(bytes as ArrayBuffer)

  // If resourceId is provided, nest it: folder/resourceId
  // Otherwise just folder
  const targetFolder = resourceId ? path.join(folder, resourceId) : folder
  const uploadDir = path.join(UPLOAD_ROOT, targetFolder)
  await ensureDir(uploadDir)

  const filePath = path.join(uploadDir, filename)
  await writeFile(filePath, buffer)

  // URL should be the API route that serves this file
  // local path relative to UPLOAD_ROOT
  // We ensure forward slashes for keys/urls
  const relativePath = path.join(targetFolder, filename).replace(/\\/g, '/')
  
  // The proxy will serve this via /api/files/inline?key=...
  // But strictly speaking, the URL returned here might be used by legacy code.
  // We should prefer returning the proxy URL structure if possible, but saveFile is generic.
  // Let's stick to the direct path capability for legacy, but the key is what matters.
  const url = `/api/uploads/${relativePath}`
  
  // Storage Key MUST be unified: folder/resourceId/filename (or folder/filename)
  const storageKey = relativePath

  return { path: filePath, url, relativePath, storageKey }
}

/**
 * Delete a file from local storage
 */
async function deleteFileLocal(folder: string, filename: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_ROOT, folder, filename)
    await unlink(filePath)
    return true
  } catch (error) {
    // Ignore if file doesn't exist
    return false
  }
}

// ============================================
// Unified Storage Interface
// ============================================

export interface SaveFileResult {
  storageKey: string
  bucket?: string
  url: string // For backwards compatibility - presigned URL or local URL
}

/**
 * Save a file to storage (S3 or local fallback)
 */
export async function saveFile(
  file: File | Buffer, 
  folder: string, 
  filename: string,
  resourceId?: string
): Promise<SaveFileResult> {
  if (isS3Configured()) {
    // Use S3 storage
    const prefix = mapFolderToS3Prefix(folder)
    const storageKey = generateStorageKey(prefix, resourceId || folder, filename)
    
    if (file instanceof File) {
      const result = await s3UploadFile(file, storageKey)
      const url = await s3GetPresignedUrl(storageKey, { disposition: 'inline' })
      return {
        storageKey: result.storageKey,
        bucket: result.bucket,
        url,
      }
    } else {
      const result = await s3UploadBuffer(file, storageKey, 'application/octet-stream')
      const url = await s3GetPresignedUrl(storageKey, { disposition: 'inline' })
      return {
        storageKey: result.storageKey,
        bucket: result.bucket,
        url,
      }
    }
  } else {
    // Use local storage
    const result = await saveFileLocal(file, folder, filename, resourceId)
    return {
      storageKey: result.storageKey,
      url: result.url,
    }
  }
}

/**
 * Delete a file from storage (S3 or local)
 * 
 * For local: folder + filename
 * For S3: storageKey (full path)
 */
export async function deleteFile(folderOrStorageKey: string, filename?: string): Promise<boolean> {
  if (isS3Configured()) {
    // For S3, the first argument is the full storage key
    // If filename is provided, we're using legacy local format - reconstruct key
    const storageKey = filename 
      ? path.join(folderOrStorageKey, filename).replace(/\\/g, '/')
      : folderOrStorageKey
    return s3DeleteObject(storageKey)
  } else {
    // Local storage
    if (!filename) {
      // storageKey format: folder/filename
      const parts = folderOrStorageKey.split('/')
      filename = parts.pop()!
      folderOrStorageKey = parts.join('/')
    }
    return deleteFileLocal(folderOrStorageKey, filename)
  }
}

/**
 * Get a URL for accessing a file
 * 
 * For S3: Returns presigned URL
 * For local: Returns API route URL
 */
export async function getFileUrl(
  storageKey: string,
  options?: SignedUrlOptions
): Promise<string> {
  if (isS3Configured()) {
    return s3GetPresignedUrl(storageKey, options)
  } else {
    // Local: construct API URL
    return `/api/uploads/${storageKey}`
  }
}

/**
 * Get file full path (local only)
 */
export function getFilePath(folder: string, filename: string) {
  return path.join(UPLOAD_ROOT, folder, filename)
}

/**
 * Get file stats (local only)
 */
export async function getFileStats(folder: string, filename: string) {
  const filePath = getFilePath(folder, filename)
  return stat(filePath)
}

// ============================================
// Helper Functions
// ============================================

/**
 * Map legacy folder names to S3 prefixes
 */
function mapFolderToS3Prefix(folder: string): string {
  // Remove any path segments and get the base folder
  const baseFolder = folder.split('/')[0].split('\\')[0]
  
  switch (baseFolder) {
    case STORAGE_DIRS.BOARDS:
      return S3_PREFIXES.BACKGROUNDS
    case STORAGE_DIRS.COVERS:
      return S3_PREFIXES.COVERS
    case STORAGE_DIRS.AVATARS:
      return S3_PREFIXES.AVATARS
    case STORAGE_DIRS.ATTACHMENTS:
      return S3_PREFIXES.ATTACHMENTS
    default:
      return baseFolder
  }
}

/**
 * Check if storage is using S3
 */
export function isUsingS3(): boolean {
  return isS3Configured()
}

/**
 * Get current bucket name (S3 only)
 */
export function getCurrentBucket(): string | undefined {
  return isS3Configured() ? getS3Bucket() : undefined
}
