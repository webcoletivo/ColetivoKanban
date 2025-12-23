import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes HTML strings to prevent XSS attacks.
 * Useful for processing rich text editor content (Tiptap).
 * 
 * Allowed elements:
 * - Text formatting: strong, em, u, s (bold, italic, underline, strikethrough)
 * - Headings: h1, h2, h3
 * - Lists: ul, ol, li
 * - Links: a (with href, target, rel, and data attributes for Trello-like modes)
 * - Code: code (inline), pre (code blocks)
 * - Block elements: p, br, blockquote, hr
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 's', 
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'hr',
      'span' // For inline elements
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class',
      // KanbanLink attributes
      'data-kanban-link',
      'data-display-mode', 
      'data-title', 
      'data-thumbnail', 
      'data-icon',
      'data-href',
      'data-description'
    ],
  })
}

/**
 * Strips all HTML tags, returning plain text.
 * Useful for checking if content is empty.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Checks if HTML content is effectively empty.
 */
export function isHtmlEmpty(html: string): boolean {
  const stripped = stripHtml(html)
  return stripped === ''
}
