export interface MemoryEntry {
  id: string
  c: string
  g: string[]
  src: 'chat' | 'user' | 'kb' | 'reflection'
  imp: number
  ts: number
  ac: number
  vec: number[]
}

interface MemoryState {
  entries: MemoryEntry[]
  lastConsolidation: number
  totalRecalled: number
  totalStored: number
}

const STORAGE_KEY = 'nh_memory'
const MAX_ENTRIES = 500
const CONSOLIDATION_INTERVAL = 1000 * 60 * 30
const VEC_DIM = 128

function hashWord(w: string): number {
  let h = 0
  for (let i = 0; i < w.length; i++) h = ((h << 5) - h + w.charCodeAt(i)) | 0
  return Math.abs(h)
}

function textToVec(text: string): number[] {
  const vec = new Array(VEC_DIM).fill(0)
  const words = text.toLowerCase().split(/\s+/)
  for (const w of words) {
    if (w.length < 2) continue
    const idx = hashWord(w) % VEC_DIM
    vec[idx] += 1
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  for (let i = 0; i < VEC_DIM; i++) vec[i] /= norm
  return vec
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < VEC_DIM; i++) dot += a[i] * b[i]
  return dot
}

function extractTags(text: string): string[] {
  const tags: string[] = []
  const patterns = [
    /AI|Agent|RAG|LLM|Transformer|神经网络|深度学习|机器学习/g,
    /数据结构|算法|排序|递归|动态规划|二叉树|图论|哈希/g,
    /操作系统|进程|线程|死锁|内存|文件系统/g,
    /网络|TCP|HTTP|DNS|路由|协议/g,
    /数据库|SQL|Redis|MongoDB|MySQL|PostgreSQL/g,
    /React|Vue|TypeScript|JavaScript|Python|Rust|Go/g,
    /编译|JIT|LLVM|语法分析/g,
    /安全|加密|JWT|OAuth|XSS|CSRF/g,
    /分布式|K8s|Docker|微服务|消息队列/g,
    /前端|后端|CSS|HTML|API/g,
    /时间膨胀|进化|结晶|知识/g,
    /设计模式|重构|测试|TDD|敏捷/g,
    /离散数学|线性代数|概率/g,
  ]
  for (const p of patterns) {
    const matches = text.match(p)
    if (matches) tags.push(...matches.map(m => m.toLowerCase()))
  }
  return [...new Set(tags)].slice(0, 8)
}

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

let state: MemoryState = { entries: [], lastConsolidation: 0, totalRecalled: 0, totalStored: 0 }
let listeners: (() => void)[] = []

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) state = JSON.parse(raw)
  } catch { /* use default */ }
}
function save() {
  if (state.entries.length > MAX_ENTRIES) {
    state.entries.sort((a, b) => (b.imp * b.ac) - (a.imp * a.ac))
    state.entries = state.entries.slice(0, MAX_ENTRIES)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
function emit() { listeners.forEach(f => f()) }

load()

export function useMemoryEngine() {
  function store(content: string, source: MemoryEntry['src'] = 'chat', importance = 0.5): MemoryEntry {
    const tags = extractTags(content)
    const entry: MemoryEntry = {
      id: uid(), c: content.slice(0, 500), g: tags, src: source, imp: importance, ts: Date.now(), ac: 1, vec: textToVec(content)
    }
    state.entries.push(entry)
    state.totalStored++
    save()
    return entry
  }

  function recall(query: string, k = 8): MemoryEntry[] {
    if (!query.trim()) return []
    const qVec = textToVec(query)
    const qTags = extractTags(query)
    const scored: { entry: MemoryEntry; score: number }[] = []

    for (const e of state.entries) {
      let score = cosineSimilarity(qVec, e.vec)
      const tagOverlap = qTags.filter(t => e.g.includes(t)).length
      score += tagOverlap * 0.15
      const hoursAgo = (Date.now() - e.ts) / (1000 * 60 * 60)
      score += Math.max(0, 1 - hoursAgo / 168) * 0.1
      score *= (0.5 + e.imp * 0.5)
      score *= Math.log(e.ac + 2)
      scored.push({ entry: e, score })
    }

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, k).filter(s => s.score > 0.05)
    for (const s of top) { s.entry.ac++; state.totalRecalled++ }
    save()
    return top.map(s => s.entry)
  }

  function recallContext(query: string, maxTokens = 800): string {
    const memories = recall(query, 6)
    if (!memories.length) return ''
    return memories.map((m, i) => `${i + 1}. [${m.src}] ${m.c.slice(0, 200)}`).join('\n')
  }

  function boost(id: string, delta: number) {
    const e = state.entries.find(e => e.id === id)
    if (e) { e.imp = Math.min(1, Math.max(0.1, e.imp + delta)); save() }
  }

  function forget(id: string) {
    state.entries = state.entries.filter(e => e.id !== id)
    save(); emit()
  }

  function consolidate() {
    if (Date.now() - state.lastConsolidation < CONSOLIDATION_INTERVAL) return 0
    state.lastConsolidation = Date.now()

    const clusters: Map<string, MemoryEntry[]> = new Map()
    for (const e of state.entries) {
      for (const t of e.g) {
        if (!clusters.has(t)) clusters.set(t, [])
        clusters.get(t)!.push(e)
      }
    }

    let merged = 0
    for (const [, group] of clusters) {
      if (group.length < 3) continue
      const oldest = group.reduce((a, b) => a.ts < b.ts ? a : b)
      if (Date.now() - oldest.ts < 1000 * 60 * 60) continue
      const content = group.map(e => e.c.slice(0, 100)).join(' | ')
      const maxImp = Math.max(...group.map(e => e.imp))
      const ids = new Set(group.map(e => e.id))

      state.entries = state.entries.filter(e => !ids.has(e.id))
      const mergedEntry: MemoryEntry = {
        id: uid(), c: `[合并记忆] ${content.slice(0, 450)}`, g: [...new Set(group.flatMap(e => e.g))].slice(0, 8),
        src: 'reflection', imp: Math.min(1, maxImp + 0.1), ts: Date.now(), ac: group.reduce((s, e) => s + e.ac, 0),
        vec: textToVec(content)
      }
      state.entries.push(mergedEntry)
      merged++
    }
    if (merged > 0) { save(); emit() }
    return merged
  }

  function search(query: string): MemoryEntry[] {
    const q = query.toLowerCase()
    return state.entries
      .filter(e => e.c.toLowerCase().includes(q) || e.g.some(g => g.includes(q)))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 20)
  }

  function getStats() {
    return {
      total: state.entries.length,
      recalled: state.totalRecalled,
      stored: state.totalStored,
      byType: {
        chat: state.entries.filter(e => e.src === 'chat').length,
        user: state.entries.filter(e => e.src === 'user').length,
        kb: state.entries.filter(e => e.src === 'kb').length,
        reflection: state.entries.filter(e => e.src === 'reflection').length,
      }
    }
  }

  function subscribe(fn: () => void) { listeners.push(fn) }
  function reset() { state = { entries: [], lastConsolidation: 0, totalRecalled: 0, totalStored: 0 }; save(); emit() }
  function getState() { return state }

  return { store, recall, recallContext, boost, forget, consolidate, search, getStats, subscribe, reset, getState }
}
