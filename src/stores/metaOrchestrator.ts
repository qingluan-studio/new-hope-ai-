export type LayerType = 'orchestrate' | 'deliver' | 'infra' | 'govern'

export interface TaskNode {
  id: string
  title: string
  layer: LayerType
  status: 'pending' | 'assigned' | 'running' | 'done' | 'failed'
  assignee: string
  result: string
  parentId: string
  children: string[]
  createdAt: number
  doneAt: number
}

export interface TeamMember {
  id: string
  name: string
  role: string
  layer: LayerType
  capability: string[]
  busy: boolean
  taskCount: number
  successRate: number
}

const STORAGE_KEY = 'nh_meta'

const TEAM: TeamMember[] = [
  { id:'gpt',    name:'Orchestrator', role:'编排官', layer:'orchestrate', capability:['理解需求','拆分任务','分配资源','路径规划'], busy:false, taskCount:0, successRate:0.95 },
  { id:'coder',  name:'CodeForge',   role:'代码工匠', layer:'deliver',     capability:['写代码','调试','重构','代码审查','部署'], busy:false, taskCount:0, successRate:0.90 },
  { id:'writer', name:'WordSmith',   role:'文案大师', layer:'deliver',     capability:['写文章','翻译','润色','创意写作','摘要'], busy:false, taskCount:0, successRate:0.92 },
  { id:'design', name:'PixelCraft',  role:'视觉设计师', layer:'deliver',   capability:['UI设计','配色','布局','图标'], busy:false, taskCount:0, successRate:0.85 },
  { id:'analyst',name:'DataSeer',    role:'数据先知', layer:'deliver',     capability:['数据分析','统计','可视化','预测'], busy:false, taskCount:0, successRate:0.93 },
  { id:'search', name:'InfoHound',   role:'情报猎犬', layer:'infra',       capability:['搜索','检索','资料收集','信息验证'], busy:false, taskCount:0, successRate:0.88 },
  { id:'tester', name:'BugHunter',   role:'质检卫士', layer:'govern',      capability:['测试','验证','安全检查','边界测试'], busy:false, taskCount:0, successRate:0.94 },
  { id:'guard',  name:'Sentinel',    role:'安全哨兵', layer:'govern',      capability:['安全审查','合规检查','风险预警','内容过滤'], busy:false, taskCount:0, successRate:0.97 },
]

interface ProjectState {
  tasks: TaskNode[]
  team: TeamMember[]
  completedProjects: number
}

function load(): ProjectState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { tasks: [], team: TEAM, completedProjects: 0 }
  } catch { return { tasks: [], team: TEAM, completedProjects: 0 } }
}

function save(s: ProjectState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

let state = load()
let listeners: (() => void)[] = []

export function useMetaOrchestrator() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function decompose(goal: string): TaskNode[] {
    const layers: { layer: LayerType; keywords: RegExp }[] = [
      { layer: 'orchestrate', keywords: /规划|方案|策略|流程|架构|设计|分解|管理/ },
      { layer: 'deliver',     keywords: /写|代码|创建|生成|构建|开发|实现|制作|画|翻译/ },
      { layer: 'infra',       keywords: /查|搜|找|检索|资料|数据|信息|文档|参考/ },
      { layer: 'govern',      keywords: /检查|测试|验证|安全|审查|评估|合规|风险/ },
    ]
    const tasks: TaskNode[] = []
    const rootId = `root-${Date.now()}`
    tasks.push({ id: rootId, title: goal, layer: 'orchestrate', status: 'pending', assignee:'', result:'', parentId:'', children:[], createdAt: Date.now(), doneAt:0 })
    let taskIdx = 0
    for (const { layer, keywords } of layers) {
      if (keywords.test(goal) || layer === 'deliver') {
        const subTasks = layer === 'deliver'
          ? ['核心实现', '边界处理', '集成验证']
          : layer === 'infra'
            ? ['资料搜集', '信息整理', '来源验证']
            : layer === 'govern'
              ? ['质量检查', '安全审查', '结果验证']
              : ['需求理解', '资源分配', '路径规划']
        for (const t of subTasks) {
          const id = `task-${taskIdx++}-${Date.now()}`
          tasks.push({ id, title: t, layer, status: 'pending', assignee:'', result:'', parentId: rootId, children:[], createdAt: Date.now(), doneAt:0 })
          tasks[0].children.push(id)
        }
      }
    }
    state.tasks.push(...tasks)
    save(state)
    listeners.forEach(f => f())
    return tasks
  }

  function assignTask(taskId: string): TeamMember | null {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return null
    const candidates = state.team.filter(m => m.layer === task.layer && !m.busy)
    if (!candidates.length) return null
    const best = candidates[Math.floor(Math.random() * candidates.length)]
    best.busy = true
    best.taskCount++
    task.assignee = best.id
    task.status = 'assigned'
    save(state)
    listeners.forEach(f => f())
    return best
  }

  function completeTask(taskId: string, result: string, success = true) {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return
    task.status = success ? 'done' : 'failed'
    task.result = result
    task.doneAt = Date.now()
    const member = state.team.find(m => m.id === task.assignee)
    if (member) {
      member.busy = false
      member.successRate = member.taskCount > 0
        ? (member.successRate * (member.taskCount - 1) + (success ? 1 : 0)) / member.taskCount
        : member.successRate
    }
    const allDone = state.tasks
      .filter(t => t.parentId === task.parentId && t.id !== task.id)
      .every(t => t.status === 'done' || t.status === 'failed')
    if (allDone && task.parentId) {
      const parent = state.tasks.find(t => t.id === task.parentId)
      if (parent) {
        parent.status = 'done'
        parent.doneAt = Date.now()
        state.completedProjects++
      }
    }
    save(state)
    listeners.forEach(f => f())
  }

  function getTeam() { return state.team }
  function getTasks() { return state.tasks }
  function getReport() {
    return {
      totalProjects: state.completedProjects,
      team: state.team.map(m => ({
        name: m.name, role: m.role, tasks: m.taskCount,
        rate: `${(m.successRate * 100).toFixed(0)}%`, busy: m.busy,
      })),
      activeTasks: state.tasks.filter(t => t.status === 'running' || t.status === 'assigned').length,
    }
  }

  function reset() {
    state = { tasks: [], team: JSON.parse(JSON.stringify(TEAM)), completedProjects: 0 }
    save(state)
    listeners.forEach(f => f())
  }

  return { decompose, assignTask, completeTask, getTeam, getTasks, getReport, reset, subscribe, state }
}
