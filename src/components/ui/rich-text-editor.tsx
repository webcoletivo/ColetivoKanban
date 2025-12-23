'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { KanbanLink } from './editor/KanbanLink'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Strikethrough,
  Minus,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState, useRef, useCallback } from 'react'

interface RichTextEditorProps {
  content: string
  onChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  autoFocus?: boolean
  onCmdEnter?: () => void
  onEscape?: () => void
}

// Link Popover Component
function LinkPopover({ 
  editor, 
  onClose 
}: { 
  editor: Editor
  onClose: () => void 
}) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      onClose()
      return
    }

    // Add protocol if missing
    let finalUrl = url.trim()
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl
    }

    editor.chain().focus().setKanbanLink({ href: finalUrl }).run()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-center gap-2 p-2 bg-popover border border-border rounded-lg shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Cole ou digite a URL..."
        className="px-2 py-1.5 text-sm bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-64"
      />
      <button 
        type="submit" 
        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium"
      >
        Aplicar
      </button>
      <button 
        type="button"
        onClick={onClose}
        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </form>
  )
}

const Toolbar = ({ 
  editor, 
  onLinkClick 
}: { 
  editor: Editor | null
  onLinkClick: () => void 
}) => {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border/60 bg-muted/30 rounded-t-lg">
      {/* Text formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('bold') && "bg-secondary text-foreground font-medium"
        )}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('italic') && "bg-secondary text-foreground font-medium"
        )}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('underline') && "bg-secondary text-foreground font-medium"
        )}
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('strike') && "bg-secondary text-foreground font-medium"
        )}
        title="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('heading', { level: 1 }) && "bg-secondary text-foreground font-medium"
        )}
        title="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('heading', { level: 2 }) && "bg-secondary text-foreground font-medium"
        )}
        title="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('heading', { level: 3 }) && "bg-secondary text-foreground font-medium"
        )}
        title="Título 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('bulletList') && "bg-secondary text-foreground font-medium"
        )}
        title="Lista de Marcadores"
      >
        <List className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('orderedList') && "bg-secondary text-foreground font-medium"
        )}
        title="Lista Numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Block elements */}
      <button
        type="button"
        onClick={onLinkClick}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('kanbanLink') && "bg-secondary text-foreground font-medium"
        )}
        title="Link (Ctrl+K)"
      >
        <LinkIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('blockquote') && "bg-secondary text-foreground font-medium"
        )}
        title="Citação"
      >
        <Quote className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('code') && "bg-secondary text-foreground font-medium"
        )}
        title="Código Inline"
      >
        <Code className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={cn(
          "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
          editor.isActive('codeBlock') && "bg-secondary text-foreground font-medium"
        )}
        title="Bloco de Código"
      >
        <Code2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Linha Horizontal"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  )
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = '', 
  editable = true, 
  className,
  autoFocus = false,
  onCmdEnter,
  onEscape
}: RichTextEditorProps) {
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  
  const handleLinkClick = useCallback(() => {
    setShowLinkPopover(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default link from StarterKit since we use KanbanLink
      }),
      Underline,
      KanbanLink,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground/50 before:float-left before:pointer-events-none',
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    immediatelyRender: false,
    editorProps: {
      handleKeyDown: (view, event) => {
        // Ctrl/Cmd + Enter to submit
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          if (onCmdEnter) {
            onCmdEnter()
            return true
          }
        }
        
        // Ctrl/Cmd + K for link
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault()
          setShowLinkPopover(true)
          return true
        }
        
        // Escape to cancel
        if (event.key === 'Escape') {
          if (showLinkPopover) {
            setShowLinkPopover(false)
            return true
          }
          if (onEscape) {
            onEscape()
            return true
          }
        }
        
        // Tab/Shift+Tab for list indentation
        if (event.key === 'Tab') {
          const { state } = view
          const { selection } = state
          
          // Check if we're in a list
          const $from = state.doc.resolve(selection.from)
          let inList = false
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'listItem') {
              inList = true
              break
            }
          }
          
          if (inList) {
            event.preventDefault()
            const editorInstance = (view as any).editor as Editor
            if (editorInstance) {
              if (event.shiftKey) {
                editorInstance.chain().focus().liftListItem('listItem').run()
              } else {
                editorInstance.chain().focus().sinkListItem('listItem').run()
              }
            }
            return true
          }
        }
        
        return false
      },
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[80px] p-3 text-sm',
          'prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
          'prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-lg prose-pre:p-3',
          'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          'prose-hr:my-4 prose-hr:border-border',
          'text-foreground',
          className
        ),
      },
    },
  })

  // Update content if changed externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
       if (editor.isEmpty && content) {
          editor.commands.setContent(content)
       }
    }
  }, [content, editor])

  // Auto focus
  useEffect(() => {
    if (editor && autoFocus) {
       editor.commands.focus('end')
    }
  }, [editor, autoFocus])

  if (!editor) {
    return null
  }

  return (
    <div className="relative border border-input rounded-lg overflow-hidden bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
      {editable && <Toolbar editor={editor} onLinkClick={handleLinkClick} />}
      <EditorContent editor={editor} />
      
      {/* Link Popover */}
      {showLinkPopover && editor && (
        <div className="absolute top-12 left-2 z-50">
          <LinkPopover 
            editor={editor} 
            onClose={() => {
              setShowLinkPopover(false)
              editor.chain().focus().run()
            }} 
          />
        </div>
      )}
    </div>
  )
}

// Export a read-only version for displaying rich text
// Uses TipTap in read-only mode to properly render KanbanLink nodes with their React NodeViews
export function RichTextDisplay({ content, className }: { content: string; className?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      KanbanLink,
    ],
    content,
    editable: false,
    immediatelyRender: false,
  })

  // Update content if it changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    // Fallback to dangerouslySetInnerHTML while editor initializes
    return (
      <div 
        className={cn(
          "prose dark:prose-invert max-w-none prose-sm",
          "prose-p:my-2 prose-headings:my-3 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
          "prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-lg prose-pre:p-3",
          "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
          "prose-hr:my-4 prose-hr:border-border",
          "break-words",
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div 
      className={cn(
        "prose dark:prose-invert max-w-none prose-sm",
        "prose-p:my-2 prose-headings:my-3 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-lg prose-pre:p-3",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
        "prose-hr:my-4 prose-hr:border-border",
        "break-words",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}
