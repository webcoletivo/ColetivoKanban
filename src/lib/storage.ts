import { writeFile, mkdir, unlink, stat } from 'fs/promises'
import path from 'path'

// In production (Coolify/Docker), we want to use a path that we can mount a volume to.
// /app/uploads is a good standard.
// In development, we use local project uploads folder.
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export const STORAGE_DIRS = {
  BOARDS: 'boards',
  COVERS: 'covers',
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments'
}

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
 * Save a file to local storage
 */
export async function saveFile(
  file: File | Buffer, 
  folder: string, 
  filename: string
): Promise<{ path: string; url: string; relativePath: string }> {
  const bytes = file instanceof File ? await file.arrayBuffer() : file
  const buffer = Buffer.from(bytes as ArrayBuffer)

  const uploadDir = path.join(UPLOAD_ROOT, folder)
  await ensureDir(uploadDir)

  const filePath = path.join(uploadDir, filename)
  await writeFile(filePath, buffer)

  // URL should be the API route that serves this file
  // local path relative to UPLOAD_ROOT
  const relativePath = path.join(folder, filename).replace(/\\/g, '/')
  const url = `/api/uploads/${relativePath}`

  return { path: filePath, url, relativePath }
}

/**
 * Delete a file from local storage
 */
export async function deleteFile(folder: string, filename: string) {
  try {
    const filePath = path.join(UPLOAD_ROOT, folder, filename)
    await unlink(filePath)
    return true
  } catch (error) {
    // Ignore if file doesn't exist
    return false
  }
}

/**
 * Get file full path
 */
export function getFilePath(folder: string, filename: string) {
  return path.join(UPLOAD_ROOT, folder, filename)
}

/**
 * Get file stats (size, type)
 */
export async function getFileStats(folder: string, filename: string) {
    const filePath = getFilePath(folder, filename)
    return stat(filePath)
}
