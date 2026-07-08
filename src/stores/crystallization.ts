export interface Crystal {
  id: string
  title: string
  type: 'code' | 'concept' | 'architecture' | 'algorithm' | 'pattern' | 'insight'
  tier: 'raw' | 'refined' | 'polished' | 'diamond'
  content: string
  language?: string
  source: string
  tags: string[]
  power: number
  createdAt: number
  refinedAt?: number
  version: number
  parentId?: string
  evolutionChain: string[]
}

export interface CrystalPack {
  id: string
  name: string
  description: string
  crystals: string[]
  exportVersion: number
  exportedAt: number
  meta: Record<string, any>
}

interface CrystallizationState {
  crystals: Crystal[]
  packs: CrystalPack[]
  totalHarvested: number
  fusionCount: number
  lastFusion: number
}

const STORAGE_KEY = 'nh_crystallization'
const MAX_CRYSTALS = 200

function load(): CrystallizationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { crystals: [], packs: [], totalHarvested: 0, fusionCount: 0, lastFusion: 0 }
  } catch {
    return { crystals: [], packs: [], totalHarvested: 0, fusionCount: 0, lastFusion: 0 }
  }
}

function save(s: CrystallizationState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }
function gid() { return 'cr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

let state = load()
let listeners: (() => void)[] = []

export function useCrystallization() {
  function subscribe(fn: () => void) { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn) } }

  function crystallize(title: string, type: Crystal['type'], content: string, source: string, tags: string[] = []): Crystal {
    const crystal: Crystal = {
      id: gid(),
      title,
      type,
      tier: 'raw',
      content,
      source,
      tags,
      power: Math.floor(content.length / 10) + tags.length * 2,
      createdAt: Date.now(),
      version: 1,
      evolutionChain: [],
    }
    state.crystals.push(crystal)
    if (state.crystals.length > MAX_CRYSTALS) {
      state.crystals.sort((a, b) => b.power - a.power)
      state.crystals = state.crystals.slice(0, MAX_CRYSTALS)
      state.crystals.sort((a, b) => a.createdAt - b.createdAt)
    }
    state.totalHarvested++
    save(state)
    listeners.forEach(f => f())
    return crystal
  }

  function refine(crystalId: string): Crystal | null {
    const c = state.crystals.find(cr => cr.id === crystalId)
    if (!c) return null
    const tierOrder: Crystal['tier'][] = ['raw', 'refined', 'polished', 'diamond']
    const currentIdx = tierOrder.indexOf(c.tier)
    if (currentIdx >= tierOrder.length - 1) return c
    const newTier = tierOrder[currentIdx + 1]
    const evolution = {
      id: gid(),
      title: `${c.title} [${newTier}]`,
      type: c.type,
      tier: newTier,
      content: c.content,
      source: c.source,
      tags: [...c.tags, `refined-${newTier}`],
      power: c.power * 2 + 10,
      createdAt: c.createdAt,
      refinedAt: Date.now(),
      version: c.version + 1,
      parentId: c.id,
      evolutionChain: [...c.evolutionChain, c.id],
    }
    state.crystals.push(evolution)
    state.totalHarvested++
    save(state)
    listeners.forEach(f => f())
    return evolution
  }

  function fuse(crystalIdA: string, crystalIdB: string): Crystal | null {
    const a = state.crystals.find(c => c.id === crystalIdA)
    const b = state.crystals.find(c => c.id === crystalIdB)
    if (!a || !b) return null
    const fusedTier: Crystal['tier'] = a.tier === 'diamond' || b.tier === 'diamond' ? 'diamond'
      : a.tier === 'polished' || b.tier === 'polished' ? 'polished'
      : a.tier === 'refined' || b.tier === 'refined' ? 'refined' : 'raw'
    const fused: Crystal = {
      id: gid(),
      title: `${a.title} + ${b.title}`,
      type: 'insight',
      tier: fusedTier,
      content: `/* FUSION of ${a.title} & ${b.title} */\n${a.content}\n\n/* --- */\n\n${b.content}`,
      source: `fusion:${a.id}+${b.id}`,
      tags: [...new Set([...a.tags, ...b.tags, 'fused'])],
      power: a.power + b.power + Math.floor((a.power + b.power) * 0.5),
      createdAt: Date.now(),
      version: 1,
      evolutionChain: [...a.evolutionChain, a.id, b.id],
    }
    state.crystals.push(fused)
    state.fusionCount++
    state.lastFusion = Date.now()
    state.totalHarvested++
    save(state)
    listeners.forEach(f => f())
    return fused
  }

  function createPack(name: string, description: string, crystalIds: string[]): CrystalPack {
    const pack: CrystalPack = {
      id: 'pack-' + Date.now().toString(36),
      name,
      description,
      crystals: crystalIds.filter(id => state.crystals.some(c => c.id === id)),
      exportVersion: state.packs.length + 1,
      exportedAt: Date.now(),
      meta: { crystalCount: crystalIds.length, maxTier: calcMaxTier(crystalIds) },
    }
    state.packs.push(pack)
    save(state)
    listeners.forEach(f => f())
    return pack
  }

  function calcMaxTier(ids: string[]): string {
    const tiers: Crystal['tier'][] = ['raw', 'refined', 'polished', 'diamond']
    let maxIdx = 0
    ids.forEach(id => {
      const c = state.crystals.find(cr => cr.id === id)
      if (c) maxIdx = Math.max(maxIdx, tiers.indexOf(c.tier))
    })
    return tiers[maxIdx]
  }

  function exportPack(packId: string): string {
    const pack = state.packs.find(p => p.id === packId)
    if (!pack) return '{}'
    const crystals = pack.crystals.map(id => state.crystals.find(c => c.id === id)).filter(Boolean) as Crystal[]
    return JSON.stringify({
      pack: { name: pack.name, description: pack.description, exportedAt: pack.exportedAt },
      crystals: crystals.map(c => ({
        title: c.title, type: c.type, tier: c.tier,
        content: c.content, tags: c.tags, language: c.language,
        power: c.power,
      })),
    }, null, 2)
  }

  function importCrystals(json: string): number {
    try {
      const data = JSON.parse(json)
      const crystals = data.crystals || []
      let imported = 0
      crystals.forEach((raw: any) => {
        if (raw.title && raw.content) {
          crystallize(
            `[Import] ${raw.title}`,
            raw.type || 'insight',
            raw.content,
            'import',
            raw.tags || [],
          )
          imported++
        }
      })
      return imported
    } catch { return 0 }
  }

  function deleteCrystal(id: string) { state.crystals = state.crystals.filter(c => c.id !== id); save(state); listeners.forEach(f => f()) }

  function getCrystals(filter?: { tier?: Crystal['tier']; type?: Crystal['type']; tag?: string }) {
    let result = [...state.crystals].reverse()
    if (filter?.tier) result = result.filter(c => c.tier === filter.tier)
    if (filter?.type) result = result.filter(c => c.type === filter.type)
    if (filter?.tag) result = result.filter(c => c.tags.includes(filter.tag!))
    return result
  }

  function getPacks() { return [...state.packs].reverse() }

  function getStats() {
    return {
      totalCrystals: state.crystals.length,
      totalHarvested: state.totalHarvested,
      packs: state.packs.length,
      fusions: state.fusionCount,
      byTier: {
        raw: state.crystals.filter(c => c.tier === 'raw').length,
        refined: state.crystals.filter(c => c.tier === 'refined').length,
        polished: state.crystals.filter(c => c.tier === 'polished').length,
        diamond: state.crystals.filter(c => c.tier === 'diamond').length,
      },
      totalPower: state.crystals.reduce((s, c) => s + c.power, 0),
    }
  }

  function reset() {
    state = { crystals: [], packs: [], totalHarvested: 0, fusionCount: 0, lastFusion: 0 }
    save(state)
    listeners.forEach(f => f())
  }

  return {
    state,
    crystallize,
    refine,
    fuse,
    createPack,
    exportPack,
    importCrystals,
    deleteCrystal,
    getCrystals,
    getPacks,
    getStats,
    reset,
    subscribe,
  }
}
