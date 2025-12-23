import { prisma } from './prisma'
import { Role } from '@prisma/client'

export type Permission = 
  | 'view_board'
  | 'edit_board'
  | 'delete_board'
  | 'invite_member'
  | 'remove_member'
  | 'change_member_role'
  | 'create_column'
  | 'edit_column'
  | 'delete_column'
  | 'create_card'
  | 'edit_card'
  | 'move_card'
  | 'delete_card'
  | 'manage_labels'
  | 'add_attachment'
  | 'delete_attachment'
  | 'add_comment'

const rolePermissions: Record<Role, Set<Permission>> = {
  ADMIN: new Set([
    'view_board',
    'edit_board',
    'delete_board',
    'invite_member',
    'remove_member',
    'change_member_role',
    'create_column',
    'edit_column',
    'delete_column',
    'create_card',
    'edit_card',
    'move_card',
    'delete_card',
    'manage_labels',
    'add_attachment',
    'delete_attachment',
    'add_comment',
  ]),
  USER: new Set([
    'view_board',
    'edit_board', // Users can edit board name (optional per PRD)
    'create_column',
    'edit_column',
    'delete_column',
    'create_card',
    'edit_card',
    'move_card',
    'delete_card',
    'manage_labels',
    'add_attachment',
    'delete_attachment',
    'add_comment',
  ]),
}

export async function getBoardMember(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
    include: {
      board: true,
    },
  })
}

export async function checkBoardPermission(
  boardId: string,
  userId: string,
  permission: Permission
): Promise<boolean> {
  const member = await getBoardMember(boardId, userId)
  
  if (!member) {
    return false
  }

  return rolePermissions[member.role].has(permission)
}

export async function requireBoardPermission(
  boardId: string,
  userId: string,
  permission: Permission
): Promise<{ member: NonNullable<Awaited<ReturnType<typeof getBoardMember>>>; hasPermission: true }> {
  const member = await getBoardMember(boardId, userId)
  
  if (!member) {
    throw new PermissionError('Você não é membro deste board', 404)
  }

  if (!rolePermissions[member.role].has(permission)) {
    throw new PermissionError('Você não tem permissão para realizar esta ação', 403)
  }

  return { member, hasPermission: true }
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export function isAdmin(role: Role): boolean {
  return role === 'ADMIN'
}
