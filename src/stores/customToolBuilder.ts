import { reactive, computed, ref } from 'vue'

export interface CustomTool {
  id: string
  name: string
  description: string
  category: 'dev' | 'ai' | 'data' | 'security' | 'media' | 'utility'
  icon: string
  source: 'builtin' | 'user' | 'community'
  code: string
  language: 'typescript' | 'python' | 'bash' | 'json'
  type: 'api' | 'script' | 'workflow' | 'plugin' | 'agent'
  inputs: ToolParam[]
  outputs: ToolOutput
  status: 'draft' | 'active' | 'deprecated'
  version: number
  tags: string[]
  usageCount: number
  avgLatency: number
  createdAt: number
  updatedAt: number
}

export interface ToolParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file'
  required: boolean
  default?: any
  description: string
  enum?: string[]
  validation?: string
}

export interface ToolOutput {
  type: 'text' | 'json' | 'file' | 'stream' | 'table' | 'chart'
  description: string
  schema?: Record<string, any>
}

export interface ToolExecution {
  id: string
  toolId: string
  inputs: Record<string, any>
  output: any
  status: 'pending' | 'running' | 'success' | 'error'
  startTime: number
  endTime: number
  error?: string
}

export interface ToolTemplate {
  id: string
  name: string
  description: string
  category: CustomTool['category']
  code: string
  language: CustomTool['language']
  type: CustomTool['type']
  inputs: ToolParam[]
  outputs: ToolOutput
  tags: string[]
}

interface ToolBuilderState {
  tools: CustomTool[]
  executions: ToolExecution[]
  templates: ToolTemplate[]
  selectedToolId: string | null
  editorContent: string
  isValid: boolean
  filter: { category: string; source: string; search: string }
}

