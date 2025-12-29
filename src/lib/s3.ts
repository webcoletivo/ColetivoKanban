import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'

// ============================================
// S3 Configuration
// ============================================

const S3_REGION = process.env.S3_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET || ''
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || ''
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ''
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined // For R2/Wasabi/MinIO
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === 'true' // MinIO requires true
const S3_SIGNED_URL_EXPIRES_SECONDS = parseInt(process.env.S3_SIGNED_URL_EXPIRES_SECONDS || '900', 10)

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
  return !!(S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)
}

/**
 * Get the configured S3 bucket name
 */
export function getS3Bucket(): string {
  return S3_BUCKET
}

/**
 * Create S3 client singleton
 */
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!isS3Configured()) {
      throw new Error('S3 is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.')
    }

    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT || undefined,
      forcePathStyle: S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    })
  }
  return s3Client
}

// ============================================
// Storage Key Generators
// ============================================

export const S3_PREFIXES = {
  ATTACHMENTS: 'attachments',
  COVERS: 'covers',
  BACKGROUNDS: 'backgrounds',
  AVATARS: 'avatars',
} as const

/**
 * Generate a unique storage key for uploads
 */
export function generateStorageKey(
  prefix: string,
  resourceId: string,
  filename: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${prefix}/${resourceId}/${timestamp}-${sanitizedFilename}`
}

// ============================================
// Upload Functions
// ============================================

export interface UploadResult {
  storageKey: string
  bucket: string
  etag?: string
}

/**
 * Upload a file buffer to S3
 */
export async function uploadBuffer(
  buffer: Buffer,
  storageKey: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const client = getS3Client()

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  })

  const response = await client.send(command)

  return {
    storageKey,
    bucket: S3_BUCKET,
    etag: response.ETag,
  }
}

/**
 * Upload a readable stream to S3 (for large files)
 */
export async function uploadStream(
  stream: Readable,
  storageKey: string,
  contentType: string,
  contentLength?: number,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const client = getS3Client()

  // Convert stream to buffer for standard upload
  // For very large files (>100MB), consider multipart upload
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const buffer = Buffer.concat(chunks)

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
    ContentLength: contentLength || buffer.length,
    Metadata: metadata,
  })

  const response = await client.send(command)

  return {
    storageKey,
    bucket: S3_BUCKET,
    etag: response.ETag,
  }
}

/**
 * Upload a File object (from FormData) to S3
 */
export async function uploadFile(
  file: File,
  storageKey: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = file.type || 'application/octet-stream'
  
  return uploadBuffer(buffer, storageKey, contentType, metadata)
}

// ============================================
// Delete Functions
// ============================================

/**
 * Delete an object from S3
 */
export async function deleteObject(storageKey: string): Promise<boolean> {
  try {
    const client = getS3Client()

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
    })

    await client.send(command)
    return true
  } catch (error) {
    console.error('S3 delete error:', error)
    return false
  }
}

// ============================================
// Presigned URL Functions
// ============================================

export type ContentDisposition = 'inline' | 'attachment'

export interface SignedUrlOptions {
  /** Content disposition: 'inline' for preview, 'attachment' for download */
  disposition?: ContentDisposition
  /** Original filename for Content-Disposition header */
  filename?: string
  /** Expiration in seconds (default: 900 = 15 minutes) */
  expiresIn?: number
  /** Custom content type override */
  contentType?: string
}

/**
 * Generate a presigned URL for downloading/viewing an object
 */
export async function getPresignedUrl(
  storageKey: string,
  options: SignedUrlOptions = {}
): Promise<string> {
  const client = getS3Client()
  const {
    disposition = 'inline',
    filename,
    expiresIn = S3_SIGNED_URL_EXPIRES_SECONDS,
    contentType,
  } = options

  // Build ResponseContentDisposition
  let responseContentDisposition: string | undefined
  if (filename) {
    const encodedFilename = encodeURIComponent(filename)
    responseContentDisposition = `${disposition}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
  } else {
    responseContentDisposition = disposition
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: storageKey,
    ResponseContentDisposition: responseContentDisposition,
    ResponseContentType: contentType,
  })

  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Check if an object exists in S3
 */
export async function objectExists(storageKey: string): Promise<boolean> {
  try {
    const client = getS3Client()

    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
    })

    await client.send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

/**
 * Get object metadata (size, content-type, etc)
 */
export async function getObjectMetadata(storageKey: string): Promise<{
  contentType?: string
  contentLength?: number
  lastModified?: Date
  etag?: string
} | null> {
  try {
    const client = getS3Client()

    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
    })

    const response = await client.send(command)
    
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag,
    }
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}
