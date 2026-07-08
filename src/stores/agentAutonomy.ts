import { type SubAgent } from './superAgent'

export interface AutoTask {
  id: string
  title: string
  prompt: string
  status: 'pending' | 'running' | 'done' | 'failed'
  agent: SubAgent | null
  result: string
  startedAt: number
  doneAt: number
  dependsOn: string[]
}

export interface AutoRun {
  id: string
  goal: string
  tasks: AutoTask[]
  status: 'planning' | 'executing' | 'done' | 'failed'
  createdAt: number
  doneAt: number
  summary: string
  stats: { total: number; done: number; failed: number }
}

interface AutonomyState {
  runs: AutoRun[]
  activeRunId: string | null
  totalRuns: number
}

const STORAGE_KEY = 'nh_autonomy'
const MAX_RUNS = 50

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

let state: AutonomyState = { runs: [], activeRunId: null, totalRuns: 0 }
let listeners: (() => void)[] = []

function load() { try { const r = localStorage.getItem(STORAGE_KEY); if (r) state = JSON.parse(r) } catch {} }
function save() { if (state.runs.length > MAX_RUNS) state.runs = state.runs.slice(-MAX_RUNS); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
function emit() { listeners.forEach(f => f()) }

load()

const PLAN_PROMPT = `You are a task planning engine. Decompose the user's goal into parallel subtasks. Output ONLY a JSON array of tasks. Each task: { "title": string, "prompt": string, "dependsOn": number[] }. Rules:
- max 6 tasks
- each prompt must be self-contained and specific
- dependsOn is array of task indices (0-based) that must complete first
- tasks without dependsOn can run in parallel
- keep each prompt under 200 characters
- order tasks logically: research/analysis first, then building/writing, then review
- final task should be aggregation/synthesis`

const SUMMARIZE_PROMPT = `You are a results synthesis engine. Given the original goal and the results of all subtasks, produce a concise, well-organized summary. Format:
## Summary
[brief overview]
## Key Findings
- [finding 1]
- [finding 2]
## Action Items
- [actionable item]
## Final Answer
[direct answer to the original goal]`

export function useAgentAutonomy() {
  function createRun(goal: string, agents: SubAgent[], planJson: string): AutoRun {
    let tasks: AutoTask[]
    try {
      const parsed = JSON.parse(planJson)
      if (!Array.isArray(parsed)) throw new Error('Expected array')
      tasks = parsed.map((t: any, i: number) => ({
        id: uid(),
        title: t.title || `Task ${i + 1}`,
        prompt: t.prompt || t.title || '',
        status: 'pending' as const,
        agent: agents[i % agents.length] ?? agents[0] ?? null,
        result: '',
        startedAt: 0,
        doneAt: 0,
        dependsOn: (t.dependsOn || []).map((d: number) => parsed[d]?.title || ''),
      }))
    } catch {
      tasks = [{
        id: uid(), title: 'Single Task', prompt: goal, status: 'pending',
        agent: agents[0] ?? null, result: '', startedAt: 0, doneAt: 0, dependsOn: [],
      }]
    }
    const run: AutoRun = {
      id: uid(), goal, tasks, status: 'planning', createdAt: Date.now(), doneAt: 0,
      summary: '', stats: { total: tasks.length, done: 0, failed: 0 },
    }
    state.runs.push(run)
    state.activeRunId = run.id
    state.totalRuns++
    save(); emit()
    return run
  }

  function startExecution(runId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    run.status = 'executing'
    save(); emit()
  }

  function getNextTask(runId: string): AutoTask | null {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return null
    for (const t of run.tasks) {
      if (t.status !== 'pending') continue
      const depsDone = t.dependsOn.every(dep => {
        const dt = run.tasks.find(rt => rt.title === dep)
        return dt && dt.status === 'done'
      })
      if (depsDone) return t
    }
    return null
  }

  function markRunning(runId: string, taskId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const task = run.tasks.find(t => t.id === taskId)
    if (task) { task.status = 'running'; task.startedAt = Date.now(); save(); emit() }
  }

  function markDone(runId: string, taskId: string, result: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const task = run.tasks.find(t => t.id === taskId)
    if (task) { task.status = 'done'; task.result = result; task.doneAt = Date.now(); run.stats.done++; save(); emit() }
    checkCompletion(runId)
  }

  function markFailed(runId: string, taskId: string, error: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const task = run.tasks.find(t => t.id === taskId)
    if (task) { task.status = 'failed'; task.result = error; run.stats.failed++; save(); emit() }
  }

  function checkCompletion(runId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const pending = run.tasks.filter(t => t.status === 'pending' || t.status === 'running')
    if (pending.length === 0) {
      run.status = 'done'
      run.doneAt = Date.now()
      if (state.activeRunId === runId) state.activeRunId = null
      save(); emit()
    }
  }

  function setSummary(runId: string, summary: string) {
    const run = state.runs.find(r => r.id === runId)
    if (run) { run.summary = summary; save(); emit() }
  }

  function cancelRun(runId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    run.status = 'failed'
    run.doneAt = Date.now()
    if (state.activeRunId === runId) state.activeRunId = null
    save(); emit()
  }

  function getRuns() { return [...state.runs].reverse() }
  function getActiveRun() { return state.runs.find(r => r.id === state.activeRunId) ?? null }
  function getLastRun() { return state.runs.length > 0 ? state.runs[state.runs.length - 1] : null }

  function getPlanPrompt() { return PLAN_PROMPT }
  function getSummarizePrompt() { return SUMMARIZE_PROMPT }

  function buildAgentContext(runId: string, taskId: string): string {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return ''
    const task = run.tasks.find(t => t.id === taskId)
    if (!task || !task.agent) return ''

    const deps = task.dependsOn.map(d => {
      const dt = run.tasks.find(t => t.title === d)
      return dt ? `[${dt.title}]: ${dt.result.slice(0, 300)}` : ''
    }).filter(Boolean).join('\n')

    return `[Agent: ${task.agent.name} (${task.agent.role})]
[Overall Goal]: ${run.goal}
[Your Task]: ${task.prompt}
${deps ? `[Dependencies]:\n${deps}` : ''}
Execute your task. Be thorough and specific.`
  }

  function getAllResults(runId: string): string {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return ''
    return run.tasks.filter(t => t.status === 'done' && t.result).map(t =>
      `## ${t.title} [${t.agent?.name ?? 'Agent'}]\n${t.result.slice(0, 500)}`
    ).join('\n\n---\n\n')
  }

  function subscribe(fn: () => void) { listeners.push(fn) }
  function reset() { state = { runs: [], activeRunId: null, totalRuns: 0 }; save(); emit() }
  function getState() { return state }

  return {
    createRun, startExecution, getNextTask, markRunning, markDone, markFailed,
    setSummary, cancelRun, getRuns, getActiveRun, getLastRun,
    getPlanPrompt, getSummarizePrompt, buildAgentContext, getAllResults,
    subscribe, reset, getState,
  }
}
