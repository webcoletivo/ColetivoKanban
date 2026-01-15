
import { prisma } from './prisma';
import { S3_PREFIXES } from './storage';
import { Session } from 'next-auth';

export async function authorizeFileAccess(session: Session | null, key: string): Promise<boolean> {
  const user = session?.user;

  if (!user) {
    return false;
  }

  if (key.startsWith(S3_PREFIXES.AVATARS + '/')) {
    return true;
  }

  if (key.startsWith(S3_PREFIXES.BACKGROUNDS + '/')) {
    const parts = key.split('/');
    if (parts.length >= 2) {
      const boardId = parts[1];
      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId: user.id } },
      });
      return !!member;
    }
  }

  if (key.startsWith(S3_PREFIXES.COVERS + '/') || key.startsWith(S3_PREFIXES.ATTACHMENTS + '/')) {
    const parts = key.split('/');
    if (parts.length >= 2) {
      const resourceId = parts[1];
      const card = await prisma.card.findUnique({
        where: { id: resourceId },
        select: { boardId: true },
      });
      if (!card) {
        return false;
      }
      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: card.boardId, userId: user.id } },
      });
      return !!member;
    }
  }

  return false;
}
