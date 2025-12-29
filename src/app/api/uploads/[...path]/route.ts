import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

// Must match storage.ts UPLOAD_ROOT logic
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    
    // Safety check: prevent traversal
    const relativePath = path.join(...pathSegments)
    const filePath = path.join(UPLOAD_ROOT, relativePath)
    
    // Ensure the resolved path is within UPLOAD_ROOT
    const resolvedPath = path.resolve(filePath)
    const resolvedRoot = path.resolve(UPLOAD_ROOT)
    
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    try {
      await stat(filePath)
    } catch (e) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    }

    if (mimeTypes[ext]) {
        contentType = mimeTypes[ext]
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