const PRESET_TEMPLATES: ToolTemplate[] = [
  {
    id: 'tpl-web-scraper',
    name: 'Web Scraper',
    description: '网页内容抓取工具，支持 CSS selector 和 XPath',
    category: 'data',
    code: `async function scrape(url: string, selector: string): Promise<string[]> {
  const response = await fetch(url)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll(selector)).map(el => el.textContent || '')
}`,
    language: 'typescript',
    type: 'api',
    inputs: [
      { name: 'url', type: 'string', required: true, description: '目标网址' },
      { name: 'selector', type: 'string', required: true, description: 'CSS选择器' }
    ],
    outputs: { type: 'json', description: '抓取结果数组' },
    tags: ['scraping', 'web', 'data']
  },
  {
    id: 'tpl-sql-query',
    name: 'SQL Query Builder',
    description: '结构化 SQL 查询构建器，支持参数化查询和结果映射',
    category: 'data',
    code: `async function query(conn: string, sql: string, params: any[]): Promise<any[]> {
  const db = await openConnection(conn)
  const stmt = db.prepare(sql)
  const results = stmt.all(...params)
  db.close()
  return results
}`,
    language: 'typescript',
    type: 'api',
    inputs: [
      { name: 'conn', type: 'string', required: true, description: '数据库连接字符串' },
      { name: 'sql', type: 'string', required: true, description: 'SQL查询语句' },
      { name: 'params', type: 'array', required: false, description: '查询参数' }
    ],
    outputs: { type: 'json', description: '查询结果集' },
    tags: ['database', 'sql', 'query']
  },
  {
    id: 'tpl-text-analyzer',
    name: 'Text Analyzer',
    description: '文本分析工具：情感分析、关键词提取、实体识别、摘要',
    category: 'ai',
    code: `async function analyze(text: string, mode: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {}
  const words = text.split(/\\s+/)
  result.wordCount = words.length
  result.charCount = text.length
  result.sentenceCount = text.split(/[.!?]+/).length - 1
  result.keywords = words.filter(w => w.length > 3).slice(0, 10)
  result.complexity = words.filter(w => w.length > 6).length / words.length
  return result
}`,
    language: 'typescript',
    type: 'api',
    inputs: [
      { name: 'text', type: 'string', required: true, description: '待分析文本' },
      { name: 'mode', type: 'string', required: false, default: 'full', enum: ['full', 'basic', 'deep'], description: '分析模式' }
    ],
    outputs: { type: 'json', description: '分析结果对象' },
    tags: ['nlp', 'analysis', 'text']
  },
  {
    id: 'tpl-image-compress',
    name: 'Image Compress',
    description: '图片压缩和格式转换工具，支持 WebP/AVIF/JPG/PNG',
    category: 'media',
    code: `async function compress(input: string, quality: number, format: string): Promise<string> {
  const img = await loadImage(input)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/' + format, quality / 100)
}`,
    language: 'typescript',
    type: 'api',
    inputs: [
      { name: 'input', type: 'file', required: true, description: '图片文件' },
      { name: 'quality', type: 'number', required: false, default: 80, description: '输出质量(1-100)' },
      { name: 'format', type: 'string', required: false, default: 'webp', enum: ['webp', 'avif', 'jpeg', 'png'], description: '输出图片格式' }
    ],
    outputs: { type: 'file', description: '压缩后图片' },
    tags: ['image', 'compress', 'media']
  },
  {
    id: 'tpl-api-gateway',
    name: 'API Gateway',
    description: 'API 网关工具：请求路由、限流、认证、日志',
    category: 'dev',
    code: `async function route(request: Request, config: Record<string, any>): Promise<Response> {
  const { upstream, timeout, retries } = config
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout || 30000)
  const resp = await fetch(upstream + new URL(request.url).pathname, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: controller.signal,
  })
  clearTimeout(timer)
  return resp
}`,
    language: 'typescript',
    type: 'api',
    inputs: [
      { name: 'upstream', type: 'string', required: true, description: '上游服务地址' },
      { name: 'timeout', type: 'number', required: false, default: 30000, description: '超时时间(毫秒)' },
      { name: 'retries', type: 'number', required: false, default: 3, description: '重试次数' }
    ],
    outputs: { type: 'stream', description: '代理响应' },
    tags: ['api', 'gateway', 'proxy']
  },
  {
    id: 'tpl-security-audit',
    name: 'Security Audit',
    description: '安全审计工具：代码扫描、依赖检查、CVE查询、OWASP检测',
    category: 'security',
    code: `async function audit(code: string, rules: string[]): Promise<{
  issues: { line: number; severity: string; rule: string; message: string }[]
  score: number
}> {
  const issues: any[] = []
  const patterns: Record<string, RegExp> = {
    'hardcoded-key': /(api[_-]?key|secret|password|token)\\s*=\\s*['"][^'"]+['"]/gi,
    'sql-injection': /['"]\\s*\\+\\s*(req|params|query)/gi,
    'xss': /innerHTML|dangerouslySetInnerHTML|v-html/gi,
    'eval': /\\beval\\s*\\(/gi,
    'unvalidated-input': /req\\.(body|query|params)\\.[\\w.]+(?!.*sanitize|.*validate)/gi,
  }
  for (const [rule, pattern] of Object.entries(patterns)) {
    if (rules.length && !rules.includes(rule)) continue
    let match
    while ((match = pattern.exec(code)) !== null) {
      const line = code.slice(0, match.index).split('\\n').length
      issues.push({ line, severity: rule === 'hardcoded-key' ? 'critical' : 'high', rule, message: \`发现潜在\${rule}风险\` })
    }
  }
  return { issues, score: Math.max(0, 100 - issues.length * 10) }
}`,
    language: 'typescript',
    type: 'script',
    inputs: [
      { name: 'code', type: 'string', required: true, description: '待审计代码' },
      { name: 'rules', type: 'array', required: false, description: '审计规则列表' }
    ],
    outputs: { type: 'json', description: '审计报告' },
    tags: ['security', 'audit', 'scan']
  },
  {
    id: 'tpl-batch-rename',
    name: 'Batch Rename',
    description: '批量文件重命名工具，支持正则替换、模板化命名',
    category: 'utility',
    code: `async function rename(files: string[], pattern: string, replacement: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const regex = new RegExp(pattern, 'gi')
  for (const file of files) {
    const newName = file.replace(regex, replacement)
    if (newName !== file) result[file] = newName
  }
  return result
}`,
    language: 'typescript',
    type: 'script',
    inputs: [
      { name: 'files', type: 'array', required: true, description: '文件名列表' },
      { name: 'pattern', type: 'string', required: true, description: '正则匹配模式' },
      { name: 'replacement', type: 'string', required: true, description: '替换模板' }
    ],
    outputs: { type: 'json', description: '重命名映射' },
    tags: ['files', 'rename', 'batch']
  },
  {
    id: 'tpl-data-visualizer',
    name: 'Data Visualizer',
    description: '数据可视化工具：从 JSON/CSV 生成图表 ECharts 配置',
    category: 'data',
    code: `async function visualize(data: any[], chartType: string, options: Record<string, any>): Promise<Record<string, any>> {
  const labels = data.map(d => d[options.xKey || 'name'])
  const values = data.map(d => d[options.yKey || 'value'])
  return {
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ data: values, type: chartType, smooth: true }],
    tooltip: { trigger: 'axis' },
    title: { text: options.title || '数据图表' }
  }
}`,
    language: 'typescript',
    type: 'api',
    inputs: [
      { name: 'data', type: 'array', required: true, description: '数据数组' },
      { name: 'chartType', type: 'string', required: false, default: 'line', enum: ['line', 'bar', 'pie', 'scatter', 'area'], description: '图表类型' },
      { name: 'options', type: 'object', required: false, description: '图表配置 (xKey, yKey, title)' }
    ],
    outputs: { type: 'chart', description: 'ECharts 配置对象' },
    tags: ['visualization', 'chart', 'data']
  }
]

