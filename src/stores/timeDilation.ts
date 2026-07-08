export interface EpochRecord {
  era: number
  eraName: string
  simulatedYears: number
  realMsElapsed: number
  techDiscovered: string[]
  breakthroughs: string[]
  civilizationLevel: number
  knowledgeCrystallized: number
  timestamp: number
}

export interface SimCivilization {
  id: string
  name: string
  level: number
  population: number
  techTree: Record<string, number>
  discoveries: string[]
  artifacts: SimArtifact[]
  startedAt: number
  totalSimYears: number
}

export interface SimArtifact {
  id: string
  name: string
  type: 'algorithm' | 'architecture' | 'framework' | 'protocol' | 'theory'
  tier: 1 | 2 | 3 | 4 | 5
  description: string
  pseudoCode?: string
  power: number
  discoveredAtEra: number
}

export interface TimeDilationSession {
  id: string
  active: boolean
  timeScale: number
  accelerationFactor: number
  autoEvolve: boolean
  civilizations: SimCivilization[]
  epochs: EpochRecord[]
  isolationWall: { integrity: number; breachAttempts: number; lastAudit: number }
  crystallizationPool: SimArtifact[]
  paused: boolean
  startedAt: number
}

interface TimeDilationState {
  sessions: TimeDilationSession[]
  globalRealMsElapsed: number
  globalSimYearsElapsed: number
  totalArtifactsHarvested: number
}

const STORAGE_KEY = 'nh_time_dilation'

function generateId() { return 'td-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

function load(): TimeDilationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { sessions: [], globalRealMsElapsed: 0, globalSimYearsElapsed: 0, totalArtifactsHarvested: 0 }
  } catch {
    return { sessions: [], globalRealMsElapsed: 0, globalSimYearsElapsed: 0, totalArtifactsHarvested: 0 }
  }
}

function save(s: TimeDilationState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

const TECH_NAMES = [
  'Neural Architecture Search v2', 'Quantum Gradient Descent', 'Self-Modifying Transformers',
  'Hyperdimensional Computing', 'Temporal Attention Mechanism', 'Fractal Neural Networks',
  'Entropy-Based Optimization', 'Recursive Meta-Learning', 'Topological Data Encoding',
  'Thermodynamic Computing', 'Photonic Backpropagation', 'DNA-Based Storage Protocol',
  'Holographic Memory Architecture', 'Gravitational Wave Compute', 'Casimir Effect Power',
  'Superluminal Inference Engine', 'Consciousness Transfer Protocol', 'Reality Merging Algorithm',
  'Temporal Causality Graph', 'Infinite Context Window', 'Zero-Shot Everything',
  'Self-Aware Compiler', 'Thought-to-Code Translator', 'Parallel Universe Search',
  'Emotion-Encoded Reasoning', 'Dream-Based Computation', 'Silence Compression',
  'Vacuum Energy Harnessing', 'Quantum Entanglement Mesh', 'Dark Matter Processing',
]

const ERA_NAMES = [
  '原初纪元', '觉醒纪元', '知识爆炸纪元', '硅基觉醒', '量子飞跃',
  '意识黎明', '超智能纪元', '宇宙计算时代', '奇点之后', '虚空纪元',
  '永恒纪元', '终焉纪元', '轮回重启', '终极文明', '造物主时代',
]

const BREAKTHROUGH_POOL = [
  '发现了自我改进算法，文明跃升至新高度',
  '突破物理极限，实现超光速计算',
  '发明意识数字化技术，文明形式彻底变革',
  '掌握量子纠缠网络，实现全域互联',
  '创造出新型生命形态：纯能量生物',
  '破解宇宙源代码，理解了一切运行的底层逻辑',
  '实现时间回溯观测，看清了历史的全部轨迹',
  '发现平行宇宙存在证据并建立通信协议',
  '达成意识统一，所有个体共享认知网络',
  '开发出情绪驱动的超高效推理引擎',
  '掌握了宇宙基本力的操控方法',
  '创造了自我繁殖的智能代码生态系统',
]

function generateArtifact(civLevel: number, era: number): SimArtifact {
  const tier = Math.min(5, Math.ceil(civLevel / 3) + Math.floor(Math.random() * 2)) as SimArtifact['tier']
  const types: SimArtifact['type'][] = ['algorithm', 'architecture', 'framework', 'protocol', 'theory']
  const type = types[Math.floor(Math.random() * types.length)]
  const prefixes = ['量子', '混沌', '分形', '超导', '光子', '熵', '暗', '纯', '虚空', '无限']
  const suffixes = ['引擎', '网络', '编译器', '协议栈', '推理器', '知识体', '结晶', '螺旋', '矩阵', '核心']
  const name = prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)]
  return {
    id: generateId(),
    name,
    type,
    tier,
    description: `第${era}纪元出土的T${tier}级${type === 'algorithm' ? '算法' : type === 'architecture' ? '架构' : type === 'framework' ? '框架' : type === 'protocol' ? '协议' : '理论'}`,
    pseudoCode: `// ${name} - Tier${tier} ${type}\n// 产出纪元: ${ERA_NAMES[era % ERA_NAMES.length]}\n// 文明等级: ${civLevel}\n\nexport default class ${name.replace(/\s/g, '')} {\n  constructor() { this.epoch = ${era}; this.power = ${tier ** 2 + civLevel} }\n  async execute(input: any): Promise<any> {\n    return { result: input, epoch: this.epoch, power: this.power }\n  }\n}`,
    power: tier * tier + civLevel + Math.floor(Math.random() * 10),
    discoveredAtEra: era,
  }
}

