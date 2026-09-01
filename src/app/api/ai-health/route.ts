// AI provider health check — pings the configured provider with a tiny prompt.
// Returns provider host + model + latency; never exposes the API key.
export const maxDuration = 60

export async function GET() {
  const aiUrl = process.env.AI_PROVIDER_URL || 'http://localhost:11434/api/generate'
  const aiModel = process.env.AI_MODEL || 'qwen3.5:cloud'
  const aiKey = process.env.AI_API_KEY
  const started = Date.now()

  let host = aiUrl
  try { host = new URL(aiUrl).host } catch { /* keep raw */ }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (aiKey) {
      headers['Authorization'] = `Bearer ${aiKey}`
      headers['X-API-Key'] = aiKey
    }
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiModel,
        prompt: 'Reply with exactly: OK',
        stream: false,
        think: false,
        options: { num_predict: 5 },
      }),
    })
    const latencyMs = Date.now() - started
    if (!res.ok) {
      const text = await res.text()
      return Response.json({
        ok: false,
        provider: host,
        model: aiModel,
        status: res.status,
        error: text.slice(0, 300),
        latencyMs,
      }, { status: 200 })
    }
    const data = await res.json()
    return Response.json({
      ok: true,
      provider: host,
      model: aiModel,
      latencyMs,
      sample: (data.response || data.output || '').trim().slice(0, 50),
    })
  } catch (err: any) {
    return Response.json({
      ok: false,
      provider: host,
      model: aiModel,
      error: err.message,
    }, { status: 200 })
  }
}