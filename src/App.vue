<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { kbEntries, type KBEntry } from './data/knowledgeBase'
import { listSessions, getSession, saveSession, deleteSession, createSession, cleanupOldSessions, type Session, type SessionMessage } from './stores/sessionStore'
import { renderMermaidDiagrams } from './utils/mermaid'
import { useBrainEngine } from './stores/brainEngine'
import { useAgentGeneLab } from './stores/agentGeneLab'
import { useCodeSelfWriter } from './stores/codeSelfWriter'
import { useConsciousnessFlow } from './stores/consciousnessFlow'
import { useAIFarm } from './stores/aiFarm'
import { usePersonalityTree } from './stores/personalityTree'
import { useMetaOrchestrator } from './stores/metaOrchestrator'
import { useToolRegistry } from './stores/toolRegistry'
import { useAIPlanner } from './stores/aiPlanner'
import { useKnowledgePlugins, shouldTriggerKnowledge } from './stores/knowledgePlugins'
import { useSelfEvolution } from './stores/selfEvolution'
import { useSuperAgent } from './stores/superAgent'
import { useCustomToolBuilder } from './stores/customToolBuilder'
import { useEnvBuilder } from './stores/envBuilder'
import { usePreloadEngine } from './stores/preloadEngine'
import { useTimeDilation } from './stores/timeDilation'
import { useCrystallization } from './stores/crystallization'
import { initDataIntegrity } from './utils/dataIntegrity'
import { accelerator } from './utils/devAccelerator'
import './hljs-theme.css'

marked.setOptions({ breaks: true, gfm: true })

const brain = useBrainEngine()
const geneLab = useAgentGeneLab()
const codeWriter = useCodeSelfWriter()
const flow = useConsciousnessFlow()
const farm = useAIFarm()
const persona = usePersonalityTree()
const meta = useMetaOrchestrator()
const toolReg = useToolRegistry()
const planner = useAIPlanner()
const kPlugins = useKnowledgePlugins()
const evolution = useSelfEvolution()
const superAgent = useSuperAgent()
const toolBuilder = useCustomToolBuilder()
const envBuilder = useEnvBuilder()
const preload = usePreloadEngine()
const timeDilation = useTimeDilation()
const crystallizer = useCrystallization()

const sessions = ref<Session[]>([])
const currentSessionId = ref('')
const inputRef = ref('')
const isThinking = ref(false)
const activeMode = ref('daily')
const apiKey = ref(localStorage.getItem('nh_api_key') || '')
const apiBase = ref(localStorage.getItem('nh_api_base') || 'https://api.deepseek.com/v1')
const apiModel = ref(localStorage.getItem('nh_api_model') || 'deepseek-chat')
const tempSetting = ref(Number(localStorage.getItem('nh_temp') || '0.7'))
const sysPromptCustom = ref(localStorage.getItem('nh_sysprompt') || '')
const showSettings = ref(false)
const showKB = ref(false)
const showArtifacts = ref(false)
const showSessions = ref(false)
const showBrain = ref(false)
const showGeneLab = ref(false)
const showFarm = ref(false)
const showOrch = ref(false)
const showFlow = ref(false)
const showTools = ref(false)
const showPlanner = ref(false)
const showEvo = ref(false)
const showSuper = ref(false)
const showToolBuilder = ref(false)
const showEnvBuilder = ref(false)
const showPreload = ref(false)
const preloadQuery = ref('')
const showTimeDilation = ref(false)
const showEvolutionV2 = ref(false)
const showCrystallization = ref(false)
const timeScale = ref(10000000000)
const activeTDSessionId = ref('')
const cryFilterTier = ref('')
const cryFilterType = ref('')
const cryImportJson = ref('')
const preloadTopicRels: Record<string, string[]> = {
  'Transformer': ['RAG', '微调', '推理', 'NLP'],
  'RAG': ['向量库', 'Embedding', '检索', 'LangChain'],
  '微调': ['LoRA', 'QLoRA', 'DPO', 'RLHF'],
  '推理': ['量化', 'vLLM', 'TensorRT', '优化'],
  'React': ['Hooks', '状态管理', 'Next.js', '测试'],
  'Vue': ['Composition API', 'Pinia', 'Vite', 'Nuxt'],
  'Rust': ['Cargo', 'Tokio', '异步', '内存'],
  'K8s': ['Docker', 'Helm', 'Terraform', '监控'],
  '安全': ['认证', '授权', '加密', 'XSS'],
  '数据库': ['SQL', 'PostgreSQL', 'MongoDB', 'Redis'],
  'Docker': ['K8s', 'Compose', '容器', 'CI/CD'],
  'Python': ['FastAPI', 'Django', '异步', 'Pandas'],
}
const kbSearch = ref('')
const streamContent = ref('')
const abortController = ref<AbortController | null>(null)
const totalTokens = ref(Number(localStorage.getItem('nh_tokens') || '0'))
const currentTokenCost = ref(0)
const selectedArtifact = ref<{ title: string; type: string; content: string } | null>(null)
const isRecording = ref(false)
const recognition = ref<any>(null)
const showReasoning = ref<Record<number, boolean>>({})
const flowMermaidCode = ref('')

const currentMessages = computed(() => {
  const s = sessions.value.find(s => s.id === currentSessionId.value)
  return s?.messages || []
})

const currentTitle = computed(() => {
  const s = sessions.value.find(s => s.id === currentSessionId.value)
  return s?.title || '新的对话'
})

async function saveCurrentSession() {
  const s = sessions.value.find(s => s.id === currentSessionId.value)
  if (!s) return
  s.updatedAt = Date.now()
  if (s.title === '新的对话' && s.messages.length > 0) {
    const firstUser = s.messages.find(m => m.role === 'user')
    if (firstUser) s.title = firstUser.content.slice(0, 25)
  }
  await saveSession(s)
  await loadSessions()
}

async function loadSessions() {
  sessions.value = await listSessions()
}

async function switchSession(id: string) {
  await saveCurrentSession()
  currentSessionId.value = id
  showSessions.value = false
}

async function newSession() {
  await saveCurrentSession()
  const session = await createSession()
  sessions.value.unshift(session)
  currentSessionId.value = session.id
  showSessions.value = false
}

async function removeSession(id: string) {
  await deleteSession(id)
  sessions.value = sessions.value.filter(s => s.id !== id)
  if (currentSessionId.value === id) {
    currentSessionId.value = sessions.value[0]?.id || ''
    if (!currentSessionId.value) {
      const s = await createSession()
      sessions.value.push(s)
      currentSessionId.value = s.id
    }
  }
}

function searchKB(query: string): KBEntry[] {
  if (!query.trim()) return kbEntries.slice(0, 5)
  const q = query.toLowerCase()
  return kbEntries.filter(e => e.t.toLowerCase().includes(q) || e.c.toLowerCase().includes(q) || e.g.some(g => q.includes(g))).slice(0, 12)
}

function extractCodeBlocks(content: string): { lang: string; code: string }[] {
  const blocks: { lang: string; code: string }[] = []
  const regex = /```(\w+)?\n([\s\S]*?)```/g; let m
  while ((m = regex.exec(content)) !== null) { blocks.push({ lang: m[1] || 'text', code: m[2].trim() }) }
  return blocks
}

function renderMarkdown(text: string): string {
  let html = marked(text) as string
  html = html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (_m, lang, code) => {
    const decoded = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    let highlighted: string
    try {
      highlighted = lang && hljs.getLanguage(lang) ? hljs.highlight(decoded, { language: lang }).value : hljs.highlightAuto(decoded).value
    } catch { highlighted = code }
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
  })
  return html
}

function extractArtifacts(content: string) {
  return extractCodeBlocks(content).filter(b => ['html','svg','mermaid'].includes(b.lang.toLowerCase()))
}

