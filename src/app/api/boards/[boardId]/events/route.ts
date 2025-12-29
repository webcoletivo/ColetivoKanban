import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { boardEvents } from '@/lib/events'
import { requireBoardPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { boardId } = await params

    // Verify permission
    try {
      await requireBoardPermission(boardId, session.user.id, 'view_board')
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Heartbeat to keep connection alive
        const interval = setInterval(() => {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        }, 30000)

        // Event handler
        const onBoardEvent = (data: any) => {
          // Format as SSE event
          // data should include type and payload
          const eventData = JSON.stringify(data)
          controller.enqueue(encoder.encode(`data: ${eventData}\n\n`))
        }

        // Subscribe to board-specific channel
        const channelName = `board:${boardId}`
        boardEvents.on(channelName, onBoardEvent)

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
          boardEvents.off(channelName, onBoardEvent)
          controller.close()
        })
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('SSE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
