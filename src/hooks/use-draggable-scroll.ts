import { useRef, useEffect, useState, useCallback } from 'react'

export function useDraggableScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })
  const scrollPos = useRef({ left: 0, top: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag if clicking on the container or non-interactive elements
    const target = e.target as HTMLElement
    
    // Check if target is interactive or inside an interactive element
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('[data-no-drag-scroll]') ||
      target.closest('[role="button"]')
    ) {
      return
    }

    if (e.button !== 0 && e.button !== 2) return // Allow left (0) or right (2) click
    
    // Prevent default context menu if right clicking to drag
    if (e.button === 2) {
      e.preventDefault()
    }

    if (!ref.current) return

    setIsDragging(true)
    startPos.current = { x: e.clientX, y: e.clientY }
    scrollPos.current = { 
      left: ref.current.scrollLeft, 
      top: ref.current.scrollTop 
    }
    
    // Change cursor
    ref.current.style.cursor = 'grabbing'
    ref.current.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !ref.current) return

    e.preventDefault()
    
    const dx = e.clientX - startPos.current.x
    // const dy = e.clientY - startPos.current.y // Vertical scroll usually not needed for board view 

    ref.current.scrollLeft = scrollPos.current.left - dx
    // ref.current.scrollTop = scrollPos.current.top - dy
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (ref.current) {
      ref.current.style.cursor = ''
      ref.current.style.removeProperty('user-select')
    }
  }, [isDragging])

  useEffect(() => {
    const container = ref.current
    if (!container) return

    // Add global listeners for move/up to handle dragging outside container
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    // Prevent context menu if dragging with right click
    const handleContextMenu = (e: MouseEvent) => {
      // If we are dragging or just finished dragging, prevent context menu
      // Or simply preventing it always on the container if the intent is to support right-drag
      // For now, let's just minimal interference
      // if (isDragging) e.preventDefault() 
    }

    // Attach to window or document to catch release outside
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return { ref, handleMouseDown, isDragging }
}
