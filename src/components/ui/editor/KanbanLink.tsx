'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import LinkView from './LinkView'

export type LinkDisplayMode = 'url' | 'inline' | 'card' | 'embed'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    kanbanLink: {
      setKanbanLink: (attributes: { href: string; displayMode?: LinkDisplayMode }) => ReturnType
      unsetKanbanLink: () => ReturnType
      setLinkDisplayMode: (mode: LinkDisplayMode) => ReturnType
    }
  }
}

const URL_REGEX = /https?:\/\/[^\s<>[\]{}|\\^`"]+/g

export const KanbanLink = Node.create({
  name: 'kanbanLink',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  selectable: true,
  
  draggable: true,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: element => element.getAttribute('href'),
        renderHTML: attributes => ({
          href: attributes.href,
        }),
      },
      displayMode: {
        default: 'url',
        parseHTML: element => {
          // Try data attribute first, then fall back to checking class names
          const mode = element.getAttribute('data-display-mode')
          if (mode && ['url', 'inline', 'card', 'embed'].includes(mode)) {
            return mode
          }
          return 'url'
        },
        renderHTML: attributes => ({
          'data-display-mode': attributes.displayMode || 'url',
        }),
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) return {}
          return { 'data-title': attributes.title }
        },
      },
      thumbnail: {
        default: null,
        parseHTML: element => element.getAttribute('data-thumbnail'),
        renderHTML: attributes => {
          if (!attributes.thumbnail) return {}
          return { 'data-thumbnail': attributes.thumbnail }
        },
      },
      icon: {
        default: null,
        parseHTML: element => element.getAttribute('data-icon'),
        renderHTML: attributes => {
          if (!attributes.icon) return {}
          return { 'data-icon': attributes.icon }
        },
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => {
          if (!attributes.description) return {}
          return { 'data-description': attributes.description }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        // Priority for our own links (has data-kanban-link or legacy data-trello-link attribute)
        tag: 'a[data-kanban-link]',
        priority: 100,
      },
      {
        // Backward compatibility with old data-trello-link attribute
        tag: 'a[data-trello-link]',
        priority: 99,
      },
      {
        // Also parse regular links
        tag: 'a[href]',
        priority: 50,
        getAttrs: element => {
          const el = element as HTMLElement
          const href = el.getAttribute('href')
          if (!href) return false
          return {
            href,
            displayMode: el.getAttribute('data-display-mode') || 'url',
            title: el.getAttribute('data-title') || null,
            thumbnail: el.getAttribute('data-thumbnail') || null,
            icon: el.getAttribute('data-icon') || null,
            description: el.getAttribute('data-description') || null,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    // Render as <a> tag with all attributes preserved
    return [
      'a',
      mergeAttributes(
        {
          'data-kanban-link': 'true',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        HTMLAttributes
      ),
      // Use title if available, otherwise href
      HTMLAttributes.title || HTMLAttributes.href || 'Link',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkView)
  },

  addCommands() {
    return {
      setKanbanLink: (attributes) => ({ commands, state }) => {
        const { from, to, empty } = state.selection
        
        if (empty) {
          return commands.insertContent({
            type: this.name,
            attrs: {
              href: attributes.href,
              displayMode: attributes.displayMode || 'url',
            },
          })
        }
        
        const text = state.doc.textBetween(from, to)
        return commands.insertContentAt({ from, to }, {
          type: this.name,
          attrs: {
            href: attributes.href,
            displayMode: attributes.displayMode || 'url',
            title: text !== attributes.href ? text : null,
          },
        })
      },
      
      unsetKanbanLink: () => ({ commands, state }) => {
        const { from } = state.selection
        const node = state.doc.nodeAt(from)
        if (node?.type.name === this.name) {
          return commands.insertContentAt(
            { from, to: from + node.nodeSize }, 
            node.attrs.href
          )
        }
        return false
      },
      
      setLinkDisplayMode: (mode) => ({ commands, state }) => {
        const { from } = state.selection
        const node = state.doc.nodeAt(from)
        if (node?.type.name === this.name) {
          return commands.updateAttributes(this.name, { displayMode: mode })
        }
        return false
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => false,
    }
  },

  addProseMirrorPlugins() {
    const extensionThis = this
    
    return [
      new Plugin({
        key: new PluginKey('kanbanLinkAutolink'),
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain')
            if (!text) return false
            
            const urlMatch = text.trim().match(/^https?:\/\/[^\s]+$/)
            if (urlMatch) {
              const { state, dispatch } = view
              const { from, to } = state.selection
              
              const node = extensionThis.type.create({
                href: text.trim(),
                displayMode: 'url',
              })
              
              const tr = state.tr.replaceWith(from, to, node)
              dispatch(tr)
              return true
            }
            
            return false
          },
          
          handleTextInput(view, from, to, text) {
            if (text !== ' ' && text !== '\n') return false
            
            const { state } = view
            const $from = state.doc.resolve(from)
            const textBefore = $from.parent.textBetween(
              Math.max(0, $from.parentOffset - 200),
              $from.parentOffset,
              undefined,
              '\ufffc'
            )
            
            const matches = [...textBefore.matchAll(URL_REGEX)]
            if (matches.length === 0) return false
            
            const lastMatch = matches[matches.length - 1]
            if (!lastMatch || textBefore.slice(lastMatch.index! + lastMatch[0].length) !== '') {
              return false
            }
            
            const url = lastMatch[0]
            const urlStart = from - (textBefore.length - lastMatch.index!)
            const urlEnd = from
            
            const node = extensionThis.type.create({
              href: url,
              displayMode: 'url',
            })
            
            const { dispatch } = view
            let tr = state.tr.replaceWith(urlStart, urlEnd, node)
            tr = tr.insertText(text, tr.mapping.map(urlEnd))
            dispatch(tr)
            
            return true
          },
        },
      }),
    ]
  },
})
