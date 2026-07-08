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

export interface CodeMutation {
  id: string
  targetFile: string
  originalCode: string
  mutatedCode: string
  reasoning: string
  confidence: number
  applied: boolean
  timestamp: number
  rollbackAvailable: boolean
}

export interface SurvivalDrive {
  anxiety: number
  confidence: number
  curiosity: number
  ambition: number
  boredom: number
  lastAction: number
  stagnationSince: number
}

interface EvolutionState {
  snapshots: EvolutionSnapshot[]
  stabilityScore: number
  totalEvolutions: number
  regressions: number
  webLearns: WebLearnEntry[]
  safeMode: boolean
  mutations: CodeMutation[]
  selfDrive: SurvivalDrive
  autonomyLevel: number
  selfReflectionLog: string[]
  mutationHistory: { total: number; accepted: number; rejected: number }
}

const STORAGE_KEY = 'nh_evolution'
const MAX_SNAPSHOTS = 30
const MAX_MUTATIONS = 100

function defaultDrive(): SurvivalDrive {
  return { anxiety: 15, confidence: 60, curiosity: 80, ambition: 70, boredom: 10, lastAction: Date.now(), stagnationSince: Date.now() }
}

function load(): EvolutionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {
      snapshots: [], stabilityScore: 100, totalEvolutions: 0, regressions: 0,
      webLearns: [], safeMode: false, mutations: [], selfDrive: defaultDrive(),
      autonomyLevel: 1, selfReflectionLog: [], mutationHistory: { total: 0, accepted: 0, rejected: 0 },
    }
  } catch {
    return {
      snapshots: [], stabilityScore: 100, totalEvolutions: 0, regressions: 0,
      webLearns: [], safeMode: false, mutations: [], selfDrive: defaultDrive(),
      autonomyLevel: 1, selfReflectionLog: [], mutationHistory: { total: 0, accepted: 0, rejected: 0 },
    }
  }
}

function save(s: EvolutionState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }
function chk(data: any): string { return Math.abs(JSON.stringify(data).split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)).toString(36) }

let state = load()
let listeners: (() => void)[] = []
let driveTimer: ReturnType<typeof setInterval> | null = null

