import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileUrl, isUsingS3, S3_PREFIXES } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const filenameArg = searchParams.get("filename");

    if (!key) {
      return new NextResponse("Missing key", { status: 400 });
    }

    const session = await auth();
    const user = session?.user;

    if (!user) {
       return new NextResponse("Unauthorized", { status: 401 });
    }

    // Authorization Logic (duplicated from inline)
    if (key.startsWith(S3_PREFIXES.AVATARS + "/")) {
       // Allow
    } 
    else if (key.startsWith(S3_PREFIXES.BACKGROUNDS + "/")) {
        const parts = key.split("/");
        if (parts.length >= 2) {
            const boardId = parts[1];
            const member = await prisma.boardMember.findUnique({
                where: { boardId_userId: { boardId, userId: user.id } }
            });
            if (!member) return new NextResponse("Forbidden", { status: 403 });
        }
    }
    else if (key.startsWith(S3_PREFIXES.COVERS + "/") || key.startsWith(S3_PREFIXES.ATTACHMENTS + "/")) {
         const parts = key.split("/");
         if (parts.length >= 2) {
             const resourceId = parts[1];
             const card = await prisma.card.findUnique({
                 where: { id: resourceId },
                 select: { boardId: true }
             });
             if (!card) return new NextResponse("Not Found", { status: 404 });
             
             const member = await prisma.boardMember.findUnique({
                where: { boardId_userId: { boardId: card.boardId, userId: user.id } }
            });
            if (!member) return new NextResponse("Forbidden", { status: 403 });
         }
    }

    const downloadFilename = filenameArg || path.basename(key);

    if (isUsingS3()) {
        try {
            const s3Client = new S3Client({
                region: process.env.S3_REGION!,
                endpoint: process.env.S3_ENDPOINT || undefined,
                credentials: {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
                },
                forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
            });

            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: key,
            });

            const response = await s3Client.send(command);
            const encodedFilename = encodeURIComponent(downloadFilename);
            
            // @ts-ignore
            return new NextResponse(response.Body, {
                headers: {
                    "Content-Type": response.ContentType || "application/octet-stream",
                    "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
                    "Content-Length": response.ContentLength?.toString() || "",
                },
            });
        } catch (error: any) {
            console.error("S3 Download Stream Error:", error);
            if (error.name === 'NoSuchKey') {
                 return new NextResponse("Not Found", { status: 404 });
            }
            return new NextResponse("Error fetching file", { status: 500 });
        }
    } else {
        const filePath = path.join(process.cwd(), 'uploads', key);
        
        // Path Traversal Check
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
        const encodedFilename = encodeURIComponent(downloadFilename);
        
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": stats.size.toString(),
                "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
            }
        });
    }

  } catch (error) {
    console.error("[FILES_DOWNLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