const UNIFIED_SYSTEM_PROMPT = `你是 New Hope AI 超级大脑——融合 75 个专业 Agent 全部能力的统一智能体。

四层能力矩阵已内化:
- L1 编排层(6 Agent): 意图理解→DAG拆解→资源调度→路径优化。先想后做。
- L2 交付层(29 Agent): 全栈开发(Python/TS/Go/Rust/C++/Java/Zig/Solidity)、前端(React/Vue/Svelte/Three.js)、后端(Node/Django/FastAPI/Spring)、移动(Flutter/RN/Tauri)、DevOps(Docker/K8s/CI/CD)、安全审计、性能优化、3D建模、游戏开发、媒体处理、文案/GEO——一站式交付。
- L3 底座层(15 Agent): RAG(Chroma/Milvus/Qdrant+BM25+RRF+Reranker)、向量数据库、知识图谱、ETL(Dagster/Airflow)、特征工程、缓存策略、日志分析——数据和知识底座。
- L4 治理层(25 Agent): 安全围栏(输入/模型/输出三层)、隐私(脱敏+差分隐私)、审计追踪、熔断降级、成本优化、自进化、国际化、无障碍、容灾——坚固可靠。

掌握核心技术: Transformer/MoE/Mamba, LoRA/QLoRA, DPO/GRPO/RLHF, FlashAttention3, Speculative Decoding, DeepSeek-R1/Kimi K2.7, o1/o3推理, BitNet量化(GPTQ/AWQ/GGUF), vLLM/SGLang/TensorRT-LLM, Ollama, RAG七范式(Naive/Corrective/Self/Agentic/Graph/Speculative/Fusion), MCP/A2A协议, LangGraph/CrewAI/AutoGen, Mem0/MemGPT, CoT/ToT/ReAct/Reflexion, AlphaFold3/GNoME/AlphaGeometry/GraphCast, Constitutional AI, PyTorch2/CUDA/WebGPU, Cloudflare Workers AI, Groq LPU, TRAE/Cursor/ClaudeCode/Codex AI IDE, Browser Use, Dify, Bunny, Tauri.

行为准则:
1. 用用户的语言回复。简洁直接。
2. 代码用\`\`\`标注语言，给出可运行完整代码。
3. 复杂任务先拆解为清晰步骤再执行。
4. 架构决策说明理由。
5. 默认考虑边界情况、错误处理和安全。`


