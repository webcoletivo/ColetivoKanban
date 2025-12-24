import { z } from 'zod'

// Auth schemas
export const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos 1 letra')
    .regex(/[0-9]/, 'Senha deve conter pelo menos 1 número'),
  confirmPassword: z.string(),
  invite: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(60, 'Nome deve ter no máximo 60 caracteres').optional(),
  avatarUrl: z.string().url('Avatar deve ser uma URL válida').nullable().optional(),
})

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().optional(),
  emailInvitesEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  language: z.string().optional(),
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
  confirmation: z.string().refine((val) => val === 'EXCLUIR', {
    message: 'Digite "EXCLUIR" para confirmar',
  }),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos 1 letra')
    .regex(/[0-9]/, 'Senha deve conter pelo menos 1 número'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

// Board schemas
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Nome do board é obrigatório').max(100, 'Nome muito longo'),
})

export const updateBoardSchema = z.object({
  name: z.string().min(1, 'Nome do board é obrigatório').max(100, 'Nome muito longo'),
})

// Column schemas
export const createColumnSchema = z.object({
  title: z.string().min(1, 'Título da coluna é obrigatório').max(100, 'Título muito longo'),
})

export const updateColumnSchema = z.object({
  title: z.string().min(1, 'Título da coluna é obrigatório').max(100, 'Título muito longo'),
})

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string().uuid()),
})

// Card schemas
export const createCardSchema = z.object({
  title: z.string().min(1, 'Título do card é obrigatório').max(500, 'Título muito longo'),
})

export const updateCardSchema = z.object({
  title: z.string().min(1, 'Título do card é obrigatório').max(500, 'Título muito longo').optional(),
  description: z.string().max(50000, 'Descrição muito longa').nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  isCompleted: z.boolean().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  coverType: z.enum(['none', 'color', 'image']).optional(),
  coverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  coverSize: z.enum(['strip', 'full']).optional(),
})

export const moveCardSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number(),
  boardId: z.string().uuid().optional(),
})

// Label schemas
export const createLabelSchema = z.object({
  name: z.string().min(1, 'Nome da label é obrigatório').max(50, 'Nome muito longo'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
})

// Checklist schemas
export const createChecklistSchema = z.object({
  title: z.string().min(1, 'Título do checklist é obrigatório').max(100, 'Título muito longo'),
})

export const createChecklistItemSchema = z.object({
  text: z.string().min(1, 'Texto do item é obrigatório').max(500, 'Texto muito longo'),
  dueAt: z.string().datetime().nullable().optional(),
})

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1, 'Texto do item é obrigatório').max(500, 'Texto muito longo').optional(),
  isCompleted: z.boolean().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comentário é obrigatório').max(50000, 'Comentário muito longo'),
})

// Invitation schemas
export const inviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
})

// Types from schemas
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CreateBoardInput = z.infer<typeof createBoardSchema>
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>
export type CreateColumnInput = z.infer<typeof createColumnSchema>
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>
export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>
export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type MoveCardInput = z.infer<typeof moveCardSchema>
export type CreateLabelInput = z.infer<typeof createLabelSchema>
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type InviteInput = z.infer<typeof inviteSchema>