function genId() {
  return 'tool-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

export function useCustomToolBuilder() {
  const state = reactive<ToolBuilderState>({
    tools: [],
    executions: [],
    templates: PRESET_TEMPLATES,
    selectedToolId: null,
    editorContent: '',
    isValid: false,
    filter: { category: '', source: '', search: '' }
  })

  function getTool(id: string) {
    return state.tools.find(t => t.id === id)
  }

  function createEmpty(): CustomTool {
    return {
      id: genId(),
      name: 'New Tool',
      description: '',
      category: 'utility',
      icon: 'wrench',
      source: 'user',
      code: `// 在这里编写工具逻辑\nexport default async function main(inputs) {\n  return { ok: true }\n}`,
      language: 'typescript',
      type: 'api',
      inputs: [{ name: 'input', type: 'string', required: true, description: '输入参数' }],
      outputs: { type: 'text', description: '处理结果' },
      status: 'draft',
      version: 1,
      tags: [],
      usageCount: 0,
      avgLatency: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  function createFromTemplate(tplId: string): CustomTool | null {
    const tpl = state.templates.find(t => t.id === tplId)
    if (!tpl) return null
    const tool: CustomTool = {
      id: genId(),
      name: tpl.name,
      description: tpl.description,
      category: tpl.category,
      icon: 'code',
      source: 'user',
      code: tpl.code,
      language: tpl.language,
      type: tpl.type,
      inputs: tpl.inputs,
      outputs: tpl.outputs,
      status: 'draft',
      version: 1,
      tags: [...tpl.tags],
      usageCount: 0,
      avgLatency: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    state.tools.push(tool)
    state.selectedToolId = tool.id
    state.editorContent = tool.code
    return tool
  }

  function addTool(tool?: CustomTool) {
    const t = tool || createEmpty()
    state.tools.push(t)
    state.selectedToolId = t.id
    state.editorContent = t.code
    return t
  }

  function updateTool(id: string, updates: Partial<CustomTool>) {
    const idx = state.tools.findIndex(t => t.id === id)
    if (idx === -1) return
    Object.assign(state.tools[idx], updates, { updatedAt: Date.now() })
  }

  function saveCode(id: string, code: string) {
    state.editorContent = code
    updateTool(id, { code })
  }

  function deleteTool(id: string) {
    const idx = state.tools.findIndex(t => t.id === id)
    if (idx === -1) return
    state.tools.splice(idx, 1)
    if (state.selectedToolId === id) {
      state.selectedToolId = state.tools.length > 0 ? state.tools[0].id : null
    }
  }

  function executeTool(toolId: string, inputs: Record<string, any>): ToolExecution {
    const tool = getTool(toolId)
    const exec: ToolExecution = {
      id: genId(),
      toolId,
      inputs,
      output: null,
      status: 'pending',
      startTime: Date.now(),
      endTime: 0
    }
    state.executions.push(exec)

    try {
      exec.status = 'running'
      const fn = new Function('inputs', `
        return (async () => {
          ${tool?.code || 'return {}'}
        })()
      `)
      fn(inputs).then((result: any) => {
        exec.output = result
        exec.status = 'success'
        exec.endTime = Date.now()
        if (tool) {
          tool.usageCount++
          tool.avgLatency = ((tool.avgLatency * (tool.usageCount - 1)) + (exec.endTime - exec.startTime)) / tool.usageCount
        }
      }).catch((err: Error) => {
        exec.output = err.message
        exec.status = 'error'
        exec.endTime = Date.now()
      })
    } catch (err: any) {
      exec.output = err.message
      exec.status = 'error'
      exec.endTime = Date.now()
    }

    return exec
  }

  function getExecution(id: string) {
    return state.executions.find(e => e.id === id)
  }

  function duplicateTool(id: string) {
    const tool = getTool(id)
    if (!tool) return
    const copy = { ...tool, id: genId(), name: tool.name + ' (Copy)', createdAt: Date.now(), updatedAt: Date.now() }
    state.tools.push(copy)
    return copy
  }

  const filteredTools = computed(() => {
    return state.tools.filter(t => {
      if (state.filter.category && t.category !== state.filter.category) return false
      if (state.filter.source && t.source !== state.filter.source) return false
      if (state.filter.search) {
        const s = state.filter.search.toLowerCase()
        return t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) || t.tags.some(tag => tag.includes(s))
      }
      return true
    })
  })

  const filteredTemplates = computed(() => {
    if (!state.filter.search) return state.templates
    const s = state.filter.search.toLowerCase()
    return state.templates.filter(t =>
      t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) || t.tags.some(tag => tag.includes(s))
    )
  })

  const categoryCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const t of state.tools) {
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    return counts
  })

  const stats = computed(() => {
    const total = state.tools.length
    const active = state.tools.filter(t => t.status === 'active').length
    const totalExecutions = state.executions.length
    const successRate = totalExecutions > 0
      ? (state.executions.filter(e => e.status === 'success').length / totalExecutions * 100).toFixed(0) + '%'
      : 'N/A'
    return { total, active, totalExecutions, successRate }
  })

  return {
    state,
    getTool,
    addTool,
    createFromTemplate,
    updateTool,
    saveCode,
    deleteTool,
    executeTool,
    getExecution,
    duplicateTool,
    filteredTools,
    filteredTemplates,
    categoryCounts,
    stats,
  }
}
