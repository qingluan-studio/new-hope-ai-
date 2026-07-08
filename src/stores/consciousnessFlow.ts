export interface ConceptNode {
  id: string
  label: string
  weight: number
  category: string
  activated: boolean
  x?: number
  y?: number
}

export interface ConceptEdge {
  from: string
  to: string
  strength: number
  label: string
}

interface FlowSnapshot {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
  timestamp: number
  trigger: string
}

const STORAGE_KEY = 'nh_flow'

function load(): FlowSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(snaps: FlowSnapshot[]) {
  const recent = snaps.slice(-50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
}

let flowHistory = load()
let listeners: (() => void)[] = []

const CATEGORY_COLORS: Record<string, string> = {
  AI: '#f59e0b', code: '#3b82f6', logic: '#8b5cf6',
  design: '#ec4899', data: '#10b981', deploy: '#ef4444',
  science: '#06b6d4', tool: '#f97316', memory: '#6366f1',
}

export function useConsciousnessFlow() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function think(query: string, kbHits: string[]): { nodes: ConceptNode[]; edges: ConceptEdge[]; mermaidCode: string; snap: FlowSnapshot } {
    const nodes: ConceptNode[] = kbHits.map((label, i) => ({
      id: `n${i}`, label, weight: 0.5 + Math.random() * 0.5,
      category: Object.keys(CATEGORY_COLORS)[i % Object.keys(CATEGORY_COLORS).length],
      activated: true,
    }))
    if (nodes.length < 3) {
      nodes.push({ id: `n${nodes.length}`, label: query.slice(0, 15), weight: 0.9, category: 'AI', activated: true })
    }
    const edges: ConceptEdge[] = []
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].id, to: nodes[i + 1].id, strength: 0.7, label: '联想' })
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 2; j < nodes.length; j++) {
        if (Math.random() > 0.55) edges.push({
          from: nodes[i].id, to: nodes[j].id,
          strength: Math.round((0.3 + Math.random() * 0.4) * 10) / 10,
          label: '交叉',
        })
      }
    }
    const mermaidCode = toMermaid(nodes, edges)
    const snap: FlowSnapshot = { nodes, edges, timestamp: Date.now(), trigger: query }
    flowHistory.push(snap)
    if (flowHistory.length > 50) flowHistory = flowHistory.slice(-50)
    save(flowHistory)
    listeners.forEach(f => f())
    return { nodes, edges, mermaidCode, snap }
  }

  function wander(prevNodes: ConceptNode[]): { newNodes: ConceptNode[]; newEdges: ConceptEdge[]; mermaidCode: string } {
    const newNodes: ConceptNode[] = [
      ...prevNodes,
      {
        id: `w${Date.now()}`,
        label: `走神_${['灵感','疑问','关联','发散','回想'][Math.floor(Math.random() * 5)]}`,
        weight: 0.4 + Math.random() * 0.3,
        category: 'memory',
        activated: true,
      },
    ]
    const newEdges: ConceptEdge[] = [
      {
        from: prevNodes[Math.floor(Math.random() * prevNodes.length)]?.id || 'n0',
        to: newNodes[newNodes.length - 1].id,
        strength: 0.5,
        label: '走神跳跃',
      },
    ]
    return { newNodes, newEdges, mermaidCode: toMermaid(newNodes, newEdges) }
  }

  function getHistory(): FlowSnapshot[] { return flowHistory }

  function clear() { flowHistory = []; save([]); listeners.forEach(f => f()) }

  return { think, wander, getHistory, clear, subscribe, CATEGORY_COLORS }
}

function toMermaid(nodes: ConceptNode[], edges: ConceptEdge[]): string {
  const lines = ['graph LR']
  for (const n of nodes) {
    const color = CATEGORY_COLORS[n.category] || '#f59e0b'
    const safeLabel = n.label.replace(/[\[\](){}"<>]/g, '')
    lines.push(`  ${n.id}["${safeLabel}"]`)
    lines.push(`  style ${n.id} fill:${color}22,stroke:${color},color:#e5e7eb`)
  }
  for (const e of edges) {
    const w = Math.round(e.strength * 3)
    const links = ['---', '--->', '==>', '<-->']
    const link = links[Math.min(w, links.length - 1)]
    lines.push(`  ${e.from}${link}${e.to}`)
  }
  return lines.join('\n')
}
