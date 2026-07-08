export interface KnowledgePlugin {
  id: string
  name: string
  desc: string
  category: string
  enabled: boolean
  baseUrl: string
  queryParam: string
  priority: number
  resultLimit: number
}

export interface PluginResult {
  title: string
  snippet: string
  url: string
  source: string
  relevance: number
}

const STORAGE_KEY = 'nh_kplugins'

const BUILTIN_PLUGINS: KnowledgePlugin[] = [
  { id:'wikipedia',  name:'Wikipedia',   desc:'维基百科百科知识', category:'百科', enabled:true, baseUrl:'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*', queryParam:'srsearch', priority:1, resultLimit:3 },
  { id:'arxiv',      name:'ArXiv',       desc:'学术论文预印本', category:'学术', enabled:true, baseUrl:'https://export.arxiv.org/api/query?search_query=all', queryParam:'search_query', priority:2, resultLimit:3 },
  { id:'github',     name:'GitHub',      desc:'开源代码仓库搜索', category:'代码', enabled:false, baseUrl:'https://api.github.com/search/repositories?q=', queryParam:'q', priority:3, resultLimit:5 },
  { id:'npm',        name:'npm',         desc:'Node.js包注册表', category:'技术', enabled:false, baseUrl:'https://registry.npmjs.org/-/v1/search?text=', queryParam:'text', priority:4, resultLimit:5 },
  { id:'stackoverflow', name:'Stack Overflow', desc:'编程问答社区', category:'技术', enabled:true, baseUrl:'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&site=stackoverflow', queryParam:'q', priority:3, resultLimit:3 },
  { id:'mdn',        name:'MDN Web Docs', desc:'Web开发文档', category:'技术', enabled:false, baseUrl:'https://developer.mozilla.org/api/v1/search?locale=zh-CN', queryParam:'q', priority:4, resultLimit:3 },
]

const cacheTtl = 30 * 60 * 1000
const cacheMap = new Map<string, { results: PluginResult[]; expires: number }>()
let plugins = [...BUILTIN_PLUGINS]
let listeners: (() => void)[] = []

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as KnowledgePlugin[]
      for (const builtin of BUILTIN_PLUGINS) {
        const match = saved.find(s => s.id === builtin.id)
        if (match) Object.assign(builtin, { enabled: match.enabled, priority: match.priority })
      }
    }
  } catch {}
}
load()

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins.map(p => ({ id: p.id, enabled: p.enabled, priority: p.priority }))))
}

export function useKnowledgePlugins() {
  function subscribe(fn: () => void) { listeners.push(fn) }
  function getPlugins() { return plugins }
  function getEnabled() { return plugins.filter(p => p.enabled) }

  function togglePlugin(id: string) {
    const p = plugins.find(x => x.id === id)
    if (!p) return
    p.enabled = !p.enabled
    saveState()
    listeners.forEach(f => f())
  }

  function smartSearch(query: string): Promise<PluginResult[]> {
    const trimmed = query.trim()
    if (!trimmed) return Promise.resolve([])
    const cacheKey = `all:${trimmed}`
    const cached = cacheMap.get(cacheKey)
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.results)

    const active = plugins.filter(p => p.enabled).sort((a, b) => a.priority - b.priority).slice(0, 4)
    if (!active.length) return Promise.resolve([])

    const promises = active.map(p => queryPlugin(p, trimmed))
    return Promise.allSettled(promises).then(results => {
      const all: PluginResult[] = []
      for (const r of results) {
        if (r.status === 'fulfilled') all.push(...r.value)
      }
      all.sort((a, b) => b.relevance - a.relevance)
      const sliced = all.slice(0, 12)
      cacheMap.set(cacheKey, { results: sliced, expires: Date.now() + cacheTtl })
      return sliced
    })
  }

  function addCustomPlugin(p: KnowledgePlugin) {
    plugins.push(p)
    saveState()
    listeners.forEach(f => f())
  }

  function clearCache() { cacheMap.clear() }
  function getStats() { return { total: plugins.length, enabled: plugins.filter(p => p.enabled).length, cached: cacheMap.size } }

  return { getPlugins, getEnabled, togglePlugin, smartSearch, addCustomPlugin, clearCache, getStats, subscribe }
}

async function queryPlugin(p: KnowledgePlugin, query: string): Promise<PluginResult[]> {
  const cacheKey = `${p.id}:${query}`
  const cached = cacheMap.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.results

  const url = `${p.baseUrl}&${p.queryParam}=${encodeURIComponent(query)}`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const resp = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!resp.ok) return []
    const data = await resp.json()
    const results = extractResults(p.id, data, query)
    cacheMap.set(cacheKey, { results, expires: Date.now() + cacheTtl })
    return results
  } catch {
    return []
  }
}

function extractResults(sourceId: string, data: any, query: string): PluginResult[] {
  const q = query.toLowerCase()
  try {
    switch (sourceId) {
      case 'wikipedia': return (data.query?.search || []).slice(0, 3).map((r: any) => ({
        title: r.title, snippet: r.snippet?.replace(/<[^>]+>/g, '').slice(0, 200) || '',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`, source: 'Wikipedia',
        relevance: r.title.toLowerCase().includes(q) ? 0.9 : 0.5,
      }))
      case 'arxiv': {
        const entries = data.feed?.entry
        const list = Array.isArray(entries) ? entries : entries ? [entries] : []
        return list.slice(0, 3).map((r: any, i: number) => ({
          title: r.title?.replace(/\n/g, ' ').trim() || '',
          snippet: r.summary?.replace(/\n/g, ' ').slice(0, 200) || '',
          url: r.id || '', source: 'ArXiv',
          relevance: 0.9 - i * 0.1,
        }))
      }
      case 'github': return (data.items || []).slice(0, 5).map((r: any, i: number) => ({
        title: r.full_name, snippet: r.description?.slice(0, 200) || '',
        url: r.html_url, source: 'GitHub',
        relevance: (r.stargazers_count > 100 ? 0.9 : 0.6) - i * 0.05,
      }))
      case 'npm': return (data.objects || []).slice(0, 5).map((r: any, i: number) => ({
        title: r.package?.name || '', snippet: r.package?.description?.slice(0, 200) || '',
        url: `https://www.npmjs.com/package/${r.package?.name}`, source: 'npm',
        relevance: 0.8 - i * 0.1,
      }))
      case 'stackoverflow': return (data.items || []).slice(0, 3).map((r: any, i: number) => ({
        title: r.title, snippet: `Score:${r.score} Answers:${r.answer_count}`, url: r.link, source: 'Stack Overflow',
        relevance: (r.is_answered ? 0.8 : 0.5) - i * 0.1,
      }))
      case 'mdn': return (data.documents || []).slice(0, 3).map((r: any, i: number) => ({
        title: r.title, snippet: r.summary?.slice(0, 200) || '', url: `https://developer.mozilla.org${r.mdn_url}`,
        source: 'MDN', relevance: 0.8 - i * 0.1,
      }))
      default: return []
    }
  } catch { return [] }
}

export function shouldTriggerKnowledge(message: string): boolean {
  const patterns = [
    /什么是/, /怎么/, /如何/, /搜索/, /查找/, /找/, /帮我查/, /查一查/,
    /解释/, /定义/, /哪里/, /谁是/, /什么时候/, /为什么/,
    /npm /, /pip /, /cargo /, /文档/, /api/,
    /论文/, /文献/, /arxiv/, /研究/,
    /wiki/, /百科/, /资料/, /源码/,
  ]
  return patterns.some(p => p.test(message)) && message.length > 5
}
