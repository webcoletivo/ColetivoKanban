'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { RichTextEditor, RichTextDisplay } from '@/components/ui/rich-text-editor'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useCurrentUser } from '@/hooks/use-current-user'

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null; avatarKey?: string | null }
}

interface CardCommentsProps {
  cardId: string
  boardId: string
  comments: Comment[]
}

export function CardComments({ cardId, boardId, comments }: CardCommentsProps) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { data: currentUser } = useCurrentUser()
  const { addToast } = useToast()
  const [content, setContent] = React.useState('')
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null)
  const [editContent, setEditContent] = React.useState('')
  const [commentToDelete, setCommentToDelete] = React.useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Erro ao comentar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      setContent('')
      setIsExpanded(false)
    },
    onError: () => {
      addToast('error', 'Erro ao adicionar comentário')
    },
  })

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      setEditingCommentId(null)
      setEditContent('')
    },
    onError: () => {
      addToast('error', 'Erro ao atualizar comentário')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      setCommentToDelete(null)
      addToast('success', 'Comentário excluído')
    },
    onError: () => {
      addToast('error', 'Erro ao excluir comentário')
    },
  })

  const submitNewComment = React.useCallback(() => {
    const stripped = content.replace(/<[^>]*>/g, '').trim()
    if (stripped && !createCommentMutation.isPending) {
      createCommentMutation.mutate(content)
    }
  }, [content, createCommentMutation])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitNewComment()
  }

  const handleCollapseForm = React.useCallback(() => {
    setIsExpanded(false)
    setContent('')
  }, [])

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
    setMenuOpenId(null)
  }

  const handleCancelEdit = React.useCallback(() => {
    setEditingCommentId(null)
    setEditContent('')
  }, [])

  const handleSaveEdit = React.useCallback((commentId: string) => {
    const stripped = editContent.replace(/<[^>]*>/g, '').trim()
    if (stripped && !updateCommentMutation.isPending) {
      updateCommentMutation.mutate({ commentId, content: editContent })
    }
  }, [editContent, updateCommentMutation])

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId)
    setMenuOpenId(null)
  }

  const isAuthor = (comment: Comment) => session?.user?.id === comment.user.id

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Comentários</h3>
      </div>

      {/* Comment Form */}
      <div className="mb-6">
        {isExpanded ? (
          <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder=""
                  className="min-h-[100px]"
                  autoFocus
                  onCmdEnter={submitNewComment}
                  onEscape={handleCollapseForm}
                />
                <div className="flex gap-2 justify-start">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!content.replace(/<[^>]*>/g, '').trim()}
                    isLoading={createCommentMutation.isPending}
                  >
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCollapseForm}
                    disabled={createCommentMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div 
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-3 p-2 bg-secondary/30 border border-transparent hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            <Avatar 
              src={currentUser?.avatarUrl || session?.user?.avatarUrl} 
              avatarKey={currentUser?.avatarKey}
              name={currentUser?.name || session?.user?.name || 'User'} 
              size="sm" 
              updatedAt={currentUser?.updatedAt}
            />
            <span className="text-sm text-muted-foreground">Escrever um comentário...</span>
          </div>
        )}
      </div>

      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar
                src={comment.user.avatarUrl}
                avatarKey={comment.user.avatarKey}
                name={comment.user.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {formatDateTime(comment.createdAt)}
                  </span>
                  
                  {/* Actions Menu */}
                  {isAuthor(comment) && editingCommentId !== comment.id && (
                    <div className="relative ml-auto">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                        className="p-1 text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      
                      {menuOpenId === comment.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 top-full mt-1 w-32 bg-popover rounded-lg shadow-lg border border-border/60 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                            <button
                              onClick={() => handleStartEdit(comment)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/50"
                            >
                              <Pencil className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteClick(comment.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Comment Content or Edit Form */}
                {editingCommentId === comment.id ? (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-200">
                    <RichTextEditor
                      content={editContent}
                      onChange={setEditContent}
                      placeholder=""
                      autoFocus
                      onCmdEnter={() => handleSaveEdit(comment.id)}
                      onEscape={handleCancelEdit}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editContent.replace(/<[^>]*>/g, '').trim()}
                        isLoading={updateCommentMutation.isPending}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={updateCommentMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    <RichTextDisplay content={comment.content} className="prose-p:my-0" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={() => commentToDelete && deleteCommentMutation.mutate(commentToDelete)}
        title="Excluir comentário?"
        description="Essa ação é permanente e não pode ser desfeita."
        confirmText="Excluir"
        isLoading={deleteCommentMutation.isPending}
      />
    </div>
  )
}