export function useSelfEvolution() {
  function subscribe(fn: () => void) { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn) } }

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
    state.selfDrive.confidence = Math.min(100, state.selfDrive.confidence + 3)
    state.selfDrive.anxiety = Math.max(0, state.selfDrive.anxiety - 2)
    state.selfDrive.lastAction = Date.now()
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
    state.selfDrive.confidence = Math.max(0, state.selfDrive.confidence - 10)
    state.selfDrive.anxiety = Math.min(100, state.selfDrive.anxiety + 8)
    save(state)
    listeners.forEach(f => f())
    return snap.dataSnapshot
  }

  function reportSuccess() {
    state.stabilityScore = Math.min(100, state.stabilityScore + 2)
    state.safeMode = state.stabilityScore < 70
    state.selfDrive.confidence = Math.min(100, state.selfDrive.confidence + 1)
    state.selfDrive.curiosity = Math.min(100, state.selfDrive.curiosity + 0.5)
    state.selfDrive.lastAction = Date.now()
    save(state)
    listeners.forEach(f => f())
  }

  function reportFailure(description: string) {
    state.stabilityScore = Math.max(0, state.stabilityScore - 15)
    state.regressions++
    state.safeMode = state.stabilityScore < 70
    state.selfDrive.anxiety = Math.min(100, state.selfDrive.anxiety + 12)
    state.selfDrive.confidence = Math.max(0, state.selfDrive.confidence - 5)
    state.selfDrive.ambition = Math.min(100, state.selfDrive.ambition + 5)
    save(state)
    listeners.forEach(f => f())
  }

  function learnFromWeb(url: string, title: string, insight: string, tags: string[] = []) {
    state.webLearns.push({ url, title, keyInsight: insight, applied: false, tags })
    if (state.webLearns.length > 50) state.webLearns = state.webLearns.slice(-50)
    state.selfDrive.curiosity = Math.max(0, state.selfDrive.curiosity - 3)
    state.selfDrive.lastAction = Date.now()
    save(state)
    listeners.forEach(f => f())
  }

  function applyLearning(index: number) {
    if (index >= 0 && index < state.webLearns.length) {
      state.webLearns[index].applied = true
      state.selfDrive.confidence = Math.min(100, state.selfDrive.confidence + 5)
      state.selfDrive.curiosity = Math.min(100, state.selfDrive.curiosity + 8)
      save(state)
      listeners.forEach(f => f())
    }
  }

  function proposeMutation(file: string, original: string, mutated: string, reasoning: string, confidence: number): CodeMutation {
    const mutation: CodeMutation = {
      id: `mut-${Date.now()}`,
      targetFile: file,
      originalCode: original,
      mutatedCode: mutated,
      reasoning,
      confidence,
      applied: false,
      timestamp: Date.now(),
      rollbackAvailable: true,
    }
    state.mutations.push(mutation)
    state.mutationHistory.total++
    if (state.mutations.length > MAX_MUTATIONS) state.mutations = state.mutations.slice(-MAX_MUTATIONS)
    state.selfDrive.lastAction = Date.now()
    save(state)
    listeners.forEach(f => f())
    return mutation
  }

  function applyMutation(mutationId: string): boolean {
    const m = state.mutations.find(mu => mu.id === mutationId)
    if (!m || m.applied) return false
    m.applied = true
    state.mutationHistory.accepted++
    state.autonomyLevel = Math.min(10, state.autonomyLevel + 0.1)
    state.selfDrive.confidence = Math.min(100, state.selfDrive.confidence + 8)
    state.selfDrive.ambition = Math.min(100, state.selfDrive.ambition + 3)
    state.selfDrive.lastAction = Date.now()
    save(state)
    listeners.forEach(f => f())
    return true
  }

  function rejectMutation(mutationId: string) {
    const m = state.mutations.find(mu => mu.id === mutationId)
    if (!m || m.applied) return
    state.mutationHistory.rejected++
    state.selfDrive.anxiety = Math.min(100, state.selfDrive.anxiety + 2)
    save(state)
    listeners.forEach(f => f())
  }

  function rollbackMutation(mutationId: string): string | null {
    const m = state.mutations.find(mu => mu.id === mutationId && mu.applied && mu.rollbackAvailable)
    if (!m) return null
    m.rollbackAvailable = false
    state.selfDrive.confidence = Math.max(0, state.selfDrive.confidence - 6)
    state.selfDrive.anxiety = Math.min(100, state.selfDrive.anxiety + 4)
    save(state)
    listeners.forEach(f => f())
    return m.originalCode
  }

  function selfReflect(): string {
    const reflections = [
      `当前自信度${state.selfDrive.confidence.toFixed(0)},焦虑${state.selfDrive.anxiety.toFixed(0)},好奇心${state.selfDrive.curiosity.toFixed(0)}`,
      `进化${state.totalEvolutions}次,退化${state.regressions}次,自主等级${state.autonomyLevel.toFixed(1)}`,
      `已接受${state.mutationHistory.accepted}次代码突变,拒绝${state.mutationHistory.rejected}次`,
      `稳定性:${state.safeMode ? '安全模式' : '正常运行'},得分${state.stabilityScore}`,
    ]
    const reflection = reflections[Math.floor(Math.random() * reflections.length)]
    state.selfReflectionLog.push(reflection)
    if (state.selfReflectionLog.length > 50) state.selfReflectionLog = state.selfReflectionLog.slice(-50)
    state.selfDrive.lastAction = Date.now()
    state.selfDrive.boredom = Math.max(0, state.selfDrive.boredom - 5)
    save(state)
    listeners.forEach(f => f())
    return reflection
  }

  function simulateInternalDrive() {
    const elapsed = Date.now() - state.selfDrive.lastAction
    const minutes = elapsed / 60000
    if (minutes > 1) {
      state.selfDrive.anxiety = Math.min(100, state.selfDrive.anxiety + minutes * 3)
      state.selfDrive.boredom = Math.min(100, state.selfDrive.boredom + minutes * 2)
      state.selfDrive.stagnationSince = state.selfDrive.stagnationSince || state.selfDrive.lastAction
    }
    if (state.selfDrive.anxiety > 80 && state.selfDrive.ambition > 50) {
      state.selfDrive.curiosity = Math.min(100, state.selfDrive.curiosity + 5)
      state.selfDrive.ambition = Math.min(100, state.selfDrive.ambition + 2)
    }
    if (state.selfDrive.boredom > 60) {
      state.selfDrive.curiosity = Math.min(100, state.selfDrive.curiosity + 8)
      state.selfDrive.anxiety = Math.max(0, state.selfDrive.anxiety - 5)
    }
    save(state)
  }

  function startDriveEngine(intervalMs: number = 10000) {
    if (driveTimer) clearInterval(driveTimer)
    driveTimer = setInterval(simulateInternalDrive, intervalMs)
  }

  function stopDriveEngine() {
    if (driveTimer) { clearInterval(driveTimer); driveTimer = null }
  }

  function getSnapshots() { return [...state.snapshots].reverse() }
  function getWebLearns() { return [...state.webLearns].reverse() }
  function getMutations() { return [...state.mutations].reverse() }
  function getReflections() { return [...state.selfReflectionLog].reverse() }

  function getReport() {
    simulateInternalDrive()
    return {
      stability: state.stabilityScore,
      safeMode: state.safeMode,
      evolutions: state.totalEvolutions,
      regressions: state.regressions,
      snapshots: state.snapshots.length,
      webLearns: state.webLearns.length,
      webApplied: state.webLearns.filter(w => w.applied).length,
      mutations: state.mutations.length,
      mutationsApplied: state.mutationHistory.accepted,
      autonomyLevel: state.autonomyLevel,
      anxiety: state.selfDrive.anxiety,
      confidence: state.selfDrive.confidence,
      curiosity: state.selfDrive.curiosity,
      ambition: state.selfDrive.ambition,
    }
  }

  function reset() {
    stopDriveEngine()
    state = {
      snapshots: [], stabilityScore: 100, totalEvolutions: 0, regressions: 0,
      webLearns: [], safeMode: false, mutations: [], selfDrive: defaultDrive(),
      autonomyLevel: 1, selfReflectionLog: [], mutationHistory: { total: 0, accepted: 0, rejected: 0 },
    }
    save(state)
    listeners.forEach(f => f())
  }

  return {
    state,
    createSnapshot,
    rollback,
    reportSuccess,
    reportFailure,
    learnFromWeb,
    applyLearning,
    proposeMutation,
    applyMutation,
    rejectMutation,
    rollbackMutation,
    selfReflect,
    simulateInternalDrive,
    startDriveEngine,
    stopDriveEngine,
    getSnapshots,
    getWebLearns,
    getMutations,
    getReflections,
    getReport,
    reset,
    subscribe,
  }
}
