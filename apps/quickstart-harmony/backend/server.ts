import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY')
}

const DEBUG_QUICKSTART = process.env.DEBUG_QUICKSTART === '1'

type StreamRequest = {
  prompt: string
  model?: string
  system?: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function reqId(): string {
  return `gms_${Date.now()}_${Math.floor(Math.random() * 10000)}`
}

function info(message: string): void {
  console.info(message)
}

function debug(message: string): void {
  if (!DEBUG_QUICKSTART) {
    return
  }
  console.info(message)
}

function warn(message: string): void {
  console.warn(message)
}

function errorLog(message: string): void {
  console.error(message)
}

app.post('/api/gemini/stream', async (req, res) => {
  const id = reqId()
  const body = req.body as StreamRequest
  const model = body.model || 'gemini-2.5-flash'
  const prompt = body.prompt || ''
  const system = body.system

  info(`[${nowIso()}][${id}] incoming request: model=${model}, promptLen=${prompt.length}, hasSystem=${Boolean(system && system.trim())}`)

  if (!prompt.trim()) {
    warn(`[${nowIso()}][${id}] reject: empty prompt`)
    res.status(400).json({ error: 'prompt is required' })
    return
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`

  const payload: {
    contents: Array<{ parts: Array<{ text: string }> }>
    systemInstruction?: { parts: Array<{ text: string }> }
  } = {
    contents: [{ parts: [{ text: prompt }] }],
  }

  if (system && system.trim()) {
    payload.systemInstruction = {
      parts: [{ text: system }],
    }
  }

  debug(`[${nowIso()}][${id}] upstream start`)

  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errorLog(`[${nowIso()}][${id}] upstream fetch error: ${message}`)
    res.status(502).json({ error: `Gemini upstream request failed: ${message}` })
    return
  }

  info(`[${nowIso()}][${id}] upstream status=${upstream.status}`)

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    errorLog(`[${nowIso()}][${id}] upstream failed body=${text.slice(0, 500)}`)
    res.status(502).json({ error: `Gemini upstream failed: ${upstream.status} ${text}` })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()

  let chunkCount = 0
  let bytes = 0

  req.on('close', () => {
    debug(`[${nowIso()}][${id}] client connection closed`)
  })

  try {
    while (true) {
      const next = await reader.read()
      const done = next.done
      const value = next.value

      if (done) {
        info(`[${nowIso()}][${id}] upstream stream done; chunks=${chunkCount}, bytes=${bytes}`)
        break
      }

      if (!value) {
        continue
      }

      chunkCount += 1
      bytes += value.byteLength

      const chunk = decoder.decode(value, { stream: true })
      if (DEBUG_QUICKSTART && chunkCount <= 3) {
        const preview = chunk.replace(/\s+/g, ' ').slice(0, 180)
        debug(`[${nowIso()}][${id}] chunk#${chunkCount} len=${chunk.length} preview="${preview}"`)
      }
      res.write(chunk)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errorLog(`[${nowIso()}][${id}] stream relay error: ${message}`)
    res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`)
  } finally {
    res.end()
    info(`[${nowIso()}][${id}] response ended`)
  }
})

app.listen(3000, () => {
  info(`[${nowIso()}] Gemini SSE relay listening on http://127.0.0.1:3000 (DEBUG_QUICKSTART=${DEBUG_QUICKSTART ? '1' : '0'})`)
})
