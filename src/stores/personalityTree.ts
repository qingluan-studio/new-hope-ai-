export interface PersonalityBranch {
  id: string
  name: string
  traits: Record<string, number>
  conversationCount: number
  wordPatterns: string[]
  createdAt: number
  lastActive: number
}

interface MimicProfile {
  overall: Record<string, number>
  branches: PersonalityBranch[]
  totalInteractions: number
  evolutionEvents: string[]
}

const STORAGE_KEY = 'nh_persona'
const BRANCH_TEMPLATES: Omit<PersonalityBranch, 'id' | 'conversationCount' | 'wordPatterns' | 'createdAt' | 'lastActive'>[] = [
  { name: '工作模式',  traits: { formal: 8, logic: 9, empathy: 3, humor: 2, brevity: 7, detail: 6 } },
  { name: '休闲模式',  traits: { formal: 2, logic: 4, empathy: 7, humor: 8, brevity: 5, detail: 3 } },
  { name: '学习模式',  traits: { formal: 6, logic: 8, empathy: 4, humor: 3, brevity: 4, detail: 8 } },
  { name: '创意模式',  traits: { formal: 3, logic: 4, empathy: 6, humor: 7, brevity: 3, detail: 5 } },
]

function load(): MimicProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { overall: {}, branches: [], totalInteractions: 0, evolutionEvents: [] }
}

function save(p: MimicProfile) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

let profile = load()
let listeners: (() => void)[] = []

export function usePersonalityTree() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function getProfile() { return profile }
  function getBranches() { return profile.branches }

  function logInteraction(input: string, branchName: string) {
    profile.totalInteractions++
    let branch = profile.branches.find(b => b.name === branchName)
    if (!branch) {
      const tmpl = BRANCH_TEMPLATES.find(t => t.name === branchName)
      branch = {
        ...(tmpl || { name: branchName, traits: {} }),
        id: `br-${Date.now()}`,
        conversationCount: 0, wordPatterns: [],
        createdAt: Date.now(), lastActive: Date.now(),
      }
      profile.branches.push(branch)
    }
    branch.conversationCount++
    branch.lastActive = Date.now()
    const words = extractPatternWords(input)
    for (const w of words) {
      if (!branch.wordPatterns.includes(w) && branch.wordPatterns.length < 50) {
        branch.wordPatterns.push(w)
      }
    }
    if (profile.branches.length > 10) {
      profile.branches.sort((a, b) => b.lastActive - a.lastActive)
      profile.branches = profile.branches.slice(0, 10)
    }
    if (profile.totalInteractions % 50 === 0) {
      profile.evolutionEvents.push(`第${profile.totalInteractions}次交互: 人格分支${profile.branches.length}个`)
    }
    save(profile)
    listeners.forEach(f => f())
  }

  function getActiveBranch(): PersonalityBranch | null {
    if (!profile.branches.length) return null
    return [...profile.branches].sort((a, b) => b.lastActive - a.lastActive)[0]
  }

  function getMimicPrompt(branchName?: string): string {
    const target = branchName
      ? profile.branches.find(b => b.name === branchName)
      : getActiveBranch()
    if (!target) return ''
    const lines: string[] = [`[人格模式: ${target.name}]`]
    for (const [k, v] of Object.entries(target.traits)) {
      const emoji = v > 7 ? '高' : v > 4 ? '中' : '低'
      lines.push(`- ${traitLabel(k)}: ${emoji}`)
    }
    if (target.wordPatterns.length) {
      lines.push(`- 常用词: ${target.wordPatterns.slice(-10).join('、')}`)
    }
    return lines.join('\n')
  }

  function splitPersona(target: PersonalityBranch, variantName: string): PersonalityBranch {
    const variant: PersonalityBranch = {
      ...JSON.parse(JSON.stringify(target)),
      id: `br-${Date.now()}`,
      name: variantName,
      conversationCount: 0,
      wordPatterns: target.wordPatterns.slice(0, 10),
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
    for (const k of Object.keys(variant.traits)) {
      variant.traits[k] = Math.max(0, Math.min(10, variant.traits[k] + (Math.random() - 0.5) * 4))
    }
    profile.branches.push(variant)
    save(profile)
    listeners.forEach(f => f())
    return variant
  }

  function getEvolutionReport() {
    return {
      branches: profile.branches.map(b => `${b.name}(${b.conversationCount}次)`),
      totalInteractions: profile.totalInteractions,
      recentEvents: profile.evolutionEvents.slice(-5),
      activeBranch: getActiveBranch()?.name || '无',
    }
  }

  function reset() {
    profile = { overall: {}, branches: [], totalInteractions: 0, evolutionEvents: [] }
    save(profile)
    listeners.forEach(f => f())
  }

  return { getProfile, getBranches, logInteraction, getActiveBranch, getMimicPrompt, splitPersona, getEvolutionReport, reset, subscribe }
}

function extractPatternWords(input: string): string[] {
  const stopWords = new Set(['的','了','在','是','我','有','和','就','不','人','都','一','个','上','也','很','到','说','要','去','你','会','着','没有','看','好','自己','这'])
  return input.split(/[\s,，。！？、；:：\n]+/)
    .filter(w => w.length >= 2 && w.length <= 6 && !stopWords.has(w) && /^[\u4e00-\u9fff]+$/.test(w))
    .slice(0, 8)
}

function traitLabel(k: string): string {
  const map: Record<string, string> = {
    formal: '正式度', logic: '逻辑', empathy: '共情', humor: '幽默',
    brevity: '简洁', detail: '细节', creative: '创意', speed: '速度',
  }
  return map[k] || k
}
