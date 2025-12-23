'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Users, MoreHorizontal, Pencil, Trash2, Image as ImageIcon, X, Upload, Loader2 } from 'lucide-react'
import { AvatarGroup } from '@/components/ui/avatar'
import { Modal, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface BoardHeaderProps {
  board: {
    id: string
    name: string
    myRole: string
    members: Array<{
      id: string
      name: string
      email: string
      avatarUrl: string | null
      role: string
    }>
    backgroundImageUrl?: string | null
  }
  onOpenCard: (cardId: string) => void
}

export function BoardHeader({ board, onOpenCard }: BoardHeaderProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [isEditing, setIsEditing] = React.useState(false)
  const [name, setName] = React.useState(board.name)
  const [showSearch, setShowSearch] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<Array<{
    id: string
    title: string
    columnTitle: string
    archivedAt: string | null
  }>>([])
  const [showMembersModal, setShowMembersModal] = React.useState(false)
  const [showBackgroundModal, setShowBackgroundModal] = React.useState(false)
  const [showMenu, setShowMenu] = React.useState(false)

  const updateBoardMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar board')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setIsEditing(false)
    },
    onError: () => {
      addToast('error', 'Erro ao atualizar nome do board')
    },
  })

  // Search cards
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/boards/${board.id}/search?query=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const results = await res.json()
          setSearchResults(results)
        }
      } catch (error) {
        console.error('Search error:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, board.id])

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && name !== board.name) {
      updateBoardMutation.mutate(name.trim())
    } else {
      setIsEditing(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background/60 backdrop-blur-md border-b border-border/40 sticky top-0 z-10 supports-[backdrop-filter]:bg-background/40">
      {/* Board Name */}
      <div className="flex items-center gap-4">
        {isEditing ? (
          <form onSubmit={handleNameSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsEditing(false)}
              autoFocus
              className="text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xl font-bold text-foreground hover:bg-secondary/50 px-2 py-1 rounded-lg transition-colors tracking-tight"
          >
            {board.name}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showSearch 
                ? 'bg-gray-100 dark:bg-gray-800' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          {showSearch && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover rounded-xl shadow-xl border border-border/60 p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
              <Input
                placeholder="Buscar cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onOpenCard(result.id)
                        setShowSearch(false)
                        setSearchQuery('')
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate flex-1">{result.title}</p>
                        {result.archivedAt && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                            Arquivado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{result.columnTitle}</p>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum card encontrado
                </p>
              )}
            </div>
          )}
        </div>

        {/* Members */}
        <button 
          onClick={() => setShowMembersModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <AvatarGroup
            avatars={board.members.map((m) => ({
              src: m.avatarUrl,
              name: m.name,
            }))}
            max={3}
            size="xs"
          />
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {board.members.length} {board.members.length === 1 ? 'membro' : 'membros'}
          </span>
        </button>

        {/* Background Settings (Admin only) */}
        {board.myRole === 'ADMIN' && (
          <button
            onClick={() => setShowBackgroundModal(true)}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Mudar plano de fundo"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
        )}

        {/* Share Button */}
        <Button size="sm" onClick={() => setShowMembersModal(true)}>
          <Users className="h-4 w-4 mr-1" />
          Compartilhar
        </Button>
      </div>

      {/* Members Modal */}
      <MembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        board={board as any}
      />

      {/* Background Modal */}
      {showBackgroundModal && (
        <BackgroundUploadModal 
          isOpen={showBackgroundModal}
          onClose={() => setShowBackgroundModal(false)}
          boardId={board.id}
          currentBackground={board.backgroundImageUrl}
        />
      )}
    </div>
  )
}

function BackgroundUploadModal({ 
  isOpen, 
  onClose, 
  boardId,
  currentBackground 
}: { 
  isOpen: boolean
  onClose: () => void
  boardId: string
  currentBackground?: string | null
}) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/boards/${boardId}/background`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer upload')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      addToast('success', 'Plano de fundo atualizado!')
      onClose()
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/background`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao remover plano de fundo')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      addToast('success', 'Plano de fundo removido')
      onClose()
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        addToast('error', 'Arquivo muito grande (máx 10MB)')
        return
      }
      uploadMutation.mutate(file)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>Plano de fundo do quadro</ModalHeader>
      <div className="p-6 space-y-4">
        {currentBackground ? (
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border group">
            <img 
              src={currentBackground} 
              alt="Background" 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Button 
                 variant="destructive" 
                 size="sm"
                 onClick={() => removeMutation.mutate()}
                 disabled={removeMutation.isPending}
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Remover
               </Button>
            </div>
          </div>
        ) : (
          <div className="aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-secondary/20">
            <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum fundo personalizado</p>
          </div>
        )}

        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <Button 
            className="w-full" 
            onClick={() => fileInputRef.current?.click()}
            isLoading={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {currentBackground ? 'Trocar imagem' : 'Enviar imagem'}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground tracking-tight">
            JPG, PNG ou WebP. Máximo 10MB.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function MembersModal({ 
  isOpen, 
  onClose, 
  board 
}: { 
  isOpen: boolean
  onClose: () => void
  board: { 
    id: string; 
    ownerId: string;
    myUserId: string;
    myRole: string; 
    members: Array<{ id: string; name: string; email: string; avatarUrl: string | null; role: string }> 
  }
}) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [email, setEmail] = React.useState('')
  const [memberToRemove, setMemberToRemove] = React.useState<{ id: string; name: string } | null>(null)
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null)
  
  const isAdmin = board.myRole === 'ADMIN'

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/boards/${board.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao convidar')
      }
      return res.json()
    },
    onSuccess: () => {
      addToast('success', 'Convite enviado!')
      setEmail('')
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  // Role Change Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/boards/${board.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar papel')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] })
      addToast('success', 'Papel atualizado com sucesso')
      setActiveMenuId(null)
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/boards/${board.id}/members/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover membro')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] })
      addToast('success', 'Membro removido')
      setMemberToRemove(null)
      setActiveMenuId(null)
    },
    onError: (error: Error) => {
      addToast('error', error.message)
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      inviteMutation.mutate(email.trim())
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="md" 
    >
      <ModalHeader onClose={onClose} className="flex-shrink-0">
        Membros do Board
      </ModalHeader>
      
      {/* Content wrapper with flex layout for sticky header/scrollable body */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Invite Form (Admin only) - Fixed at top */}
        {isAdmin && (
          <div className="p-6 pb-0 flex-shrink-0">
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                placeholder="E-mail do convidado"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0"
              />
              <Button type="submit" isLoading={inviteMutation.isPending} className="shrink-0">
                Convidar
              </Button>
            </form>
            <div className="h-px bg-border mt-6" />
          </div>
        )}

        {/* Members List - Scrollable area */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background pb-2 z-10">
            Membros ({board.members.length})
          </h3>
          
          <div className="space-y-2">
            {board.members.map((member) => {
              // Determine if we can manage this member
              const isOwner = member.id === board.ownerId
              const isMe = member.id === board.myUserId
              const canManage = isAdmin && !isMe
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium border border-blue-600/20 shadow-sm shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate max-w-full">
                          {member.name}
                        </p>
                        {isMe && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">(Você)</span>}
                        {isOwner && <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-medium shrink-0">Dono</span>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative shrink-0 pl-2">
                     <span className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-full border',
                        member.role === 'ADMIN'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-secondary text-muted-foreground border-transparent'
                      )}>
                        {member.role === 'ADMIN' ? 'Admin' : 'Membro'}
                      </span>
                    
                    {/* Management Menu */}
                    {canManage && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                          className={cn(
                            "p-1.5 rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                            activeMenuId === member.id && "bg-background text-foreground shadow-sm ring-1 ring-border opacity-100"
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {/* Dropdown Popover */}
                        {activeMenuId === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-popover rounded-lg shadow-xl border border-border p-1 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                              
                              {/* Edit Role Actions */}
                              <div className="p-1">
                                <span className="text-[10px] font-semibold text-muted-foreground px-2 py-1 block uppercase tracking-wider">Alterar função</span>
                                {member.role === 'USER' ? (
                                   <button
                                    onClick={() => updateRoleMutation.mutate({ userId: member.id, role: 'ADMIN' })}
                                    disabled={updateRoleMutation.isPending}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary flex items-center gap-2"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Tornar Admin
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateRoleMutation.mutate({ userId: member.id, role: 'USER' })}
                                    disabled={updateRoleMutation.isPending || isOwner} 
                                    className={cn(
                                      "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary flex items-center gap-2",
                                      isOwner && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    Tornar Membro
                                  </button>
                                )}
                              </div>

                              <div className="h-px bg-border my-1" />

                              {/* Remove Action */}
                              <button
                                onClick={() => {
                                  setMemberToRemove({ id: member.id, name: member.name })
                                  setActiveMenuId(null)
                                }}
                                disabled={isOwner}
                                className={cn(
                                  "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2",
                                  isOwner && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover do quadro
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => memberToRemove && removeMemberMutation.mutate(memberToRemove.id)}
        title="Remover usuário do quadro?"
        description={`Ele perderá acesso a este quadro. Essa ação pode ser desfeita convidando novamente.`}
        confirmText="Remover"
        isLoading={removeMemberMutation.isPending}
      />
    </Modal>
  )
}
