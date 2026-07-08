export interface ProviderAdapter {
  id: string
  name: string
  baseUrl: string
  models: string[]
  buildBody: (model: string, messages: any[], temp: number, maxTokens: number) => any
  parseChunk: (json: any) => { content: string; reasoning: string }
}

const PROVIDERS: ProviderAdapter[] = [
  {
    id:'deepseek', name:'DeepSeek', baseUrl:'https://api.deepseek.com/v1',
    models:['deepseek-chat','deepseek-reasoner'],
    buildBody: (m, msgs, t, mt) => ({ model:m, messages:msgs, stream:true, temperature:t, max_tokens:mt }),
    parseChunk: (j) => ({ content: j.choices?.[0]?.delta?.content || '', reasoning: j.choices?.[0]?.delta?.reasoning_content || '' }),
  },
  {
    id:'openai', name:'OpenAI', baseUrl:'https://api.openai.com/v1',
    models:['gpt-4o','gpt-4o-mini','o3-mini'],
    buildBody: (m, msgs, t, mt) => ({ model:m, messages:msgs, stream:true, temperature:t, max_tokens:mt }),
    parseChunk: (j) => ({ content: j.choices?.[0]?.delta?.content || '', reasoning: '' }),
  },
  {
    id:'gemini', name:'Google Gemini', baseUrl:'https://generativelanguage.googleapis.com/v1beta',
    models:['gemini-2.0-flash','gemini-2.5-pro'],
    buildBody: (m, msgs, t, mt) => {
      const contents = msgs.filter((x:any) => x.role !== 'system').map((x:any) => ({
        role: x.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: x.content }],
      }))
      const sys = msgs.find((x:any) => x.role === 'system')
      return {
        model: m === 'gemini-2.5-pro' ? 'gemini-2.5-pro-exp-03-25' : 'gemini-2.0-flash',
        contents, systemInstruction: sys ? { parts: [{ text: sys.content }] } : undefined,
        generationConfig: { temperature: t, maxOutputTokens: mt },
      }
    },
    parseChunk: (j) => ({ content: j.candidates?.[0]?.content?.parts?.[0]?.text || '', reasoning: '' }),
  },
  {
    id:'groq', name:'Groq', baseUrl:'https://api.groq.com/openai/v1',
    models:['llama-3.3-70b-versatile','mixtral-8x7b-32768','deepseek-r1-distill-llama-70b'],
    buildBody: (m, msgs, t, mt) => ({ model:m, messages:msgs, stream:true, temperature:t, max_tokens:mt }),
    parseChunk: (j) => ({ content: j.choices?.[0]?.delta?.content || '', reasoning: '' }),
  },
]

export function getProviders() { return PROVIDERS }
export function getProvider(id: string) { return PROVIDERS.find(p => p.id === id) }

export function resolveApiCall(model: string): { provider: ProviderAdapter; apiKey: string; baseUrl: string } | null {
  const match = PROVIDERS.find(p => p.models.includes(model))
  if (!match) {
    const fallback = PROVIDERS[0]
    const key = localStorage.getItem('nh_api_key') || ''
    const base = localStorage.getItem('nh_api_base') || 'https://api.deepseek.com/v1'
    return { provider: fallback, apiKey: key, baseUrl: base }
  }
  const key = localStorage.getItem(`nh_key_${match.id}`) || localStorage.getItem('nh_api_key') || ''
  const base = localStorage.getItem(`nh_base_${match.id}`) || match.baseUrl
  if (!key) return null
  return { provider: match, apiKey: key, baseUrl: base }
}

export async function streamChat(
  provider: ProviderAdapter,
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: any[],
  temp: number,
  maxTokens: number,
  onChunk: (content: string, reasoning: string) => void,
  signal?: AbortSignal,
): Promise<{ content: string; reasoning: string }> {
  const body = provider.buildBody(model, messages, temp, maxTokens)
  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  })
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`API ${resp.status}: ${errText.slice(0, 200)}`)
  }
  const reader = resp.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let fullContent = ''
  let fullReasoning = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const { content, reasoning } = provider.parseChunk(json)
        fullContent += content
        fullReasoning += reasoning
        onChunk(fullContent, fullReasoning)
      } catch {}
    }
  }
  return { content: fullContent, reasoning: fullReasoning }
}
