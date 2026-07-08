export interface AgentGene {
  id: string
  name: string
  traitVector: number[]
  category: string
  fitness: number
  generation: number
  parentIds: string[]
  createdAt: number
  usageCount: number
}

export interface GeneTrait {
  key: string
  label: string
  min: number
  max: number
}

const STORAGE_KEY = 'nh_genelab'

const TRAITS: GeneTrait[] = [
  { key: 'creativity',  label: '创造力', min: 0, max: 10 },
  { key: 'logic',       label: '逻辑力', min: 0, max: 10 },
  { key: 'empathy',     label: '共情力', min: 0, max: 10 },
  { key: 'precision',   label: '精确度', min: 0, max: 10 },
  { key: 'speed',       label: '响应速度', min: 0, max: 10 },
  { key: 'depth',       label: '深度思考', min: 0, max: 10 },
  { key: 'humor',       label: '幽默感', min: 0, max: 10 },
  { key: 'brevity',     label: '简洁度', min: 0, max: 10 },
]

function seed(): AgentGene[] {
  const templates: Omit<AgentGene, 'traitVector' | 'fitness' | 'generation' | 'parentIds' | 'createdAt' | 'usageCount'>[] = [
    { id:'code-master',  name:'代码工匠', category:'dev' },
    { id:'poet',         name:'诗人',     category:'art' },
    { id:'teacher',      name:'导师',     category:'edu' },
    { id:'detective',    name:'侦探',     category:'logic' },
    { id:'chef',         name:'创意厨神', category:'life' },
    { id:'coach',        name:'人生教练', category:'coach' },
    { id:'analyst',      name:'数据分析师', category:'analytics' },
    { id:'designer',     name:'设计师',   category:'art' },
    { id:'debugger',     name:'调试专家', category:'dev' },
    { id:'storyteller',  name:'故事大王', category:'art' },
    { id:'researcher',   name:'研究员',   category:'edu' },
    { id:'joker',        name:'段子手',   category:'fun' },
  ]
  return templates.map((t, i) => ({
    ...t,
    traitVector: TRAITS.map(() => Math.round(2 + Math.random() * 7)),
    fitness: 5,
    generation: 1,
    parentIds: [],
    createdAt: Date.now(),
    usageCount: 0,
  }))
}

function load(): AgentGene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { const arr = JSON.parse(raw); if (arr.length) return arr }
  } catch {}
  return seed()
}

function save(genes: AgentGene[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(genes)) }

let pool = load()
let listeners: (() => void)[] = []

export function useAgentGeneLab() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function getAll() { return pool }

  function breed(parentA: AgentGene, parentB: AgentGene): AgentGene {
    const crossed = TRAITS.map((_, i) => {
      const v = Math.random() < 0.5 ? parentA.traitVector[i] : parentB.traitVector[i]
      const mutated = Math.max(0, Math.min(10, v + (Math.random() - 0.5) * 3))
      return Math.round(mutated)
    })
    const hybrid: AgentGene = {
      id: `hybrid-${Date.now()}`,
      name: `${parentA.name}+${parentB.name}`,
      traitVector: crossed,
      category: parentA.category,
      fitness: Math.round((parentA.fitness + parentB.fitness) / 2),
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      parentIds: [parentA.id, parentB.id],
      createdAt: Date.now(),
      usageCount: 0,
    }
    pool.push(hybrid)
    save(pool)
    listeners.forEach(f => f())
    return hybrid
  }

  function rateAgent(id: string, score: number) {
    const a = pool.find(g => g.id === id)
    if (!a) return
    a.fitness = Math.max(0, Math.min(10, Math.round((a.fitness + score) / 2)))
    a.usageCount++
    save(pool)
    listeners.forEach(f => f())
  }

  function naturalSelection() {
    if (pool.length <= 12) return
    pool.sort((a, b) => {
      const scoreA = a.fitness * 0.6 + Math.log(a.usageCount + 1) * 2
      const scoreB = b.fitness * 0.6 + Math.log(b.usageCount + 1) * 2
      return scoreA - scoreB
    })
    const removed = pool.splice(0, Math.floor(pool.length * 0.2))
    for (const r of removed) {
      if (r.id.startsWith('hybrid-')) continue
      pool.unshift(r)
    }
    save(pool)
    listeners.forEach(f => f())
  }

  function getRecommendBreed() {
    const sorted = [...pool].sort((a, b) => b.fitness - a.fitness)
    if (sorted.length < 2) return null
    const a = sorted[0]
    let b = sorted[1]
    for (let i = 2; i < sorted.length && b.category === a.category; i++) b = sorted[i]
    return { parentA: a, parentB: b, reason: `高适配+跨领域交叉: ${a.name}(${a.fitness}) × ${b.name}(${b.fitness})` }
  }

  function reset() { pool = seed(); save(pool); listeners.forEach(f => f()) }

  return { getAll, breed, rateAgent, naturalSelection, getRecommendBreed, reset, subscribe, TRAITS }
}
