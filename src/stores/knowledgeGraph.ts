export interface GraphNode {
  id: string
  label: string
  type: 'kb' | 'memory' | 'agent' | 'tag' | 'concept'
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  refId: string
}

export interface GraphEdge {
  source: string
  target: string
  strength: number
  label: string
}

interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  running: boolean
  iterations: number
  width: number
  height: number
}

const COLORS: Record<string, string> = {
  kb: '#00ff9d',
  memory: '#ff6b6b',
  agent: '#4ecdc4',
  tag: '#ffe66d',
  concept: '#a29bfe',
}

let state: GraphState = { nodes: [], edges: [], running: false, iterations: 0, width: 800, height: 600 }
let listeners: (() => void)[] = []
let animFrame = 0

function emit() { listeners.forEach(f => f()) }

export function useKnowledgeGraph() {
  function buildFromData(kbTitles: string[], memoryTags: string[], agentNames: string[], w: number, h: number) {
    state.width = w; state.height = h
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const tagSet = new Set<string>()

    const centerX = w / 2; const centerY = h / 2

    kbTitles.slice(0, 30).forEach((t, i) => {
      const angle = (i / kbTitles.length) * Math.PI * 2
      const r = Math.min(w, h) * 0.3
      nodes.push({ id: `kb-${i}`, label: t.slice(0, 20), type: 'kb', x: centerX + Math.cos(angle) * r + (Math.random() - 0.5) * 60, y: centerY + Math.sin(angle) * r + (Math.random() - 0.5) * 60, vx: 0, vy: 0, size: 6 + Math.random() * 4, color: COLORS.kb, refId: t })
    })

    memoryTags.slice(0, 25).forEach((t, i) => {
      tagSet.add(t)
      const angle = (i / memoryTags.length) * Math.PI * 2
      const r = Math.min(w, h) * 0.15
      nodes.push({ id: `mem-${i}`, label: t.slice(0, 15), type: 'memory', x: centerX + Math.cos(angle + 0.5) * r + (Math.random() - 0.5) * 40, y: centerY + Math.sin(angle + 0.5) * r + (Math.random() - 0.5) * 40, vx: 0, vy: 0, size: 4 + Math.random() * 3, color: COLORS.memory, refId: t })
    })

    agentNames.slice(0, 20).forEach((a, i) => {
      const angle = (i / agentNames.length) * Math.PI * 2
      const r = Math.min(w, h) * 0.2
      nodes.push({ id: `agent-${i}`, label: a.slice(0, 18), type: 'agent', x: centerX + Math.cos(angle + 1.2) * r + (Math.random() - 0.5) * 40, y: centerY + Math.sin(angle + 1.2) * r + (Math.random() - 0.5) * 40, vx: 0, vy: 0, size: 5 + Math.random() * 3, color: COLORS.agent, refId: a })
    })

    const tagNodes: GraphNode[] = []
    Array.from(tagSet).slice(0, 12).forEach((t, i) => {
      const angle = (i / 12) * Math.PI * 2
      tagNodes.push({ id: `tag-${i}`, label: `#${t}`, type: 'tag', x: centerX + Math.cos(angle) * Math.min(w, h) * 0.08, y: centerY + Math.sin(angle) * Math.min(w, h) * 0.08, vx: 0, vy: 0, size: 8, color: COLORS.tag, refId: t })
    })
    nodes.push(...tagNodes)

    const allNodes = [...nodes]
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const a = allNodes[i]; const b = allNodes[j]
        if (a.type === 'tag' && (b.type === 'kb' || b.type === 'memory')) {
          if (Math.random() < 0.3) edges.push({ source: a.id, target: b.id, strength: 0.3, label: '' })
        }
        if ((a.type === 'kb' && b.type === 'memory') || (a.type === 'memory' && b.type === 'kb')) {
          if (Math.random() < 0.15) edges.push({ source: a.id, target: b.id, strength: 0.2, label: '' })
        }
        if (a.type === 'agent' && (b.type === 'kb' || b.type === 'concept')) {
          if (Math.random() < 0.2) edges.push({ source: a.id, target: b.id, strength: 0.25, label: '' })
        }
      }
    }

    state.nodes = nodes; state.edges = edges; emit()
  }

  function tick() {
    if (!state.running) return
    const nodes = state.nodes
    const edges = state.edges
    const w = state.width; const h = state.height
    const centerX = w / 2; const centerY = h / 2
    const repulsion = 800; const attraction = 0.005; const damping = 0.85; const centerForce = 0.002

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x; const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force; const fy = (dy / dist) * force
        nodes[i].vx += fx; nodes[i].vy += fy
        nodes[j].vx -= fx; nodes[j].vy -= fy
      }
    }

    for (const edge of edges) {
      const s = nodes.find(n => n.id === edge.source); const t = nodes.find(n => n.id === edge.target)
      if (!s || !t) continue
      const dx = t.x - s.x; const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
      const force = (dist - 60) * attraction
      const fx = (dx / dist) * force; const fy = (dy / dist) * force
      s.vx += fx; s.vy += fy; t.vx -= fx; t.vy -= fy
    }

    for (const node of nodes) {
      node.vx += (centerX - node.x) * centerForce
      node.vy += (centerY - node.y) * centerForce
      node.vx *= damping; node.vy *= damping
      node.x += node.vx; node.y += node.vy
      node.x = Math.max(20, Math.min(w - 20, node.x))
      node.y = Math.max(20, Math.min(h - 20, node.y))
    }

    state.iterations++
    if (state.iterations > 300) { stop(); state.iterations = 0 }
    emit()
    if (state.running) animFrame = requestAnimationFrame(tick)
  }

  function start() {
    if (state.running) return
    state.running = true; state.iterations = 0; animFrame = requestAnimationFrame(tick)
  }

  function stop() { state.running = false; cancelAnimationFrame(animFrame); emit() }

  function resize(w: number, h: number) { state.width = w; state.height = h }

  function getState() { return state }
  function subscribe(fn: () => void) { listeners.push(fn) }

  return { buildFromData, start, stop, tick, resize, getState, subscribe }
}
