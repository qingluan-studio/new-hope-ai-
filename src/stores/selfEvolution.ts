export interface EvolutionSnapshot {
  id: string
  timestamp: number
  version: number
  description: string
  dataSnapshot: Record<string, any>
  checksum: string
}

export interface WebLearnEntry {
  url: string
  title: string
  keyInsight: string
  applied: boolean
  tags: string[]
}

interface EvolutionState {
  snapshots: EvolutionSnapshot[]
  stabilityScore: number
  totalEvolutions: number
  regressions: number
  webLearns: WebLearnEntry[]
  safeMode: boolean
}

const STORAGE_KEY = 'nh_evolution'
const MAX_SNAPSHOTS = 15

function load(): EvolutionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { snapshots: [], stabilityScore: 100, totalEvolutions: 0, regressions: 0, webLearns: [], safeMode: false }
  } catch { return { snapshots: [], stabilityScore: 100, totalEvolutions: 0, regressions: 0, webLearns: [], safeMode: false } }
}

function save(s: EvolutionState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }
function chk(data: any): string { return Math.abs(JSON.stringify(data).split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)).toString(36) }

let state = load()
let listeners: (() => void)[] = []

export function useSelfEvolution() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function createSnapshot(description: string, data: Record<string, any>) {
    const snap: EvolutionSnapshot = {
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      version: state.snapshots.length + 1,
      description,
      dataSnapshot: JSON.parse(JSON.stringify(data)),
      checksum: chk(data),
    }
    state.snapshots.push(snap)
    if (state.snapshots.length > MAX_SNAPSHOTS) state.snapshots.splice(0, state.snapshots.length - MAX_SNAPSHOTS)
    state.totalEvolutions++
    save(state)
    listeners.forEach(f => f())
    return snap
  }

  function rollback(snapId: string): Record<string, any> | null {
    const snap = state.snapshots.find(s => s.id === snapId)
    if (!snap) return null
    state.regressions++
    state.stabilityScore = Math.max(0, state.stabilityScore - 10)
    state.safeMode = state.stabilityScore < 70
    save(state)
    listeners.forEach(f => f())
    return snap.dataSnapshot
  }

  function reportSuccess() {
    state.stabilityScore = Math.min(100, state.stabilityScore + 2)
    state.safeMode = state.stabilityScore < 70
    save(state)
    listeners.forEach(f => f())
  }

  function reportFailure(description: string) {
    state.stabilityScore = Math.max(0, state.stabilityScore - 15)
    state.regressions++
    state.safeMode = state.stabilityScore < 70
    save(state)
    listeners.forEach(f => f())
  }

  function learnFromWeb(url: string, title: string, insight: string, tags: string[] = []) {
    state.webLearns.push({ url, title, keyInsight: insight, applied: false, tags })
    if (state.webLearns.length > 50) state.webLearns = state.webLearns.slice(-50)
    save(state)
    listeners.forEach(f => f())
  }

  function applyLearning(index: number) {
    if (index >= 0 && index < state.webLearns.length) {
      state.webLearns[index].applied = true
      save(state)
      listeners.forEach(f => f())
    }
  }

  function getSnapshots() { return [...state.snapshots].reverse() }
  function getWebLearns() { return [...state.webLearns].reverse() }
  function getReport() {
    return {
      stability: state.stabilityScore,
      safeMode: state.safeMode,
      evolutions: state.totalEvolutions,
      regressions: state.regressions,
      snapshots: state.snapshots.length,
      webLearns: state.webLearns.length,
      webApplied: state.webLearns.filter(w => w.applied).length,
    }
  }

  function reset() {
    state = { snapshots: [], stabilityScore: 100, totalEvolutions: 0, regressions: 0, webLearns: [], safeMode: false }
    save(state)
    listeners.forEach(f => f())
  }

  return { state, createSnapshot, rollback, reportSuccess, reportFailure, learnFromWeb, applyLearning, getSnapshots, getWebLearns, getReport, reset, subscribe }
}