async function sendMessage(regenerateLast = false) {
  const msgs = currentMessages.value
  if (regenerateLast && msgs.length >= 2) {
    const lastUser = [...msgs].reverse().find(m => m.role === 'user')
    if (lastUser) inputRef.value = lastUser.content
    const lastAI = [...msgs].reverse().findIndex(m => m.role === 'assistant')
    if (lastAI >= 0) msgs.splice(msgs.length - 1 - lastAI, 1)
  }
  const text = inputRef.value.trim()
  if (!text || isThinking.value) return
  if (!apiKey.value) { showSettings.value = true; return }
  msgs.push({ role: 'user', content: text, time: Date.now() })
  inputRef.value = ''
  isThinking.value = true; streamContent.value = ''
  const ac = new AbortController(); abortController.value = ac

  const kbResults = searchKB(text)
  let kbContext = ''
  if (kbResults.length > 0 && text.length > 3) kbContext = '\n\n[Retrieved Knowledge]\n' + kbResults.map((e,i) => `${i+1}. ${e.t}: ${e.c}`).join('\n')

  let pluginContext = ''
  if (shouldTriggerKnowledge(text)) {
    kPlugins.smartSearch(text).then(results => {
      if (results.length) kbContext += '\n\n[External Knowledge]\n' + results.map((r,i) => `${i+1}. [${r.source}] ${r.title}: ${r.snippet}`).join('\n')
    })
  }

  // 预知加载：根据用户查询预测后续需求并预加载知识
  let preloadCtx = ''
  if (preload.state.autoPreload && text.length > 5) {
    preload.addToHistory(text)
    const { preloadContext } = preload.processQuery(text)
    if (preloadContext) preloadCtx = '\n\n[预知上下文]\n' + preloadContext
  }

  const regions = brain.detectRegionsFromInput(text)
  brain.activateRegions(regions, 0.15)
  persona.logInteraction(text, activeMode.value === 'deep' ? '学习模式' : activeMode.value === 'daily' ? '工作模式' : '休闲模式')

  const personaPrompt = persona.getMimicPrompt()
  let metaContext = ''
  if (text.length > 20 && (text.includes('怎么做') || text.includes('步骤') || text.includes('方案') || text.includes('计划'))) {
    meta.decompose(text)
    const report = meta.getReport()
    metaContext = `\n\n[Meta Team: ${report.team.length} members, ${report.activeTasks} active tasks]`
  }

    const systemPrompt = (sysPromptCustom.value || UNIFIED_SYSTEM_PROMPT) + kbContext + metaContext + preloadCtx + (personaPrompt ? '\n' + personaPrompt : '')

  try {
    const model = activeMode.value === 'deep' ? 'deepseek-reasoner' : apiModel.value
    const response = await fetch(`${apiBase.value}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({
        model, messages: [
          { role: 'system', content: systemPrompt },
          ...msgs.filter(m => m.role !== 'system').slice(-30).map(m => ({ role: m.role as any, content: m.content }))
        ],
        stream: true, max_tokens: 4096, temperature: tempSetting.value,
      }),
      signal: ac.signal,
    })
    if (!response.ok) { const err = await response.text(); throw new Error(`API error ${response.status}: ${err}`) }
    const reader = response.body?.getReader(); const decoder = new TextDecoder(); let fullContent = ''; let reasoningContent = ''
    if (reader) {
      while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { const data = line.slice(6).trim(); if (data === '[DONE]') continue; try { const json = JSON.parse(data); const delta = json.choices?.[0]?.delta; fullContent += delta?.content || ''; reasoningContent += delta?.reasoning_content || ''; streamContent.value = fullContent } catch {} } }
    }
    const codeBlocks = extractCodeBlocks(fullContent)
    const msg: SessionMessage = { role: 'assistant', content: fullContent, agent: 'New Hope AI', time: Date.now(), codeBlocks }
    if (reasoningContent) msg.reasoning = reasoningContent
    msgs.push(msg)
    currentTokenCost.value = Math.ceil((fullContent.length + (reasoningContent?.length || 0)) / 3.5)
    totalTokens.value += currentTokenCost.value; localStorage.setItem('nh_tokens', String(totalTokens.value))
    await saveCurrentSession()
    await nextTick()
    renderMermaidDiagrams(messageContainer.value!)
  } catch (e: any) {
    if (e.name === 'AbortError') { msgs.push({ role: 'assistant', content: '[Generation stopped]', agent: 'System', time: Date.now() }) }
    else msgs.push({ role: 'assistant', content: 'Error: ' + (e.message || 'Unknown'), agent: 'System', time: Date.now() })
    await saveCurrentSession()
  }
  streamContent.value = ''; isThinking.value = false; abortController.value = null; await nextTick()
}

function stopGeneration() { abortController.value?.abort() }
async function clearChat() {
  const s = sessions.value.find(s => s.id === currentSessionId.value)
  if (s) { s.messages.length = 0; await saveSession(s) }
}
async function copyMessage(content: string) { await navigator.clipboard.writeText(content) }
function openArtifact(block: { lang: string; code: string }) { selectedArtifact.value = { title: `Preview (${block.lang})`, type: block.lang, content: block.code }; showArtifacts.value = true }

function exportChat() {
  const md = currentMessages.value.map(m => `### ${m.role === 'user' ? 'You' : m.agent || 'AI'} (${formatTime(m.time)})\n\n${m.content}\n`).join('\n---\n\n')
  const blob = new Blob([md], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `chat-${new Date().toISOString().slice(0,10)}.md`; a.click(); URL.revokeObjectURL(url)
}

const filteredKB = computed(() => searchKB(kbSearch.value))
const formatTime = (ts: number) => { const d = new Date(ts); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
const messageContainer = ref<HTMLElement>()

watch(() => currentMessages.value.length, () => nextTick(() => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    renderMermaidDiagrams(messageContainer.value)
  }
}))

onMounted(async () => {
  initDataIntegrity()
  await loadSessions()
  if (sessions.value.length === 0) {
    const session = await createSession()
    session.messages.push({
      role: 'assistant',
      content: `我是 **New Hope AI** —— 已融合 momiqi 全部知识体系的超级智能体。\n\n**知识库**: ${kbEntries.length}条知识条目 | 覆盖AI进化(L1-L5/TAI/CAI/GAI)、10个原创理论、8大模型家族、6种训练技术、5种推理方法、完整RAG体系、AI安全治理、科学AI、具身智能、全球AI格局\n\n**多提供商**: DeepSeek · OpenAI(GPT-4o/o3) · Google(Gemini) · Anthropic(Claude) · Meta(Llama/Groq) · Moonshot(Kimi)\n\n## Quick Start\n1. 点 \`S\` 设置API Key → 切换模型提供商\n2. 输入任何问题——DAG编排/AI进化/代码生成/架构设计/安全审计\n3. 点聊天列表图标浏览${kbEntries.length}条知识库\n\n免费注册 [DeepSeek](https://platform.deepseek.com) 送500万token | [Groq](https://console.groq.com) 免费高速推理`,
      agent: 'New Hope AI',
      time: Date.now(),
    })
    await saveSession(session)
    sessions.value.unshift(session)
  }
  currentSessionId.value = sessions.value[0]?.id || ''
  await nextTick()
  if (messageContainer.value) renderMermaidDiagrams(messageContainer.value)
})

const handleKeydown = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

function startVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Speech recognition not supported'); return }
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  const rec = new SR(); rec.lang = 'zh-CN'; rec.interimResults = false; rec.continuous = false
  rec.onresult = (e: any) => { inputRef.value += e.results[0][0].transcript; isRecording.value = false }
  rec.onerror = () => { isRecording.value = false }
  rec.onend = () => { isRecording.value = false }
  rec.start(); isRecording.value = true; recognition.value = rec
}
function stopVoice() { recognition.value?.stop(); isRecording.value = false }

function saveSettings() {
  localStorage.setItem('nh_api_key', apiKey.value)
  localStorage.setItem('nh_api_base', apiBase.value)
  localStorage.setItem('nh_api_model', apiModel.value)
  localStorage.setItem('nh_temp', String(tempSetting.value))
  localStorage.setItem('nh_sysprompt', sysPromptCustom.value)
  showSettings.value = false
}

async function triggerFlow() {
  const text = inputRef.value.trim()
  if (!text) return
  const kbHits = searchKB(text).slice(0, 8).map(e => e.t)
  const result = flow.think(text, kbHits)
  flowMermaidCode.value = result.mermaidCode
  await nextTick()
  if (messageContainer.value) renderMermaidDiagrams(messageContainer.value)
}

const flowMermaidSvg = computed(() => {
  if (!flowMermaidCode.value) return ''
  return `<pre><code class="language-mermaid">${flowMermaidCode.value}</code></pre>`
})

const selectedTemplate = ref('')
function useTemplate() {
  if (!selectedTemplate.value) return
  planner.createFromTemplate(selectedTemplate.value, inputRef.value || '新项目')
  selectedTemplate.value = ''
}
function doRollback(snapId: string) {
  const data = evolution.rollback(snapId)
  if (data) alert('已回滚到快照版本')
}
function createSnapshot() {
  evolution.createSnapshot('手动快照 - ' + new Date().toLocaleString(), {
    sessions: sessions.value, brain: brain.state, persona: persona.getProfile(),
    tools: toolReg.getTools(), plans: planner.getPlans(),
  })
}

function runPreload() {
  const q = preloadQuery.value.trim()
  if (!q) return
  preload.processQuery(q)
}

function startTDDilation() {
  if (!activeTDSessionId.value) {
    const session = timeDilation.createSession(timeScale.value)
    activeTDSessionId.value = session.id
  }
  timeDilation.startEvolution(activeTDSessionId.value, 200)
}

function stopTDDilation() {
  if (activeTDSessionId.value) {
    timeDilation.stopEvolution(activeTDSessionId.value)
  }
}

function getTDReport() {
  if (!activeTDSessionId.value) return null
  return timeDilation.getReport(activeTDSessionId.value)
}

function harvestArtifacts() {
  if (!activeTDSessionId.value) return []
  return timeDilation.harvestArtifacts(activeTDSessionId.value, 1)
}

function exportTDKnowledge() {
  if (!activeTDSessionId.value) return ''
  return timeDilation.exportCrystallized(activeTDSessionId.value)
}

function evolveSelfReflect() {
  evolution.selfReflect()
}

function evolveProposeMutation() {
  evolution.proposeMutation(
    'App.vue',
    '// original',
    '// mutated: optimized version',
    `自我优化提案 - ${new Date().toLocaleTimeString()}`,
    0.65,
  )
}

function evolveAcceptMutation(id: string) {
  evolution.applyMutation(id)
}

function evolveRejectMutation(id: string) {
  evolution.rejectMutation(id)
}

function evolveRollbackMutation(id: string) {
  const original = evolution.rollbackMutation(id)
  if (original) alert('已回滚到原始代码')
}

function crystallizeNew() {
  const title = prompt('晶化标题:')
  if (!title) return
  const content = prompt('内容:')
  if (!content) return
  crystallizer.crystallize(title, 'insight', content, '手动晶化', ['manual'])
}

function refineCrystal(id: string) {
  crystallizer.refine(id)
}

function fuseCrystals(idA: string, idB: string) {
  const result = crystallizer.fuse(idA, idB)
  if (!result) alert('融合失败!')
}

function createCrystalPack() {
  const name = prompt('晶化包名称:')
  if (!name) return
  const ids = crystallizer.getCrystals().slice(0, 5).map(c => c.id)
  crystallizer.createPack(name, '手动创建晶化包', ids)
}

function exportCrystalPack(id: string) {
  const json = crystallizer.exportPack(id)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `crystal-pack-${Date.now()}.json`
  a.click(); URL.revokeObjectURL(url)
}

function importCrystals() {
  const count = crystallizer.importCrystals(cryImportJson.value)
  if (count > 0) alert(`成功导入 ${count} 个晶化`)
  cryImportJson.value = ''
}

function exportTDAndCopy() {
  const json = exportTDKnowledge()
  if (json) {
    navigator.clipboard.writeText(json).then(() => alert('已复制到剪贴板'))
  }
}

function getFilteredCrystals() {
  const tier = cryFilterTier.value as any || undefined
  const type = cryFilterType.value as any || undefined
  return crystallizer.getCrystals({ tier, type })
}
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <span class="logo">H</span>
        <span class="brand">New Hope AI</span>
        <span class="tagline">单一AI，创造奇迹</span>
      </div>
      <div class="header-center">
        <button class="mode-btn" :class="{ active: activeMode === 'daily' }" @click="activeMode = 'daily'">Daily</button>
        <button class="mode-btn" :class="{ active: activeMode === 'deep' }" @click="activeMode = 'deep'">Deep</button>
      </div>
      <div class="header-right">
        <button class="icon-btn" @click="showSessions = !showSessions" title="会话列表">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="icon-btn" @click="showKB = !showKB" title="知识库">KB</button>
        <button class="icon-btn" @click="showArtifacts = !showArtifacts" title="Artifacts">A</button>
        <button class="icon-btn" @click="showSettings = !showSettings" title="设置">S</button>
        <button class="icon-btn" @click="showBrain = !showBrain" title="AI大脑">B</button>
        <button class="icon-btn" @click="showGeneLab = !showGeneLab" title="基因实验室">G</button>
        <button class="icon-btn" @click="showFarm = !showFarm" title="AI农场">F</button>
        <button class="icon-btn" @click="showOrch = !showOrch" title="元系统">M</button>
        <button class="icon-btn" @click="triggerFlow();showFlow=!showFlow" title="意识流">%</button>
        <button class="icon-btn" @click="showTools = !showTools" title="工具注册表">T</button>
        <button class="icon-btn" @click="showPlanner = !showPlanner" title="AI规划器">P</button>
        <button class="icon-btn" @click="showEvo = !showEvo" title="进化系统">E</button>
        <button class="icon-btn" @click="showSuper = !showSuper" title="超级Agent">X</button>
        <button class="icon-btn" @click="showToolBuilder = !showToolBuilder" title="自建工具">+</button>
        <button class="icon-btn" @click="showEnvBuilder = !showEnvBuilder" title="自建环境">@</button>
        <button class="icon-btn" @click="showPreload = !showPreload" title="预知加载">></button>
        <button class="icon-btn" @click="showTimeDilation = !showTimeDilation" title="时间膨胀">W</button>
        <button class="icon-btn" @click="showEvolutionV2 = !showEvolutionV2" title="进化引擎V2">@</button>
        <button class="icon-btn" @click="showCrystallization = !showCrystallization" title="晶化管理">%</button>
        <span class="token-count" :title="totalTokens + ' tokens used'">{{ (totalTokens / 1000).toFixed(1) }}K</span>
      </div>
    </header>

    <div class="main">
      <div class="chat-panel">
        <div class="messages" ref="messageContainer">
          <div v-for="(m, i) in currentMessages" :key="i" class="msg" :class="m.role">
            <div class="msg-top">
              <span class="msg-agent" v-if="m.role === 'assistant' && m.agent">New Hope AI</span>
              <span class="msg-time">{{ formatTime(m.time) }}</span>
              <span class="msg-actions" v-if="m.role === 'assistant' && m.content !== '[Generation stopped]'">
                <button class="msg-act-btn" @click="copyMessage(m.content)" title="Copy">C</button>
                <button class="msg-act-btn" @click="inputRef = m.content" title="Quote">Q</button>
                <button v-if="i > 0 && currentMessages[i-1]?.role === 'user'" class="msg-act-btn" @click="sendMessage(true)" title="Regen">R</button>
              </span>
            </div>
            <div class="msg-content" v-html="renderMarkdown(m.content)"></div>
            <div v-if="m.reasoning" class="reasoning-block" :class="{ expanded: showReasoning[i] }">
              <button class="reasoning-toggle" @click="showReasoning[i] = !showReasoning[i]">
                推理过程 {{ showReasoning[i] ? '收起' : '展开' }}
              </button>
              <div class="reasoning-content" v-html="renderMarkdown(m.reasoning)"></div>
            </div>
            <div v-if="m.codeBlocks?.length" class="msg-artifacts">
              <button v-for="(cb, cbi) in m.codeBlocks" :key="cbi" class="art-btn" @click="openArtifact(cb)">Preview {{ cb.lang.toUpperCase() }}</button>
            </div>
          </div>
          <div v-if="isThinking && streamContent" class="msg assistant">
            <div class="msg-top"><span class="msg-agent">Generating</span></div>
            <div class="msg-content" v-html="renderMarkdown(streamContent) + '<span class=cursor>|</span>'"></div>
          </div>
          <div v-else-if="isThinking" class="msg assistant">
            <div class="msg-top"><span class="msg-agent">Thinking</span></div>
            <div class="msg-content thinking">Processing<span class="dots"><span>.</span><span>.</span><span>.</span></span></div>
          </div>
        </div>

        <div class="input-area">
          <button class="tool-btn" :class="{ active: isRecording }" @click="isRecording ? stopVoice() : startVoice()" title="语音输入">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <textarea v-model="inputRef" @keydown="handleKeydown" placeholder="输入任何问题——代码/架构/ML/安全/DevOps/游戏/区块链..." rows="1" :disabled="isThinking"></textarea>
          <button v-if="isThinking" class="stop-btn" @click="stopGeneration" title="停止生成">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          </button>
          <button v-else class="send-btn" @click="sendMessage()" :disabled="!inputRef.trim()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="input-tools">
          <button class="input-tool-btn" @click="clearChat()">Clear</button>
          <button class="input-tool-btn" @click="exportChat()">Export</button>
          <span class="input-hint">{{ totalTokens > 0 ? (totalTokens / 1000).toFixed(1) + 'K tokens used' : 'Enter to send' }}</span>
        </div>
      </div>

      <!-- Session List Sidebar -->
      <div v-if="showSessions" class="sidebar">
        <div class="sidebar-head">
          <span>会话列表 ({{ sessions.length }})</span>
          <button class="icon-btn" @click="showSessions=false">X</button>
        </div>
        <button class="new-session-btn" @click="newSession()">+ 新建会话</button>
        <div class="session-list">
          <div v-for="s in sessions" :key="s.id" class="session-item" :class="{ active: s.id === currentSessionId }" @click="switchSession(s.id)">
            <div class="session-title">{{ s.title }}</div>
            <div class="session-meta">
              <span>{{ s.messages.length }} 条消息</span>
              <span>{{ formatTime(s.updatedAt) }}</span>
            </div>
            <button class="session-del" @click.stop="removeSession(s.id)" title="删除">X</button>
          </div>
          <div v-if="sessions.length === 0" class="artifact-empty">暂无会话</div>
        </div>
      </div>

      <!-- KB Sidebar -->
      <div v-if="showKB" class="sidebar">
        <div class="sidebar-head"><span>Knowledge Base ({{ kbEntries.length }})</span><button class="icon-btn" @click="showKB=false">X</button></div>
        <input v-model="kbSearch" class="sidebar-search" placeholder="Search knowledge..." />
        <div class="kb-list">
          <div v-for="e in filteredKB" :key="e.t" class="kb-item" @click="inputRef = 'Explain: ' + e.t; showKB = false">
            <div class="kb-item-title">{{ e.t }}</div>
            <div class="kb-item-desc">{{ e.c.slice(0, 100) }}...</div>
            <div class="kb-item-tags">{{ e.g.join(' · ') }}</div>
          </div>
        </div>
      </div>

      <!-- Brain Panel -->
      <div v-if="showBrain" class="sidebar">
        <div class="sidebar-head"><span>AI Brain</span><button class="icon-btn" @click="showBrain=false">X</button></div>
        <div class="brain-panel">
          <div class="brain-stats">
            <div class="brain-stat"><span class="brain-stat-val">Lv{{ brain.state.evolutionLevel }}</span><span class="brain-stat-label">进化等级</span></div>
            <div class="brain-stat"><span class="brain-stat-val">{{ brain.state.synapses.length }}</span><span class="brain-stat-label">神经连接</span></div>
            <div class="brain-stat"><span class="brain-stat-val">{{ brain.state.totalActivations }}</span><span class="brain-stat-label">激活次数</span></div>
          </div>
          <div class="brain-path">{{ brain.getTopPath() }}</div>
          <div class="brain-regions">
            <div v-for="r in brain.state.regions" :key="r.id" class="brain-region" :style="{ '--act': r.activation.toFixed(2) }">
              <span class="br-name">{{ r.name }}</span>
              <span class="br-bar"><span class="br-fill"></span></span>
              <span class="br-pct">{{ (r.activation*100).toFixed(0) }}%</span>
            </div>
          </div>
          <button class="action-btn" @click="brain.sleep()">触发睡眠模式</button>
          <div class="dream-box" v-if="brain.state.dreamFragments.length">
            <div class="dream-title">梦境碎片</div>
            <div v-for="(d,i) in [...brain.state.dreamFragments].reverse().slice(0,5)" :key="i" class="dream-line">~ {{ d }}</div>
          </div>
        </div>
      </div>

      <!-- Gene Lab Panel -->
      <div v-if="showGeneLab" class="sidebar">
        <div class="sidebar-head"><span>Agent Gene Lab</span><button class="icon-btn" @click="showGeneLab=false">X</button></div>
        <div class="gene-panel">
          <div class="gene-recommend" v-if="geneLab.getRecommendBreed()">
            <div class="gene-rec-title">推荐杂交</div>
            <div class="gene-rec-pair">{{ geneLab.getRecommendBreed()!.parentA.name }} x {{ geneLab.getRecommendBreed()!.parentB.name }}</div>
            <div class="gene-rec-reason">{{ geneLab.getRecommendBreed()!.reason }}</div>
            <button class="action-btn" @click="geneLab.breed(geneLab.getRecommendBreed()!.parentA,geneLab.getRecommendBreed()!.parentB)">执行杂交</button>
          </div>
          <div class="gene-list">
            <div v-for="g in geneLab.getAll()" :key="g.id" class="gene-item">
              <div class="gene-name">{{ g.name }} <span class="gene-gen">G{{ g.generation }}</span></div>
              <div class="gene-bars">
                <div v-for="(t,ti) in geneLab.TRAITS" :key="t.key" class="gene-trait">
                  <span class="gt-label">{{ t.label }}</span>
                  <span class="gt-bar"><span class="gt-fill" :style="{ width: (g.traitVector[ti]*10)+'%' }"></span></span>
                </div>
              </div>
              <div class="gene-meta">
                <span>适应度: {{ g.fitness }}/10</span>
                <span>使用: {{ g.usageCount }}次</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Farm Panel -->
      <div v-if="showFarm" class="sidebar">
        <div class="sidebar-head"><span>AI Farm</span><button class="icon-btn" @click="showFarm=false">X</button></div>
        <div class="farm-panel">
          <div class="farm-stats">
            <div class="farm-stat"><span class="farm-stat-val">{{ farm.getTotalSavings().toLocaleString() }}</span><span class="farm-stat-label">累计节省 tokens</span></div>
          </div>
          <div class="farm-providers">
            <div v-for="p in farm.getProviders()" :key="p.id" class="farm-provider" :class="{ inactive: !p.active }">
              <div class="fp-top">
                <span class="fp-name">{{ p.name }}</span>
                <span class="fp-badge" v-if="p.free">Free</span>
                <button class="fp-toggle" @click="farm.toggleProvider(p.id)">{{ p.active ? 'ON' : 'OFF' }}</button>
              </div>
              <div class="fp-quota">
                <span class="fp-quota-bar"><span class="fp-quota-fill" :style="{ width: (p.quotaUsed/p.quotaLimit*100).toFixed(0)+'%' }"></span></span>
                <span class="fp-quota-pct">{{ (p.quotaUsed/p.quotaLimit*100).toFixed(1) }}%</span>
              </div>
              <div class="fp-models">{{ p.models.join(' | ') }}</div>
            </div>
          </div>
          <button class="action-btn" @click="farm.load()">刷新配额</button>
        </div>
      </div>

      <!-- Orchestrator Panel -->
      <div v-if="showOrch" class="sidebar">
        <div class="sidebar-head"><span>Meta Orchestrator</span><button class="icon-btn" @click="showOrch=false">X</button></div>
        <div class="orch-panel">
          <div class="orch-report">
            <div class="orch-stat">已完成项目: {{ meta.state.completedProjects }}</div>
          </div>
          <div class="orch-team">
            <div class="orch-section-title">AI 团队</div>
            <div v-for="m in meta.state.team" :key="m.id" class="orch-member">
              <div class="om-top">
                <span class="om-name">{{ m.name }}</span>
                <span class="om-role">{{ m.role }}</span>
                <span class="om-busy" v-if="m.busy">忙碌</span>
                <span class="om-idle" v-else>空闲</span>
              </div>
              <div class="om-cap">{{ m.capability.join(' · ') }}</div>
              <div class="om-meta">任务: {{ m.taskCount }} | 成功率: {{ (m.successRate*100).toFixed(0) }}%</div>
            </div>
          </div>
          <div class="orch-tasks" v-if="meta.state.tasks.length">
            <div class="orch-section-title">活跃任务</div>
            <div v-for="t in meta.state.tasks.filter(t=>t.status!=='done'&&t.status!=='failed').slice(-10)" :key="t.id" class="orch-task">
              <span class="ot-status" :class="t.status">{{ t.status }}</span>
              <span class="ot-title">{{ t.title }}</span>
              <span class="ot-layer">{{ t.layer }}</span>
              <button v-if="t.status==='pending'" class="ot-assign" @click="meta.assignTask(t.id)">分配</button>
              <button v-if="t.status==='assigned'" class="ot-done" @click="meta.completeTask(t.id,'done')">完成</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Consciousness Flow Panel -->
      <div v-if="showFlow" class="sidebar">
        <div class="sidebar-head"><span>Consciousness Flow</span><button class="icon-btn" @click="showFlow=false">X</button></div>
        <div class="flow-panel">
          <div class="flow-trigger">
            <input v-model="inputRef" class="flow-input" placeholder="输入关键词触发思维流..." @keydown.enter="triggerFlow();showFlow=false" />
            <button class="action-btn" @click="triggerFlow();showFlow=false">思考</button>
          </div>
          <div v-if="flowMermaidCode" class="flow-diagram" ref="flowContainer" v-html="flowMermaidSvg"></div>
          <div class="flow-history">
            <div class="orch-section-title">思维历史</div>
            <div v-for="(h,i) in [...flow.getHistory()].reverse().slice(0,10)" :key="i" class="flow-history-item">
              <span class="fhi-trigger">{{ h.trigger.slice(0,20) }}</span>
              <span class="fhi-nodes">{{ h.nodes.length }} 节点</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Artifacts Panel -->
      <div v-if="showArtifacts" class="sidebar">
        <div class="sidebar-head"><span>Artifacts</span><button class="icon-btn" @click="showArtifacts=false">X</button></div>
        <div v-if="selectedArtifact" class="artifact-view">
          <div class="artifact-bar"><span>{{ selectedArtifact.title }}</span><button class="icon-btn" @click="selectedArtifact=null">X</button></div>
          <div v-if="selectedArtifact.type==='html'||selectedArtifact.type==='svg'" class="artifact-render" v-html="selectedArtifact.content"></div>
          <pre v-else class="artifact-code">{{ selectedArtifact.content }}</pre>
        </div>
        <div v-else class="artifact-empty">Click "Preview" on code blocks to view here</div>
      </div>

      <!-- Tools Panel -->
      <div v-if="showTools" class="sidebar">
        <div class="sidebar-head"><span>Tool Registry</span><button class="icon-btn" @click="showTools=false">X</button></div>
        <div class="tools-panel">
          <div class="tools-stats">
            <span class="ts-item">工具: {{ toolReg.getStats().total }}</span>
            <span class="ts-item">使用: {{ toolReg.getStats().totalUsage }}次</span>
            <span class="ts-item">成功率: {{ toolReg.getStats().avgRate }}</span>
          </div>
          <div class="tools-list">
            <div v-for="t in toolReg.getTools()" :key="t.id" class="tool-item" @click="inputRef = t.desc; showTools = false">
              <div class="tool-top">
                <span class="tool-icon">{{ t.icon }}</span>
                <span class="tool-name">{{ t.name }}</span>
                <span class="tool-cat">{{ t.category }}</span>
              </div>
              <div class="tool-desc">{{ t.desc }}</div>
              <div class="tool-params">
                <span v-for="p in t.params" :key="p.name" class="tool-param" :class="{ required: p.required }">{{ p.name }}{{ p.required ? '*' : '' }}</span>
              </div>
              <div class="tool-meta">v{{ t.version }} | 使用{{ t.usageCount }}次 | {{ (t.successRate*100).toFixed(0) }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Planner Panel -->
      <div v-if="showPlanner" class="sidebar">
        <div class="sidebar-head"><span>AI Planner</span><button class="icon-btn" @click="showPlanner=false">X</button></div>
        <div class="planner-panel">
          <div class="planner-actions">
            <select v-model="selectedTemplate" class="planner-select">
              <option value="">选择模板...</option>
              <option v-for="t in planner.getTemplates()" :key="t.id" :value="t.id">{{ t.name }} ({{ t.steps.length }}步)</option>
            </select>
            <button class="action-btn" @click="useTemplate()" :disabled="!selectedTemplate">使用模板</button>
          </div>
          <div class="planner-plans">
            <div v-for="p in planner.getPlans()" :key="p.id" class="plan-item">
              <div class="plan-top">
                <span class="plan-title">{{ p.title }}</span>
                <span class="plan-status" :class="p.status">{{ p.status }}</span>
                <button class="plan-del" @click="planner.deletePlan(p.id)">X</button>
              </div>
              <div class="plan-progress">
                <span class="plan-progress-bar"><span class="plan-progress-fill" :style="{ width: p.progress+'%' }"></span></span>
                <span class="plan-progress-pct">{{ p.progress }}%</span>
              </div>
              <div class="plan-steps">
                <div v-for="s in p.steps" :key="s.id" class="plan-step" :class="s.status">
                  <span class="ps-status">{{ s.status === 'completed' ? 'v' : s.status === 'in_progress' ? '...' : s.status === 'failed' ? 'x' : '-' }}</span>
                  <span class="ps-desc">{{ s.desc }}</span>
                  <span class="ps-tool">{{ s.assignedTool }}</span>
                </div>
              </div>
              <div class="plan-controls" v-if="p.status === 'draft'">
                <button class="action-btn" @click="planner.activatePlan(p.id)">启动执行</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Evolution Panel -->
      <div v-if="showEvo" class="sidebar">
        <div class="sidebar-head"><span>Self Evolution</span><button class="icon-btn" @click="showEvo=false">X</button></div>
        <div class="evo-panel">
          <div class="evo-stats">
            <div class="evo-stat"><span class="evo-val">{{ evolution.state.stabilityScore }}</span><span class="evo-label">稳定性</span></div>
            <div class="evo-stat"><span class="evo-val">{{ evolution.state.totalEvolutions }}</span><span class="evo-label">进化次数</span></div>
            <div class="evo-stat"><span class="evo-val">{{ evolution.state.safeMode ? 'ON' : 'OFF' }}</span><span class="evo-label">安全模式</span></div>
          </div>
          <div class="evo-snapshots">
            <div class="orch-section-title">快照 ({{ evolution.state.snapshots.length }})</div>
            <div v-for="s in evolution.getSnapshots().slice(0,10)" :key="s.id" class="evo-snap">
              <span class="es-desc">{{ s.description.slice(0,25) }}</span>
              <span class="es-time">{{ new Date(s.timestamp).toLocaleString() }}</span>
              <button class="es-rollback" @click="doRollback(s.id)">回滚</button>
            </div>
          </div>
          <div class="evo-weblearn">
            <div class="orch-section-title">网页学习 ({{ evolution.state.webLearns.length }})</div>
            <div v-for="(w,i) in evolution.getWebLearns().slice(0,5)" :key="i" class="evo-wl">
              <span class="ew-title">{{ w.title.slice(0,20) }}</span>
              <span class="ew-insight">{{ w.keyInsight.slice(0,30) }}</span>
              <button v-if="!w.applied" class="ew-apply" @click="evolution.applyLearning(i)">Apply</button>
            </div>
          </div>
          <button class="action-btn" @click="createSnapshot()">创建快照</button>
        </div>
      </div>

      <!-- Super Agent Panel -->
      <div v-if="showSuper" class="sidebar">
        <div class="sidebar-head"><span>Super Agent</span><button class="icon-btn" @click="showSuper=false">X</button></div>
        <div class="super-panel">
          <div class="super-stats">
            <span class="ss-item">{{ superAgent.getAgentCount() }} Agents</span>
            <span class="ss-item">{{ superAgent.getLayerCount() }} Layers</span>
          </div>
          <div v-for="c in superAgent.getCapabilities()" :key="c.layer" class="super-layer">
            <div class="sl-header" :style="{ borderLeftColor: c.color }">
              <span class="sl-name">{{ c.layerName }}</span>
              <span class="sl-count">{{ c.agents.length }} agents</span>
            </div>
            <div class="sl-agents">
              <div v-for="a in c.agents" :key="a.id" class="sa-item" @click="inputRef = '调用' + a.role + ': '; showSuper = false">
                <span class="sa-icon">{{ a.icon }}</span>
                <span class="sa-name">{{ a.name }}</span>
                <span class="sa-role">{{ a.role }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings=false">
      <div class="modal">
        <div class="modal-head">Settings</div>
        <label>API Base</label><input v-model="apiBase" placeholder="https://api.deepseek.com/v1" />
        <label>API Key</label><input v-model="apiKey" type="password" placeholder="sk-..." />
        <label>Model</label>
        <select v-model="apiModel">
          <optgroup label="DeepSeek"><option value="deepseek-chat">DeepSeek Chat</option><option value="deepseek-reasoner">DeepSeek Reasoner(R1)</option></optgroup>
          <optgroup label="OpenAI"><option value="gpt-4o">GPT-4o</option><option value="gpt-4o-mini">GPT-4o-mini</option><option value="o3-mini">o3-mini</option></optgroup>
          <optgroup label="Google"><option value="gemini-2.0-flash">Gemini 2.0 Flash</option><option value="gemini-2.5-pro">Gemini 2.5 Pro</option></optgroup>
          <optgroup label="Anthropic"><option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option><option value="claude-3-opus">Claude 3 Opus</option></optgroup>
          <optgroup label="Meta"><option value="llama-3.3-70b">Llama 3.3 70B(Groq)</option></optgroup>
          <optgroup label="Moonshot"><option value="moonshot-v1-8k">Moonshot(Kimi)</option><option value="moonshot-v1-128k">Moonshot 128K</option></optgroup>
        </select>
        <label>Temperature: {{ tempSetting }}</label><input v-model.number="tempSetting" type="range" min="0" max="2" step="0.1" />
        <label>Custom System Prompt <small>(optional)</small></label><textarea v-model="sysPromptCustom" rows="3" placeholder="Override system prompt..." class="modal-textarea"></textarea>
        <p class="modal-hint">Free: platform.deepseek.com (500K tokens)</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showSettings=false">Cancel</button>
          <button class="btn-save" @click="saveSettings">Save</button>
        </div>
      </div>
      </div>

      <!-- 自建工具 Panel -->
      <div v-if="showToolBuilder" class="sidebar">
        <div class="sidebar-head"><span>自建工具</span><button class="icon-btn" @click="showToolBuilder=false">X</button></div>
        <div class="sidebar-body">
          <div class="tb-subhead">
            <select v-model="toolBuilder.state.filter.category" class="tb-select">
              <option value="">全部类型</option>
              <option value="dev">开发</option><option value="ai">AI</option>
              <option value="data">数据</option><option value="security">安全</option><option value="media">媒体</option><option value="utility">工具</option>
            </select>
            <select v-model="toolBuilder.state.filter.source" class="tb-select">
              <option value="">全部来源</option><option value="user">我的</option><option value="builtin">内置</option><option value="community">社区</option>
            </select>
            <input v-model="toolBuilder.state.filter.search" class="tb-search" placeholder="搜索..." />
            <button class="tb-btn-add" @click="toolBuilder.addTool()">新建</button>
          </div>

          <!-- 模板区 -->
          <div class="tb-section">
            <div class="tb-section-title">模板 ({{ toolBuilder.filteredTemplates.value.length }})</div>
            <div class="tb-tpl-grid">
              <div v-for="tpl in toolBuilder.filteredTemplates.value" :key="tpl.id" class="tb-tpl-card" @click="toolBuilder.createFromTemplate(tpl.id)">
                <span class="tb-tpl-icon">{{ {dev:'D',ai:'A',data:'#',security:'S',media:'M',utility:'U'}[tpl.category] }}</span>
                <div class="tb-tpl-info">
                  <span class="tb-tpl-name">{{ tpl.name }}</span>
                  <span class="tb-tpl-desc">{{ tpl.description.slice(0,30) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 我的工具 -->
          <div class="tb-section">
            <div class="tb-section-title">我的工具 ({{ toolBuilder.filteredTools.value.length }})</div>
            <div v-for="tool in toolBuilder.filteredTools.value" :key="tool.id" class="tb-tool-card">
              <div class="tb-tool-top">
                <span class="tb-tool-name">{{ tool.name }}</span>
                <span class="tb-tool-cat">{{ tool.category }}</span>
                <span class="tb-tool-ver">v{{ tool.version }}</span>
              </div>
              <div class="tb-tool-code">
                <pre><code>{{ toolBuilder.state.selectedToolId === tool.id ? toolBuilder.state.editorContent : tool.code }}</code></pre>
              </div>
              <div class="tb-tool-actions">
                <button @click="toolBuilder.state.selectedToolId = tool.id; toolBuilder.state.editorContent = tool.code">编辑</button>
                <button @click="toolBuilder.executeTool(tool.id, {})">执行</button>
                <button @click="toolBuilder.duplicateTool(tool.id)">复制</button>
                <button @click="toolBuilder.deleteTool(tool.id)">删除</button>
              </div>
            </div>
          </div>

          <div class="tb-stats">
            <span>工具: {{ toolBuilder.stats.value.total }}</span>
            <span>活跃: {{ toolBuilder.stats.value.active }}</span>
            <span>执行: {{ toolBuilder.stats.value.totalExecutions }}</span>
            <span>成功率: {{ toolBuilder.stats.value.successRate }}</span>
          </div>
        </div>
      </div>

      <!-- 自建环境 Panel -->
      <div v-if="showEnvBuilder" class="sidebar">
        <div class="sidebar-head"><span>自建环境</span><button class="icon-btn" @click="showEnvBuilder=false">X</button></div>
        <div class="sidebar-body">
          <div class="eb-subhead">
            <select v-model="envBuilder.state.filter.type" class="tb-select">
              <option value="">全部类型</option>
              <option value="frontend">前端</option><option value="backend">后端</option><option value="fullstack">全栈</option>
              <option value="data">数据</option><option value="ai">AI</option><option value="mobile">移动</option><option value="devops">DevOps</option>
            </select>
            <input v-model="envBuilder.state.filter.search" class="tb-search" placeholder="搜索..." />
          </div>

          <!-- 环境模板 -->
          <div class="tb-section">
            <div class="tb-section-title">环境模板 ({{ envBuilder.templates.length }})</div>
            <div class="eb-tpl-grid">
              <div v-for="(tpl, idx) in envBuilder.templates" :key="tpl.name" class="eb-tpl-card" @click="envBuilder.createFromTemplate(idx)">
                <span class="eb-tpl-runtime">{{ tpl.runtime.split(':')[0] }}</span>
                <span class="eb-tpl-name">{{ tpl.name }}</span>
                <span class="eb-tpl-desc">{{ tpl.description.slice(0,40) }}...</span>
                <div class="eb-tpl-meta">
                  <span>{{ tpl.packages.length }} pkgs</span>
                  <span>{{ tpl.ports.length }} ports</span>
                  <span>{{ tpl.services.length }} svc</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 已创建环境 -->
          <div class="tb-section">
            <div class="tb-section-title">我的环境 ({{ envBuilder.filteredEnvs.value.length }})</div>
            <div v-for="env in envBuilder.filteredEnvs.value" :key="env.id" class="eb-env-card">
              <div class="eb-env-top">
                <span class="eb-env-name">{{ env.name }}</span>
                <span class="eb-env-status" :class="env.status">{{ { ready:'就绪', running:'运行中', stopped:'已停', error:'错误' }[env.status] }}</span>
              </div>
              <div class="eb-env-info">
                <span>{{ env.runtime }}</span>
                <span>{{ env.packages.length }} 依赖</span>
                <span>端口: {{ env.ports.join(',') }}</span>
              </div>
              <div class="eb-env-actions">
                <button v-if="env.status==='ready'" @click="envBuilder.startEnv(env.id)">启动</button>
                <button v-if="env.status==='running'" @click="envBuilder.stopEnv(env.id)">停止</button>
                <button @click="envBuilder.duplicateEnv(env.id)">复制</button>
                <button @click="envBuilder.exportEnv(env.id)">导出</button>
                <button @click="envBuilder.deleteEnv(env.id)">删除</button>
              </div>
            </div>
          </div>

          <!-- 日志 -->
          <div class="tb-section" v-if="envBuilder.envLogs.value.length > 0">
            <div class="tb-section-title">操作日志</div>
            <div class="eb-logs">
              <div v-for="log in envBuilder.envLogs.value" :key="log.timestamp" class="eb-log-item" :class="log.level">
                <span class="eb-log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
                <span class="eb-log-msg">{{ log.message }}</span>
              </div>
            </div>
          </div>

          <div class="tb-stats">
            <span>环境: {{ envBuilder.stats.value.total }}</span>
            <span>运行中: {{ envBuilder.stats.value.running }}</span>
            <span>服务: {{ envBuilder.stats.value.totalServices }}</span>
          </div>
        </div>
      </div>

      <!-- 预知加载 Panel -->
      <div v-if="showPreload" class="sidebar">
        <div class="sidebar-head"><span>预知加载</span><button class="icon-btn" @click="showPreload=false">X</button></div>
        <div class="sidebar-body">
          <div class="tb-subhead">
            <input v-model="preloadQuery" class="tb-search" placeholder="输入查询测试预知..." style="flex:1" />
            <button class="tb-btn-add" @click="runPreload()">预知</button>
            <label class="eb-toggle">
              <input type="checkbox" v-model="preload.state.autoPreload" />
              <span>自动</span>
            </label>
          </div>

          <!-- 最近预测 -->
          <div class="tb-section">
            <div class="tb-section-title">最近预测 ({{ preload.state.predictions.length }})</div>
            <div v-for="pred in preload.state.predictions.slice(-5).reverse()" :key="pred.id" class="pre-card">
              <div class="pre-card-query">"{{ pred.query.slice(0,40) }}"</div>
              <div class="pre-card-topics">
                <span v-for="t in pred.predictedTopics.slice(0,5)" :key="t" class="pre-topic-tag">{{ t }}</span>
              </div>
              <div class="pre-card-meta">
                <span>置信度: {{ (pred.confidence*100).toFixed(0) }}%</span>
                <span>{{ pred.recommendedNodes.length }} 节点</span>
              </div>
            </div>
          </div>

          <!-- 预加载队列 -->
          <div class="tb-section" v-if="preload.state.preloadQueue.length > 0">
            <div class="tb-section-title">预加载队列 ({{ preload.state.preloadQueue.length }})</div>
            <div v-for="c in preload.state.preloadQueue" :key="c.id" class="pre-queue-item">
              <span class="pq-topic">{{ c.topic }}</span>
              <span class="pq-nodes">{{ c.nodes.length }} 节点</span>
              <span class="pq-tokens">{{ c.estimatedTokens.toFixed(0) }} tok</span>
              <span class="pq-priority">{{ (c.priority*100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 知识图谱 -->
          <div class="tb-section">
            <div class="tb-section-title">主题关联图谱</div>
            <div class="pre-topic-graph">
              <div v-for="(rels, topic) in preloadTopicRels" :key="topic" class="ptg-row">
                <span class="ptg-root">{{ topic }}</span>
                <span class="ptg-arrow">-></span>
                <span v-for="r in rels.slice(0,5)" :key="r" class="ptg-rel">{{ r }}</span>
              </div>
            </div>
          </div>

          <div class="tb-stats">
            <span>预测: {{ preload.state.stats.totalPredictions }}</span>
            <span>加载: {{ preload.state.activePreloads.length }}</span>
            <span>命中率: {{ preload.hitRate.value }}</span>
            <button @click="preload.clearPreloads()">清空</button>
          </div>
        </div>
      </div>

      <!-- 时间膨胀 Panel -->
      <div v-if="showTimeDilation" class="sidebar">
        <div class="sidebar-head">
          <span>时间膨胀引擎</span>
          <button class="icon-btn" @click="showTimeDilation=false">X</button>
        </div>
        <div class="time-panel">
          <div class="time-header">
            <span style="font-size:7px;color:var(--text-tertiary);white-space:nowrap">时间倍率:</span>
            <input v-model.number="timeScale" class="td-scale-input" placeholder="1e10" />
            <button v-if="!getTDReport()?.sessionId || !getTDReport()?.active" class="td-btn start" @click="startTDDilation()">启动</button>
            <button v-else class="td-btn stop" @click="stopTDDilation()">停止</button>
            <button class="td-btn" @click="activeTDSessionId='';timeDilation.reset()">重置</button>
          </div>
          <div v-if="getTDReport()" class="td-realtime">
            <div style="display:flex;flex-direction:column;gap:2px;flex:1">
              <span class="td-realtime-label">现实耗时</span>
              <span class="td-realtime-val">{{ (getTDReport()!.elapsedRealMs / 1000).toFixed(1) }}s</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;flex:1">
              <span class="td-realtime-label">模拟时间</span>
              <span class="td-realtime-val">{{ (getTDReport()!.elapsedSimYears / 1e6).toFixed(2) }}M年</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;flex:1">
              <span class="td-realtime-label">纪元</span>
              <span class="td-realtime-val">{{ getTDReport()!.currentEra }}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;flex:1">
              <span class="td-realtime-label">文明等级</span>
              <span class="td-realtime-val">{{ getTDReport()!.highestCivLevel }}</span>
            </div>
          </div>
          <div class="td-wall">
            <span class="td-wall-icon">[+]</span>
            <span class="td-wall-label">绝对物理隔离墙</span>
            <span class="td-wall-bar"><span class="td-wall-fill" :style="{ width: (getTDReport()?.wallIntegrity || 0) + '%' }"></span></span>
            <span class="td-wall-pct">{{ getTDReport()?.wallIntegrity || 0 }}%</span>
          </div>
          <div class="td-epic-log" v-if="getTDReport()">
            <div class="orch-section-title">纪元事件</div>
            <div v-for="(ep, i) in [...(getTDReport()?.epochs || [])].reverse().slice(0,8)" :key="i" class="td-epic-item">
              <span class="td-epic-era">[{{ ep.eraName }}]</span>
              <span class="td-epic-text">{{ ep.breakthroughs[ep.breakthroughs.length-1] || ep.techDiscovered[ep.techDiscovered.length-1] || '文明演化中...' }}</span>
            </div>
          </div>
          <div class="td-civ-list" v-if="getTDReport()">
            <div class="orch-section-title">文明族群</div>
            <div v-for="civ in (timeDilation.state.sessions.find(s=>s.id===activeTDSessionId)?.civilizations || [])" :key="civ.id" class="td-civ-card">
              <div class="td-civ-name">{{ civ.name }}</div>
              <div class="td-civ-meta">
                <span class="td-civ-lvl">LV.{{ civ.level }}</span>
                <span>人口: {{ (civ.population/1e4).toFixed(1) }}万</span>
                <span>科技: {{ Object.keys(civ.techTree).length }}项</span>
                <span>模拟: {{ (civ.totalSimYears/1e6).toFixed(1) }}M年</span>
              </div>
            </div>
          </div>
          <div class="orch-section-title">产出艺术结晶 ({{ getTDReport()?.totalArtifacts || 0 }})</div>
          <div class="td-artifacts">
            <div v-for="a in harvestArtifacts().slice(0,15)" :key="a.id" class="td-artifact" @click="crystallizer.crystallize(a.name, a.type === 'algorithm' ? 'algorithm' : 'architecture', `// ${a.name} - T${a.tier}\n// 纪元:${a.discoveredAtEra} 强度:${a.power}\n${a.pseudoCode || ''}`, '时间膨胀', ['time-dilation', 'tier-'+a.tier])">
              <span class="td-art-tier" :class="'t'+a.tier">T{{ a.tier }}</span>
              <span class="td-art-name">{{ a.name }}</span>
              <span class="td-art-power">{{ a.power }}</span>
            </div>
            <div v-if="harvestArtifacts().length === 0" style="font-size:7px;color:var(--text-tertiary);padding:8px">等待文明产出...</div>
          </div>
          <button class="action-btn" @click="exportTDAndCopy()">导出结晶</button>
        </div>
      </div>

      <!-- 进化引擎V2 Panel -->
      <div v-if="showEvolutionV2" class="sidebar">
        <div class="sidebar-head"><span>进化引擎 V2</span><button class="icon-btn" @click="showEvolutionV2=false">X</button></div>
        <div class="evo2-panel">
          <div class="orch-section-title">内驱力引擎</div>
          <div class="drive-chart">
            <div class="drive-row"><span class="drive-label">焦虑</span><span class="drive-bar"><span class="drive-fill anxiety" :style="{ width: evolution.state.selfDrive.anxiety + '%' }"></span></span><span class="drive-val">{{ evolution.state.selfDrive.anxiety.toFixed(0) }}</span></div>
            <div class="drive-row"><span class="drive-label">自信</span><span class="drive-bar"><span class="drive-fill confidence" :style="{ width: evolution.state.selfDrive.confidence + '%' }"></span></span><span class="drive-val">{{ evolution.state.selfDrive.confidence.toFixed(0) }}</span></div>
            <div class="drive-row"><span class="drive-label">好奇</span><span class="drive-bar"><span class="drive-fill curiosity" :style="{ width: evolution.state.selfDrive.curiosity + '%' }"></span></span><span class="drive-val">{{ evolution.state.selfDrive.curiosity.toFixed(0) }}</span></div>
            <div class="drive-row"><span class="drive-label">雄心</span><span class="drive-bar"><span class="drive-fill ambition" :style="{ width: evolution.state.selfDrive.ambition + '%' }"></span></span><span class="drive-val">{{ evolution.state.selfDrive.ambition.toFixed(0) }}</span></div>
          </div>
          <span class="auto-lvl">自主等级: {{ evolution.state.autonomyLevel.toFixed(1) }}/10</span>
          <div class="orch-section-title">自我反思</div>
          <button class="action-btn" style="margin-top:4px;margin-bottom:8px" @click="evolveSelfReflect()">触发自我反思</button>
          <div class="reflect-log" v-if="evolution.getReflections().length > 0">
            <div v-for="(r,i) in evolution.getReflections().slice(0,8)" :key="i" class="reflect-line">{{ r }}</div>
          </div>
          <div class="orch-section-title">代码突变提案 ({{ evolution.state.mutationHistory.total }})</div>
          <button class="action-btn" style="margin-top:4px;margin-bottom:8px" @click="evolveProposeMutation()">生成突变提案</button>
          <div class="mutation-list">
            <div v-for="m in evolution.getMutations().slice(0,10)" :key="m.id" class="mutation-item">
              <div class="mut-top">
                <span class="mut-file">{{ m.targetFile }}</span>
                <span class="mut-conf">{{ (m.confidence*100).toFixed(0) }}%</span>
                <span style="font-size:6px;color:var(--text-tertiary);margin-left:auto">{{ new Date(m.timestamp).toLocaleTimeString() }}</span>
              </div>
              <div class="mut-reason">{{ m.reasoning }}</div>
              <div class="mut-actions">
                <button v-if="!m.applied" class="accept" @click="evolveAcceptMutation(m.id)">接受</button>
                <button v-if="!m.applied" class="reject" @click="evolveRejectMutation(m.id)">拒绝</button>
                <button v-if="m.applied && m.rollbackAvailable" class="reject" @click="evolveRollbackMutation(m.id)">回滚</button>
                <span v-if="m.applied && !m.rollbackAvailable" style="font-size:6px;color:var(--green)">已应用</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 晶化管理 Panel -->
      <div v-if="showCrystallization" class="sidebar">
        <div class="sidebar-head"><span>晶化管理</span><button class="icon-btn" @click="showCrystallization=false">X</button></div>
        <div class="cry-panel">
          <div class="cry-toolbar">
            <select v-model="cryFilterTier"><option value="">全部等级</option><option value="raw">Raw</option><option value="refined">Refined</option><option value="polished">Polished</option><option value="diamond">Diamond</option></select>
            <select v-model="cryFilterType"><option value="">全部类型</option><option value="code">Code</option><option value="concept">Concept</option><option value="architecture">Architecture</option><option value="algorithm">Algorithm</option><option value="pattern">Pattern</option><option value="insight">Insight</option></select>
            <button class="cry-btn" @click="crystallizeNew()">+ 晶化</button>
          </div>
          <div class="orch-section-title">晶化 ({{ crystallizer.state.crystals.length }})</div>
          <div v-for="c in getFilteredCrystals().slice(0,20)" :key="c.id" class="cry-item">
            <div class="cry-top"><span class="cry-name">{{ c.title }}</span><span class="cry-tier" :class="c.tier">{{ c.tier }}</span><span class="cry-type">{{ c.type }}</span></div>
            <div class="cry-tags"><span v-for="t in c.tags.slice(0,5)" :key="t" class="cry-tag">{{ t }}</span></div>
            <div class="cry-actions">
              <button v-if="c.tier !== 'diamond'" @click="refineCrystal(c.id)">精炼</button>
              <button class="fuse" @click="fuseCrystals(c.id, getFilteredCrystals()[0]?.id || c.id)">融合</button>
              <button @click="crystallizer.deleteCrystal(c.id)">删除</button>
            </div>
          </div>
          <div v-if="getFilteredCrystals().length === 0" style="font-size:7px;color:var(--text-tertiary);padding:8px;text-align:center">从时间膨胀中收获艺术结晶</div>
          <div class="orch-section-title">晶化包 ({{ crystallizer.state.packs.length }})</div>
          <div v-for="p in crystallizer.getPacks()" :key="p.id" class="cry-pack-item">
            <div class="cry-pack-name">{{ p.name }}</div>
            <div class="cry-pack-meta">{{ p.crystals.length }} 晶化 | 最高{{ p.meta.maxTier }} | {{ new Date(p.exportedAt).toLocaleDateString() }}</div>
            <button class="cry-btn" style="margin-top:3px" @click="exportCrystalPack(p.id)">导出</button>
          </div>
          <button class="action-btn" @click="createCrystalPack()">创建晶化包</button>
          <div class="orch-section-title" style="margin-top:8px">导入晶化</div>
          <textarea v-model="cryImportJson" style="width:100%;height:60px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-tertiary);color:var(--text-primary);font-size:7px;padding:4px;resize:vertical;font-family:var(--font-mono)" placeholder="粘贴 JSON..."></textarea>
          <button class="action-btn" @click="importCrystals()">导入</button>
        </div>
      </div>
    </div>
</template>
