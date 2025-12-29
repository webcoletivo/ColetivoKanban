'use client'

import * as React from 'react'
import { Activity, ArrowRight, Calendar, Check, Tag, Paperclip, MessageSquare, CheckSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { formatDateTime } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
  actor: { id: string; name: string; avatarUrl: string | null; avatarKey?: string | null } | null
}

interface CardActivitiesProps {
  activities: ActivityItem[]
}

const activityMessages: Record<string, (payload: Record<string, unknown>) => string> = {
  CARD_CREATED: () => 'criou este cartão',
  CARD_MOVED: (payload) => {
    const from = (payload.fromColumn as { title: string })?.title || 'desconhecido'
    const to = (payload.toColumn as { title: string })?.title || 'desconhecido'
    return `moveu de "${from}" para "${to}"`
  },
  CARD_UPDATED: (payload) => {
    const field = payload.field as string
    if (field === 'title') return 'atualizou o título'
    if (field === 'description') return 'atualizou a descrição'
    return 'atualizou o cartão'
  },
  CARD_ARCHIVED: () => 'arquivou este cartão',
  CARD_UNARCHIVED: () => 'desarquivou este cartão',
  DUE_SET: () => 'definiu a data de entrega',
  DUE_REMOVED: () => 'removeu a data de entrega',
  DUE_COMPLETED: () => 'marcou como concluído',
  DUE_UNCOMPLETED: () => 'desmarcou como concluído',
  LABEL_ADDED: (payload) => {
    const name = (payload.label as { name?: string })?.name
    return name ? `adicionou a label "${name}"` : 'adicionou uma label'
  },
  LABEL_REMOVED: (payload) => {
    const name = (payload.label as { name?: string })?.name
    return name ? `removeu a label "${name}"` : 'removeu uma label'
  },
  CHECKLIST_CREATED: (payload) => {
    const title = payload.checklistTitle as string
    return title ? `criou o checklist "${title}"` : 'criou um checklist'
  },
  CHECKLIST_DELETED: (payload) => {
    const title = payload.checklistTitle as string
    return title ? `removeu o checklist "${title}"` : 'removeu um checklist'
  },
  CHECKLIST_ITEM_ADDED: () => 'adicionou um item ao checklist',
  CHECKLIST_ITEM_COMPLETED: () => 'completou um item do checklist',
  CHECKLIST_ITEM_UNCOMPLETED: () => 'desmarcou um item do checklist',
  CHECKLIST_ITEM_DELETED: () => 'removeu um item do checklist',
  ATTACHMENT_ADDED: (payload) => {
    const name = payload.fileName as string
    return name ? `adicionou o anexo "${name}"` : 'adicionou um anexo'
  },
  ATTACHMENT_REMOVED: (payload) => {
    const name = payload.fileName as string
    return name ? `removeu o anexo "${name}"` : 'removeu um anexo'
  },
  COMMENT_ADDED: () => 'adicionou um comentário',
  COMMENT_EDITED: () => 'editou um comentário',
  COMMENT_DELETED: () => 'excluiu um comentário',
}

const activityIcons: Record<string, React.ElementType> = {
  CARD_CREATED: Activity,
  CARD_MOVED: ArrowRight,
  CARD_UPDATED: Activity,
  CARD_ARCHIVED: Activity,
  CARD_UNARCHIVED: Activity,
  DUE_SET: Calendar,
  DUE_REMOVED: Calendar,
  DUE_COMPLETED: Check,
  DUE_UNCOMPLETED: Calendar,
  LABEL_ADDED: Tag,
  LABEL_REMOVED: Tag,
  CHECKLIST_CREATED: CheckSquare,
  CHECKLIST_DELETED: CheckSquare,
  CHECKLIST_ITEM_ADDED: CheckSquare,
  CHECKLIST_ITEM_COMPLETED: Check,
  CHECKLIST_ITEM_UNCOMPLETED: CheckSquare,
  CHECKLIST_ITEM_DELETED: CheckSquare,
  ATTACHMENT_ADDED: Paperclip,
  ATTACHMENT_REMOVED: Paperclip,
  COMMENT_ADDED: MessageSquare,
  COMMENT_EDITED: MessageSquare,
  COMMENT_DELETED: MessageSquare,
}

export function CardActivities({ activities }: CardActivitiesProps) {
  const [showAll, setShowAll] = React.useState(false)

  const displayedActivities = showAll ? activities : activities.slice(0, 5)

  if (activities.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Atividades</h3>
      </div>

      <div className="space-y-3">
        {displayedActivities.map((activity) => {
          const getMessage = activityMessages[activity.type] || (() => activity.type)
          const Icon = activityIcons[activity.type] || Activity

          return (
            <div key={activity.id} className="flex items-start gap-3">
              {activity.actor ? (
                <Avatar
                  src={activity.actor.avatarUrl}
                  avatarKey={activity.actor.avatarKey}
                  name={activity.actor.name}
                  size="xs"
                />
              ) : (
                <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {activity.actor?.name || 'Sistema'}
                  </span>{' '}
                  {getMessage(activity.payload)}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatDateTime(activity.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {activities.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-primary hover:underline font-medium"
        >
          Ver todas as {activities.length} atividades
        </button>
      )}
    </div>
  )
}
