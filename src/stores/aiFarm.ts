export interface FarmProvider {
  id: string
  name: string
  baseUrl: string
  models: string[]
  quotaUsed: number
  quotaLimit: number
  quotaReset: string
  free: boolean
  active: boolean
}

export interface FarmJob {
  id: string
  providerId: string
  model: string
  prompt: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result: string
  cost: number
  createdAt: number
}

const STORAGE_PROVIDERS = 'nh_farm_providers'
const STORAGE_JOBS = 'nh_farm_jobs'

const DEFAULT_PROVIDERS: FarmProvider[] = [
  { id:'deepseek',    name:'DeepSeek',   baseUrl:'https://api.deepseek.com/v1',  models:['deepseek-chat','deepseek-reasoner'], quotaUsed:0, quotaLimit:5000000, quotaReset:'daily', free:true, active:true },
  { id:'siliconflow', name:'硅基流动',    baseUrl:'https://api.siliconflow.cn/v1', models:['Qwen/Qwen2.5-7B-Instruct','deepseek-ai/DeepSeek-V3'], quotaUsed:0, quotaLimit:14000000, quotaReset:'total', free:true, active:true },
  { id:'zhipu',       name:'智谱AI',      baseUrl:'https://open.bigmodel.cn/api/paas/v4', models:['glm-4-flash','glm-4'], quotaUsed:0, quotaLimit:500000, quotaReset:'daily', free:true, active:true },
  { id:'moonshot',    name:'月之暗面',    baseUrl:'https://api.moonshot.cn/v1',  models:['moonshot-v1-8k','moonshot-v1-32k'], quotaUsed:0, quotaLimit:15000000, quotaReset:'total', free:true, active:true },
]

function loadP(): FarmProvider[] {
  try { const r = localStorage.getItem(STORAGE_PROVIDERS); return r ? JSON.parse(r) : DEFAULT_PROVIDERS } catch { return DEFAULT_PROVIDERS }
}
function loadJ(): FarmJob[] {
  try { const r = localStorage.getItem(STORAGE_JOBS); return r ? JSON.parse(r) : [] } catch { return [] }
}

let providers = loadP()
let jobs = loadJ()
let listeners: (() => void)[] = []

export function useAIFarm() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function getProviders() { return providers }
  function getJobs() { return [...jobs].reverse().slice(0, 100) }

  function addProvider(p: FarmProvider) { providers.push(p); saveP(); listeners.forEach(f => f()) }
  function toggleProvider(id: string) {
    const p = providers.find(x => x.id === id); if (!p) return
    p.active = !p.active; saveP(); listeners.forEach(f => f())
  }

  function getBestRoute(prompt: string): { provider: FarmProvider; model: string } | null {
    const active = providers.filter(p => p.active)
    if (!active.length) return null
    active.sort((a, b) => (a.quotaUsed / a.quotaLimit) - (b.quotaUsed / b.quotaLimit))
    const best = active[0]
    return { provider: best, model: best.models[0] }
  }

  function runJob(providerId: string, model: string, prompt: string): FarmJob {
    const job: FarmJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      providerId, model, prompt,
      status: 'pending', result: '', cost: 0, createdAt: Date.now(),
    }
    jobs.push(job)
    if (jobs.length > 200) jobs = jobs.slice(-200)
    saveJ()
    listeners.forEach(f => f())
    return job
  }

  function updateJob(id: string, status: FarmJob['status'], result: string, cost = 0) {
    const j = jobs.find(x => x.id === id); if (!j) return
    j.status = status; j.result = result; j.cost = cost
    const p = providers.find(x => x.id === j.providerId)
    if (p) p.quotaUsed += cost
    saveJ(); saveP()
    listeners.forEach(f => f())
  }

  function getTotalSavings(): number {
    return jobs.reduce((sum, j) => sum + j.cost, 0)
  }

  function getQuotaStats() {
    return providers.map(p => ({
      name: p.name,
      percent: Math.round((p.quotaUsed / p.quotaLimit) * 100),
      remaining: p.quotaLimit - p.quotaUsed,
    }))
  }

  function load() { providers = loadP(); jobs = loadJ(); listeners.forEach(f => f()) }

  function saveP() { localStorage.setItem(STORAGE_PROVIDERS, JSON.stringify(providers)) }
  function saveJ() { localStorage.setItem(STORAGE_JOBS, JSON.stringify(jobs)) }

  return { getProviders, getJobs, addProvider, toggleProvider, getBestRoute, runJob, updateJob, getTotalSavings, getQuotaStats, load, subscribe }
}
