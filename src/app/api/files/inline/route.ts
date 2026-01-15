import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileUrl, isUsingS3, S3_PREFIXES } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { getFileStats, getFilePath } from "@/lib/storage";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { authorizeFileAccess } from "@/lib/file-auth";
import { s3Client } from "@/lib/s3";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return new NextResponse("Missing key", { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const isAuthorized = await authorizeFileAccess(session, key);
    if (!isAuthorized) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 3. Serve File
    if (isUsingS3()) {
        try {
            if (!s3Client) {
                throw new Error("S3 client is not initialized");
            }
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: key,
            });

            const response = await s3Client.send(command);
            
            // @ts-ignore
            return new NextResponse(response.Body, {
                headers: {
                    "Content-Type": response.ContentType || "application/octet-stream",
                    "Cache-Control": "public, max-age=31536000, immutable", // Aggressive caching since we use versioning
                    "ETag": response.ETag || "",
                },
            });
        } catch (error: any) {
            console.error("S3 Stream Error:", error);
            if (error.name === 'NoSuchKey') {
                 return new NextResponse("Not Found", { status: 404 });
            }
            return new NextResponse("Error fetching file", { status: 500 });
        }
    } else {
        // Local: Stream file
        // Key format: folder/resourceId/filename OR folder/filename
        // We need to map key back to file system path
        const parts = key.split('/');
        const folder = parts[0];
        const filename = parts[parts.length - 1];
        
        // For local storage, the key IS the relative path in uploads
        // Verify file exists
        const filePath = path.join(process.cwd(), 'uploads', key);
        
        // Basic Path Traversal Protection
        const resolvedPath = path.resolve(filePath);
        const uploadsRoot = path.resolve(process.cwd(), 'uploads');
        if (!resolvedPath.startsWith(uploadsRoot)) {
             return new NextResponse("Invalid path", { status: 400 });
        }

        if (!fs.existsSync(filePath)) {
             return new NextResponse("File Not Found", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);
        
        // Determine Content Type
        const ext = path.extname(filename).toLowerCase();
        let contentType = "application/octet-stream";
        if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
        else if (ext === ".png") contentType = "image/png";
        else if (ext === ".webp") contentType = "image/webp";
        else if (ext === ".pdf") contentType = "application/pdf";
        else if (ext === ".mp4") contentType = "video/mp4";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": stats.size.toString(),
                "Cache-Control": "public, max-age=31536000, immutable" // Aggressive caching
            }
        });
    }

  } catch (error) {
    console.error("[FILES_INLINE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
