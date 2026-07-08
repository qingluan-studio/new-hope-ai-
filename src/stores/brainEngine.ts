export interface BrainRegion {
  id: string
  name: string
  desc: string
  activation: number
  synapseCount: number
  connected: string[]
}

export interface Synapse {
  from: string
  to: string
  weight: number
  freq: number
  createdAt: number
  lastFired: number
}

interface BrainState {
  regions: BrainRegion[]
  synapses: Synapse[]
  totalActivations: number
  evolutionLevel: number
  sleepAt: number
  dreamFragments: string[]
}

const STORAGE_KEY = 'nh_brain'

const initRegions = (): BrainRegion[] => [
  { id:'lang',    name:'语言区',   desc:'理解与生成自然语言', activation:0.5, synapseCount:0, connected:[] },
  { id:'logic',   name:'逻辑区',   desc:'推理、数学、因果分析', activation:0.4, synapseCount:0, connected:[] },
  { id:'memory',  name:'记忆区',   desc:'存储与检索长期记忆', activation:0.6, synapseCount:0, connected:[] },
  { id:'create',  name:'创造区',   desc:'创意生成、写作、设计', activation:0.3, synapseCount:0, connected:[] },
  { id:'emotion', name:'情感区',   desc:'情绪识别与共情响应', activation:0.4, synapseCount:0, connected:[] },
  { id:'visual',  name:'视觉区',   desc:'图像理解与图表解析', activation:0.2, synapseCount:0, connected:[] },
  { id:'plan',    name:'规划区',   desc:'任务分解与策略制定', activation:0.3, synapseCount:0, connected:[] },
  { id:'ethics',  name:'伦理区',   desc:'安全校验与边界判断', activation:0.5, synapseCount:0, connected:[] },
  { id:'learn',   name:'学习区',   desc:'模式识别与知识内化', activation:0.5, synapseCount:0, connected:[] },
  { id:'social',  name:'社交区',   desc:'对话节奏与人际理解', activation:0.4, synapseCount:0, connected:[] },
  { id:'exec',    name:'执行区',   desc:'工具调用与动作执行', activation:0.2, synapseCount:0, connected:[] },
  { id:'reflect', name:'反思区',   desc:'自我审视与元认知', activation:0.3, synapseCount:0, connected:[] },
]

function load(): BrainState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { regions: initRegions(), synapses: [], totalActivations: 0, evolutionLevel: 1, sleepAt: 0, dreamFragments: [] }
}

function save(s: BrainState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

let state = load()
let listeners: (() => void)[] = []

export function useBrainEngine() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function activateRegions(regionIds: string[], intensity = 0.1) {
    const now = Date.now()
    for (const id of regionIds) {
      const r = state.regions.find(x => x.id === id)
      if (!r) continue
      r.activation = Math.min(1, r.activation + intensity)
      r.synapseCount++
      for (const other of state.regions) {
        if (other.id === id) continue
        let syn = state.synapses.find(s => (s.from === id && s.to === other.id) || (s.from === other.id && s.to === id))
        if (!syn) {
          syn = { from: id, to: other.id, weight: 0.01, freq: 0, createdAt: now, lastFired: now }
          state.synapses.push(syn)
          r.connected.push(other.id)
          other.connected.push(id)
        }
        syn.weight = Math.min(1, syn.weight + intensity * 0.3)
        syn.freq++
        syn.lastFired = now
      }
    }
    state.totalActivations++
    if (state.totalActivations % 20 === 0) state.evolutionLevel = Math.min(10, state.evolutionLevel + 1)
    degradeAll()
    save(state)
    listeners.forEach(f => f())
  }

  /** 闲置衰减：不用就弱化，模拟遗忘曲线 */
  function degradeAll() {
    const now = Date.now()
    for (const r of state.regions) {
      r.activation = Math.max(0.1, r.activation * 0.999)
    }
    for (const syn of state.synapses) {
      const daysSinceFired = (now - syn.lastFired) / 86400000
      if (daysSinceFired > 3) syn.weight = Math.max(0.01, syn.weight * 0.95)
    }
  }

  /** 睡眠模式：整理记忆、巩固强连接、生成"梦境"创意 */
  function sleep() {
    state.sleepAt = Date.now()
    const strong = state.synapses.filter(s => s.weight > 0.5)
    for (const s of strong) s.weight = Math.min(1, s.weight * 1.05)
    const weak = state.synapses.filter(s => s.weight < 0.1)
    const removed = weak.length > 10 ? Math.floor(weak.length * 0.3) : 0
    for (let i = 0; i < removed; i++) {
      const idx = state.synapses.indexOf(weak[i])
      if (idx >= 0) state.synapses.splice(idx, 1)
    }
    if (state.dreamFragments.length > 20) state.dreamFragments.splice(0, state.dreamFragments.length - 20)
    const topRegions = [...state.regions].sort((a, b) => b.activation - a.activation).slice(0, 3)
    state.dreamFragments.push(`${topRegions.map(r => r.name).join('+')} 产生新回路`)
    degradeAll()
    save(state)
    listeners.forEach(f => f())
  }

  function getTopPath(): string {
    const strong = [...state.synapses].sort((a, b) => b.weight - a.weight)
    if (!strong.length) return '大脑尚未建立足够连接'
    const top = strong.slice(0, 5)
    return top.map(s => `${findName(s.from)}→${findName(s.to)}(${(s.weight * 100).toFixed(0)}%)`).join(' | ')
  }

  function findName(id: string) { return state.regions.find(r => r.id === id)?.name || id }

  function getEvolutionReport() {
    return {
      level: state.evolutionLevel,
      totalActivations: state.totalActivations,
      synapseCount: state.synapses.length,
      topRegions: [...state.regions].sort((a, b) => b.activation - a.activation).slice(0, 4).map(r => `${r.name}[${(r.activation * 100).toFixed(0)}%]`),
      latestDream: state.dreamFragments.slice(-1)[0] || '暂无梦境',
      topPath: getTopPath(),
    }
  }

  function detectRegionsFromInput(input: string): string[] {
    const map: Record<string, RegExp> = {
      lang: /翻译|写|说|讲|语言|英文|中文|日语|文章|文案|故事|诗歌/,
      logic: /为什么|原因|逻辑|推理|如果|计算|数学|证明|分析|bug|错误|数据/,
      create: /设计|创意|想法|新|造|画|生成|创造|构思|灵感/,
      plan: /步骤|计划|方案|策略|怎么做|如何|流程|安排/,
      emotion: /开心|难过|愤怒|焦虑|情绪|感受|心情|安慰|鼓励/,
      ethics: /安全|违规|合法|道德|伦理|风险|审查/,
      memory: /之前|上次|记|回忆|历史|笔记|存/,
      social: /聊天|朋友|社交|沟通|交流|团队/,
      exec: /执行|运行|代码|命令|文件|下载|安装|部署/,
      reflect: /我做得|评价|反思|改进|优化|检查/,
    }
    const activated: string[] = []
    for (const [id, re] of Object.entries(map)) {
      if (re.test(input)) activated.push(id)
    }
    return activated.length ? activated : ['lang', 'memory']
  }

  function reset() {
    state = { regions: initRegions(), synapses: [], totalActivations: 0, evolutionLevel: 1, sleepAt: 0, dreamFragments: [] }
    save(state)
    listeners.forEach(f => f())
  }

  return { state, subscribe, activateRegions, sleep, detectRegionsFromInput, getEvolutionReport, getTopPath, reset }
}
