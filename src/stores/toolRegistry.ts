export interface ToolParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'enum'
  required: boolean
  default?: any
  options?: string[]
  desc: string
}

export interface ToolDefinition {
  id: string
  name: string
  desc: string
  icon: string
  category: 'builtin' | 'evolved' | 'community' | 'user'
  params: ToolParam[]
  version: number
  source: string
  usageCount: number
  successRate: number
  prompt: string
}

export interface ToolExecResult {
  success: boolean
  data: string
  error?: string
  duration: number
  toolId: string
  toolName: string
}

const STORAGE_KEY = 'nh_tools'

const BUILTIN_TOOLS: ToolDefinition[] = [
  { id:'code-gen',     name:'代码生成',   desc:'根据描述生成代码', icon:'<>', category:'builtin', params:[
    {name:'language',type:'enum',required:true,options:['ts','py','go','rs','js','java','zig','cpp','css','html'],desc:'编程语言'},
    {name:'description',type:'string',required:true,desc:'功能描述'},
    {name:'framework',type:'string',required:false,desc:'框架(可选)'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'用{language}写代码:{description}。框架:{framework}。只输出代码。' },

  { id:'debug',        name:'Bug修复',    desc:'分析并修复代码错误', icon:'', category:'builtin', params:[
    {name:'code',type:'string',required:true,desc:'有bug的代码'},
    {name:'error',type:'string',required:false,desc:'错误信息'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'分析并修复Bug:\n```\n{code}\n```\n错误信息:{error}\n输出修复后的代码和修复说明。' },

  { id:'explain',      name:'代码解释',   desc:'解释代码逻辑和架构', icon:'', category:'builtin', params:[
    {name:'code',type:'string',required:true,desc:'需要解释的代码'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'详细解释以下代码的逻辑、架构和关键设计:\n```\n{code}\n```' },

  { id:'refactor',     name:'代码重构',   desc:'优化代码结构和可读性', icon:'', category:'builtin', params:[
    {name:'code',type:'string',required:true,desc:'需要重构的代码'},
    {name:'goal',type:'enum',required:false,options:['性能','可读性','可维护性','安全','通用'],desc:'重构目标'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'重构以下代码({goal}优先):\n```\n{code}\n```\n输出重构后的代码和变更说明。' },

  { id:'translate',    name:'翻译引擎',   desc:'多语言互译', icon:'', category:'builtin', params:[
    {name:'text',type:'string',required:true,desc:'要翻译的文本'},
    {name:'target',type:'enum',required:true,options:['中文','英文','日文','韩文','法文','德文','俄文'],desc:'目标语言'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'将以下文本翻译为{target}:\n{text}' },

  { id:'summarize',    name:'文档总结',   desc:'提取核心要点', icon:'', category:'builtin', params:[
    {name:'content',type:'string',required:true,desc:'要总结的文档'},
    {name:'format',type:'enum',required:false,options:['要点','一段话','思维导图'],desc:'输出格式'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'以下文档以{format}格式总结:\n{content}' },

  { id:'api-design',   name:'API设计',    desc:'设计RESTful API接口', icon:'', category:'builtin', params:[
    {name:'resource',type:'string',required:true,desc:'资源名称'},
    {name:'operations',type:'string',required:false,desc:'需要哪些操作'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'为{resource}设计RESTful API({operations}):\n输出:端点、方法、请求体、响应体、错误码。' },

  { id:'db-schema',    name:'数据库设计', desc:'生成数据库Schema', icon:'', category:'builtin', params:[
    {name:'entities',type:'string',required:true,desc:'实体列表及关系'},
    {name:'db',type:'enum',required:false,options:['PostgreSQL','MySQL','SQLite','MongoDB'],desc:'数据库类型'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'为以下实体设计{db} Schema:\n{entities}\n输出:表结构、索引、外键、迁移SQL。' },

  { id:'test-gen',     name:'测试生成',   desc:'自动生成单元测试', icon:'', category:'builtin', params:[
    {name:'code',type:'string',required:true,desc:'需要测试的代码'},
    {name:'framework',type:'enum',required:false,options:['jest','vitest','pytest','go test'],desc:'测试框架'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'为以下代码生成{framework}测试:\n```\n{code}\n```\n覆盖:正常/边界/异常/空值。' },

  { id:'deploy',       name:'部署方案',   desc:'生成部署配置', icon:'', category:'builtin', params:[
    {name:'project',type:'string',required:true,desc:'项目描述'},
  ], version:1, source:'builtin', usageCount:0, successRate:1, prompt:'为{project}生成部署方案:\nDockerfile+docker-compose+CICD+监控+日志。' },
]

function load(): ToolDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : [...BUILTIN_TOOLS]
  } catch { return [...BUILTIN_TOOLS] }
}
function save(tools: ToolDefinition[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tools)) }

let tools = load()
let listeners: (() => void)[] = []

export function useToolRegistry() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function getTools() { return tools }
  function getTool(id: string) { return tools.find(t => t.id === id) }

  function createTool(t: Omit<ToolDefinition, 'version'|'usageCount'|'successRate'>): ToolDefinition {
    const existing = tools.find(x => x.id === t.id)
    if (existing) return existing
    const def: ToolDefinition = { ...t, version: 1, usageCount: 0, successRate: 1 }
    tools.push(def); save(tools); listeners.forEach(f => f())
    return def
  }

  function evolveTool(id: string, updates: Partial<ToolDefinition>): ToolDefinition | null {
    const t = tools.find(x => x.id === id)
    if (!t) return null
    Object.assign(t, updates, { version: t.version + 1, source: 'evolved' })
    save(tools); listeners.forEach(f => f())
    return t
  }

  function suggestTools(task: string): ToolDefinition[] {
    const keywords: Record<string, string[]> = {
      'code-gen': ['写','生成','代码','开发','实现','做','创建','build','create','code'],
      'debug': ['bug','错误','修复','fix','debug','异常','报错','不工作'],
      'refactor': ['重构','优化','改进','改善','clean','refactor','整理'],
      'explain': ['解释','说明','是什么','意思','explain','做什么的'],
      'translate': ['翻译','translate','英文','日文'],
      'summarize': ['总结','摘要','概括','summarize','要点'],
      'api-design': ['api','接口','端点','endpoint','rest'],
      'db-schema': ['数据库','表','schema','字段','索引','database'],
      'test-gen': ['测试','test','单元测试','用例','覆盖'],
      'deploy': ['部署','deploy','docker','上线','发布'],
    }
    const scores: Record<string, number> = {}
    for (const [toolId, kws] of Object.entries(keywords)) {
      let score = 0
      for (const kw of kws) {
        if (task.toLowerCase().includes(kw.toLowerCase())) score += 1
      }
      if (score > 0) scores[toolId] = score
    }
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => tools.find(t => t.id === id)!)
      .filter(Boolean)
  }

  function buildPrompt(tool: ToolDefinition, params: Record<string, string>): string {
    let prompt = tool.prompt
    for (const [k, v] of Object.entries(params)) {
      prompt = prompt.replace(new RegExp(`\\{${k}\\}`, 'g'), v || '')
    }
    tool.usageCount++
    save(tools)
    return prompt
  }

  function recordResult(toolId: string, success: boolean) {
    const t = tools.find(x => x.id === toolId)
    if (!t) return
    const total = t.usageCount || 1
    t.successRate = success ? (t.successRate * (total - 1) + 1) / total : (t.successRate * (total - 1)) / total
    save(tools)
  }

  function getStats() {
    return {
      total: tools.length,
      totalUsage: tools.reduce((s, t) => s + t.usageCount, 0),
      topTools: [...tools].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5).map(t => `${t.name}(${t.usageCount}次)`),
      avgRate: (tools.reduce((s, t) => s + t.successRate, 0) / tools.length * 100).toFixed(0) + '%',
    }
  }

  function reset() { tools = [...BUILTIN_TOOLS]; save(tools); listeners.forEach(f => f()) }

  return { getTools, getTool, createTool, evolveTool, suggestTools, buildPrompt, recordResult, getStats, reset, subscribe }
}