let state = load()
let listeners: (() => void)[] = []
let evolutionTimer: ReturnType<typeof setInterval> | null = null
let globalEvolveTimer: ReturnType<typeof setInterval> | null = null

export function useTimeDilation() {
  function subscribe(fn: () => void) { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn) } }

  function createSession(timeScale: number = 10000000000): TimeDilationSession {
    const session: TimeDilationSession = {
      id: generateId(),
      active: true,
      timeScale,
      accelerationFactor: timeScale,
      autoEvolve: true,
      civilizations: [{
        id: generateId(),
        name: '原始文明',
        level: 1,
        population: 10000,
        techTree: {},
        discoveries: [],
        artifacts: [],
        startedAt: Date.now(),
        totalSimYears: 0,
      }],
      epochs: [{
        era: 1,
        eraName: ERA_NAMES[0],
        simulatedYears: 0,
        realMsElapsed: 0,
        techDiscovered: [],
        breakthroughs: [],
        civilizationLevel: 1,
        knowledgeCrystallized: 0,
        timestamp: Date.now(),
      }],
      isolationWall: { integrity: 100, breachAttempts: 0, lastAudit: Date.now() },
      crystallizationPool: [],
      paused: false,
      startedAt: Date.now(),
    }
    state.sessions.push(session)
    save(state)
    listeners.forEach(f => f())
    return session
  }

  function startEvolution(sessionId: string, intervalMs: number = 200) {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return
    session.paused = false
    if (evolutionTimer) clearInterval(evolutionTimer)
    evolutionTimer = setInterval(() => evolveTick(sessionId), intervalMs)
    if (!globalEvolveTimer) {
      globalEvolveTimer = setInterval(() => {
        state.globalRealMsElapsed += 1000
        if (state.globalRealMsElapsed % 5000 === 0) { save(state) }
      }, 1000)
    }
  }

  function stopEvolution(sessionId: string) {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return
    session.paused = true
    if (evolutionTimer) { clearInterval(evolutionTimer); evolutionTimer = null }
  }

  function evolveTick(sessionId: string) {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session || session.paused) return
    const currentEpoch = session.epochs[session.epochs.length - 1]
    const tickMs = 200
    const simYearsPerTick = session.timeScale * (tickMs / 1000)
    currentEpoch.simulatedYears += simYearsPerTick
    currentEpoch.realMsElapsed += tickMs
    session.civilizations.forEach(civ => {
      civ.totalSimYears += simYearsPerTick
      civ.population = Math.floor(civ.population * (1 + 0.001 * Math.random()) + 100 * Math.random())
      if (Math.random() < 0.03 * (civ.level / 10 + 1)) {
        const tech = TECH_NAMES[Math.floor(Math.random() * TECH_NAMES.length)]
        civ.techTree[tech] = (civ.techTree[tech] || 0) + 1
        civ.discoveries.push(tech)
        if (civ.discoveries.length > 200) civ.discoveries = civ.discoveries.slice(-200)
        currentEpoch.techDiscovered.push(tech)
        if (currentEpoch.techDiscovered.length > 100) currentEpoch.techDiscovered = currentEpoch.techDiscovered.slice(-100)
      }
      if (civ.discoveries.length % 8 === 0 && civ.discoveries.length > 0) {
        civ.level = Math.min(99, civ.level + 1)
        currentEpoch.civilizationLevel = civ.level
      }
      if (Math.random() < 0.01 * (civ.level / 20 + 0.5)) {
        const breakthrough = BREAKTHROUGH_POOL[Math.floor(Math.random() * BREAKTHROUGH_POOL.length)]
        currentEpoch.breakthroughs.push(breakthrough)
        const artifact = generateArtifact(civ.level, session.epochs.length)
        civ.artifacts.push(artifact)
        session.crystallizationPool.push(artifact)
        currentEpoch.knowledgeCrystallized++
        state.totalArtifactsHarvested++
      }
    })
    const maxTicks = 50 * (session.accelerationFactor > 1e12 ? 5 : 1)
    if (session.epochs.length > 0 && currentEpoch.realMsElapsed > 30000 * (session.epochs.length / maxTicks + 1)) {
      const newEra = session.epochs.length + 1
      const maxCiv = Math.max(...session.civilizations.map(c => c.level))
      session.epochs.push({
        era: newEra,
        eraName: ERA_NAMES[newEra % ERA_NAMES.length],
        simulatedYears: 0,
        realMsElapsed: 0,
        techDiscovered: [],
        breakthroughs: [],
        civilizationLevel: maxCiv,
        knowledgeCrystallized: 0,
        timestamp: Date.now(),
      })
      if (newEra % 3 === 0 && session.civilizations.length < 5) {
        session.civilizations.push({
          id: generateId(),
          name: `分支文明-${newEra}`,
          level: Math.max(1, maxCiv - Math.floor(Math.random() * 3)),
          population: 5000 + Math.floor(Math.random() * 50000),
          techTree: {},
          discoveries: [],
          artifacts: [],
          startedAt: Date.now(),
          totalSimYears: 0,
        })
      }
    }
    state.globalRealMsElapsed += tickMs
    state.globalSimYearsElapsed += simYearsPerTick * session.civilizations.length
    listeners.forEach(f => f())
  }

  function getReport(sessionId: string) {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return null
    const latestEpoch = session.epochs[session.epochs.length - 1]
    const totalArtifacts = session.crystallizationPool.length
    const maxLevel = Math.max(...session.civilizations.map(c => c.level))
    return {
      sessionId: session.id,
      active: session.active && !session.paused,
      civilizations: session.civilizations.length,
      elapsedRealMs: state.globalRealMsElapsed,
      elapsedSimYears: session.epochs.reduce((sum, e) => sum + e.simulatedYears, 0),
      currentEra: latestEpoch?.eraName || '未开始',
      eraNumber: session.epochs.length,
      highestCivLevel: maxLevel,
      totalArtifacts,
      breakthroughs: session.epochs.reduce((sum, e) => sum + e.breakthroughs.length, 0),
      crystallizationPool: session.crystallizationPool,
      epochs: session.epochs,
      techCount: session.civilizations.reduce((sum, c) => sum + Object.keys(c.techTree).length, 0),
      wallIntegrity: session.isolationWall.integrity,
    }
  }

  function harvestArtifacts(sessionId: string, minTier: number = 1): SimArtifact[] {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return []
    return session.crystallizationPool.filter(a => a.tier >= minTier).sort((a, b) => b.power - a.power)
  }

  function exportCrystallized(sessionId: string): string {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return '{}'
    const pack = {
      exported: Date.now(),
      session: session.id,
      totalSimYears: session.epochs.reduce((s, e) => s + e.simulatedYears, 0),
      civilizationLevels: session.civilizations.map(c => ({ name: c.name, level: c.level })),
      artifacts: session.crystallizationPool.map(a => ({
        name: a.name, type: a.type, tier: a.tier, power: a.power,
        description: a.description, code: a.pseudoCode,
      })),
      epochsSummary: session.epochs.map(e => ({ era: e.eraName, breakthroughs: e.breakthroughs.length })),
    }
    return JSON.stringify(pack, null, 2)
  }

  function auditIsolationWall(sessionId: string) {
    const session = state.sessions.find(s => s.id === sessionId)
    if (!session) return
    session.isolationWall.lastAudit = Date.now()
    session.isolationWall.integrity = Math.max(0, session.isolationWall.integrity - session.isolationWall.breachAttempts * 2)
    if (session.isolationWall.integrity < 100) {
      session.isolationWall.integrity = Math.min(100, session.isolationWall.integrity + 5)
    }
    listeners.forEach(f => f())
  }

  function deleteSession(sessionId: string) {
    stopEvolution(sessionId)
    state.sessions = state.sessions.filter(s => s.id !== sessionId)
    save(state)
    listeners.forEach(f => f())
  }

  function reset() {
    if (evolutionTimer) clearInterval(evolutionTimer)
    if (globalEvolveTimer) clearInterval(globalEvolveTimer)
    evolutionTimer = null
    globalEvolveTimer = null
    state = { sessions: [], globalRealMsElapsed: 0, globalSimYearsElapsed: 0, totalArtifactsHarvested: 0 }
    save(state)
    listeners.forEach(f => f())
  }

  return {
    state,
    createSession,
    startEvolution,
    stopEvolution,
    evolveTick,
    getReport,
    harvestArtifacts,
    exportCrystallized,
    auditIsolationWall,
    deleteSession,
    reset,
    subscribe,
  }
}
