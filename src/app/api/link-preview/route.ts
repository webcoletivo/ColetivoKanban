import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL ausente' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    // Fetch the page with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ColetivoKanbanPreview/1.0)',
        },
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Falha ao acessar a página')
      }

      const html = await response.text()
      
      const metadata = {
        title: extractMeta(html, /<title>(.*?)<\/title>/i) || 
                extractMeta(html, /<meta property="og:title" content="(.*?)"/i) || 
                extractMeta(html, /<meta name="twitter:title" content="(.*?)"/i) ||
                url,
        description: extractMeta(html, /<meta property="og:description" content="(.*?)"/i) || 
                     extractMeta(html, /<meta name="description" content="(.*?)"/i) || 
                     '',
        image: extractMeta(html, /<meta property="og:image" content="(.*?)"/i) || 
               extractMeta(html, /<meta name="twitter:image" content="(.*?)"/i) || 
               '',
        icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
        provider: url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'other',
      }

      // Special handling for YouTube
      if (metadata.provider === 'youtube') {
        try {
          // Fetch oEmbed data for reliable title and author
          const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
          const oEmbedRes = await fetch(oEmbedUrl, { signal: controller.signal })
          
          if (oEmbedRes.ok) {
            const oEmbedData = await oEmbedRes.json()
            metadata.title = oEmbedData.title || metadata.title
            // oEmbed doesn't always provide description, fallback to page meta or empty
          }

          // Extract video ID to build high-res thumbnail URL
          // We can try to extract it from the URL
          let videoId = null
          const urlObj = new URL(url)
          if (urlObj.searchParams.has('v')) {
            videoId = urlObj.searchParams.get('v')
          } else if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1)
          } else if (urlObj.pathname.includes('/embed/')) {
            videoId = urlObj.pathname.split('/embed/')[1]
          }

          if (videoId) {
            // maxresdefault is 1280x720, hqdefault is 480x360. 
            // We return maxresdefault, frontend can fallback if it fails (or we could check here)
            metadata.image = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
          }
        } catch (e) {
          console.error('Error fetching YouTube oEmbed:', e)
        }
      }

      return NextResponse.json(metadata)
    } catch (err: any) {
       // If fetch fails, return a minimal response
       return NextResponse.json({
          title: new URL(url).hostname,
          description: '',
          image: '',
          icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
          provider: 'other'
       })
    }
  } catch (error) {
    console.error('[LINK_PREVIEW_ERROR]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function extractMeta(html: string, regex: RegExp): string {
  const match = html.match(regex)
  if (match && match[1]) {
    // Basic unescape
    return match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }
  return ''
}
