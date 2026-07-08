export interface TaskStep {
  id: string
  desc: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  dependsOn: string[]
  assignedTool: string
  estimatedMin: number
  actualMin: number
  result: string
  errorLog: string
  retryCount: number
  maxRetries: number
}

export interface ActivePlan {
  id: string
  title: string
  goal: string
  steps: TaskStep[]
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  progress: number
  createdAt: number
  completedAt: number
}

export interface PlanTemplate {
  id: string
  name: string
  category: string
  steps: { desc: string; priority: TaskStep['priority']; dependsOn: string[]; assignedTool: string; estimatedMin: number }[]
  tags: string[]
}

const STORAGE_KEY = 'nh_plans'

const TEMPLATES: PlanTemplate[] = [
  { id:'tmpl-project',  name:'项目初始化', category:'dev', tags:['项目','初始化'], steps:[
    {desc:'需求分析与技术选型',priority:'critical',dependsOn:[],assignedTool:'code-gen',estimatedMin:15},
    {desc:'项目结构与脚手架搭建',priority:'critical',dependsOn:['step-0'],assignedTool:'code-gen',estimatedMin:20},
    {desc:'核心功能模块实现',priority:'high',dependsOn:['step-1'],assignedTool:'code-gen',estimatedMin:60},
    {desc:'API接口开发',priority:'high',dependsOn:['step-1'],assignedTool:'api-design',estimatedMin:45},
    {desc:'数据库Schema设计',priority:'high',dependsOn:['step-0'],assignedTool:'db-schema',estimatedMin:30},
    {desc:'单元测试编写',priority:'medium',dependsOn:['step-2','step-3'],assignedTool:'test-gen',estimatedMin:40},
    {desc:'部署配置与CI/CD',priority:'medium',dependsOn:['step-4'],assignedTool:'deploy',estimatedMin:25},
  ]},
  { id:'tmpl-bugfix',   name:'Bug修复流程', category:'dev', tags:['bug','修复'], steps:[
    {desc:'复现Bug与收集错误信息',priority:'critical',dependsOn:[],assignedTool:'debug',estimatedMin:10},
    {desc:'根因分析与定位',priority:'critical',dependsOn:['step-0'],assignedTool:'debug',estimatedMin:20},
    {desc:'编写修复代码',priority:'critical',dependsOn:['step-1'],assignedTool:'code-gen',estimatedMin:30},
    {desc:'回归测试',priority:'high',dependsOn:['step-2'],assignedTool:'test-gen',estimatedMin:15},
    {desc:'代码审查与合并',priority:'medium',dependsOn:['step-3'],assignedTool:'refactor',estimatedMin:10},
  ]},
  { id:'tmpl-api',      name:'API开发', category:'dev', tags:['api','开发'], steps:[
    {desc:'API接口设计',priority:'critical',dependsOn:[],assignedTool:'api-design',estimatedMin:15},
    {desc:'数据模型定义',priority:'critical',dependsOn:['step-0'],assignedTool:'db-schema',estimatedMin:20},
    {desc:'控制器与路由实现',priority:'critical',dependsOn:['step-1'],assignedTool:'code-gen',estimatedMin:45},
    {desc:'请求验证与错误处理',priority:'high',dependsOn:['step-2'],assignedTool:'code-gen',estimatedMin:20},
    {desc:'API测试与文档',priority:'medium',dependsOn:['step-3'],assignedTool:'test-gen',estimatedMin:25},
  ]},
]

function load(): ActivePlan[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
}
function save(plans: ActivePlan[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)) }

let plans = load()
let listeners: (() => void)[] = []

export function useAIPlanner() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function getPlans() { return plans }
  function getTemplates() { return TEMPLATES }

  function createPlan(title: string, goal: string, steps: Omit<TaskStep, 'id' | 'status' | 'result' | 'errorLog' | 'retryCount' | 'actualMin'>[]): ActivePlan {
    const plan: ActivePlan = {
      id: `plan-${Date.now()}`,
      title, goal, status: 'draft', progress: 0, createdAt: Date.now(), completedAt: 0,
      steps: steps.map((s, i) => ({
        ...s, id: `step-${i}`, maxRetries: 3,
        status: 'pending' as const, result: '', errorLog: '',
        retryCount: 0, actualMin: 0,
      })),
    }
    plans.unshift(plan)
    save(plans)
    listeners.forEach(f => f())
    return plan
  }

  function createFromTemplate(templateId: string, goal: string): ActivePlan | null {
    const tmpl = TEMPLATES.find(t => t.id === templateId)
    if (!tmpl) return null
    const plan: ActivePlan = {
      id: `plan-${Date.now()}`,
      title: `${tmpl.name}: ${goal.slice(0, 20)}`,
      goal, status: 'draft', progress: 0, createdAt: Date.now(), completedAt: 0,
      steps: tmpl.steps.map((s, i) => ({
        ...s, id: `step-${i}`,
        status: 'pending' as const, result: '', errorLog: '',
        retryCount: 0, actualMin: 0, maxRetries: 3,
      })),
    }
    plans.unshift(plan)
    save(plans)
    listeners.forEach(f => f())
    return plan
  }

  function getNextStep(planId: string): TaskStep | null {
    const plan = plans.find(p => p.id === planId)
    if (!plan || plan.status !== 'active') return null
    return plan.steps.find(s => {
      if (s.status !== 'pending') return false
      return s.dependsOn.every(depId => {
        const dep = plan.steps.find(ds => ds.id === depId)
        return dep?.status === 'completed'
      })
    }) || null
  }

  function updateStep(planId: string, stepId: string, updates: Partial<TaskStep>) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    const step = plan.steps.find(s => s.id === stepId)
    if (!step) return
    Object.assign(step, updates)
    const completed = plan.steps.filter(s => s.status === 'completed').length
    plan.progress = Math.round((completed / plan.steps.length) * 100)
    if (plan.progress === 100) { plan.status = 'completed'; plan.completedAt = Date.now() }
    save(plans)
    listeners.forEach(f => f())
  }

  function activatePlan(planId: string) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    plan.status = 'active'
    save(plans)
    listeners.forEach(f => f())
  }

  function suggestPlanForGoal(goal: string): PlanTemplate[] {
    return TEMPLATES.filter(t => {
      return t.tags.some(tag => goal.toLowerCase().includes(tag.toLowerCase())) ||
             t.name.includes(goal) || t.category === 'dev'
    })
  }

  function deletePlan(planId: string) {
    plans = plans.filter(p => p.id !== planId)
    save(plans)
    listeners.forEach(f => f())
  }

  function getStats() {
    const active = plans.filter(p => p.status === 'active').length
    const done = plans.filter(p => p.status === 'completed').length
    return { active, done, total: plans.length, templates: TEMPLATES.length }
  }

  return { getPlans, getTemplates, createPlan, createFromTemplate, getNextStep, updateStep, activatePlan, suggestPlanForGoal, deletePlan, getStats, subscribe }
}
