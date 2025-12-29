import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileUrl, isUsingS3 } from "@/lib/storage";
import { prisma } from "@/lib/prisma"; // Correct import for db

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return new NextResponse("Missing key", { status: 400 });
    }

    const session = await auth();
    const user = session?.user;

    // 1. Authentication check
    if (!user) {
       return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Authorization
    if (key.startsWith("avatars/")) {
       // Allow logged in users
    } 
    else if (key.startsWith("backgrounds/")) {
        const parts = key.split("/");
        if (parts.length >= 2) {
            const boardId = parts[1];
            const member = await prisma.boardMember.findUnique({
                where: {
                    boardId_userId: {
                        boardId,
                        userId: user.id
                    }
                }
            });
            
            if (!member) {
                return new NextResponse("Forbidden", { status: 403 });
            }
        }
    }
    else if (key.startsWith("covers/") || key.startsWith("attachments/")) {
         const parts = key.split("/");
         if (parts.length >= 2) {
             const resourceId = parts[1]; // Usually cardId, but let's verify storage structure
             
             // Covers: covers/cardId/filename
             // Attachments: attachments/cardId/filename
             
             const card = await prisma.card.findUnique({
                 where: { id: resourceId },
                 select: { boardId: true }
             });
             
             if (!card) {
                  return new NextResponse("Not Found", { status: 404 });
             }
             
             const member = await prisma.boardMember.findUnique({
                where: {
                    boardId_userId: {
                        boardId: card.boardId,
                        userId: user.id
                    }
                }
            });
            
            if (!member) {
                return new NextResponse("Forbidden", { status: 403 });
            }
         }
    }

    // 3. Generate URL
    if (isUsingS3()) {
        const presignedUrl = await getFileUrl(key, { 
            disposition: "inline",
            expiresIn: 60 // 1 minute is usually enough for a redirect
        });
        
        // 4. Redirect
        return NextResponse.redirect(presignedUrl);
    } else {
        // Fallback for local storage
        const localUrl = await getFileUrl(key);
        // localUrl is something like "/api/uploads/..."
        // We can just redirect there
        return NextResponse.redirect(new URL(localUrl, req.url));
    }

  } catch (error) {
    console.error("[FILES_INLINE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
