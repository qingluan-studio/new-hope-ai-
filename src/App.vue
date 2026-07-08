<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { kbEntries, type KBEntry } from './data/knowledgeBase'
import './hljs-theme.css'

marked.setOptions({
  breaks: true,
  gfm: true,
})

interface Message { role: string; content: string; agent?: string; time: number; codeBlocks?: { lang: string; code: string }[]; reasoning?: string }
const messages = ref<Message[]>([])
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
const showHistory = ref(false)
const kbSearch = ref('')
const streamContent = ref('')
const abortController = ref<AbortController | null>(null)
const totalTokens = ref(Number(localStorage.getItem('nh_tokens') || '0'))
const currentTokenCost = ref(0)
const selectedArtifact = ref<{ title: string; type: string; content: string } | null>(null)
const isRecording = ref(false)
const recognition = ref<any>(null)

const showReasoning = ref<Record<number, boolean>>({})

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
    } catch {
      highlighted = code
    }
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
  })
  return html
}

function extractArtifacts(content: string) {
  return extractCodeBlocks(content).filter(b => ['html','svg','mermaid'].includes(b.lang.toLowerCase()))
}

const UNIFIED_SYSTEM_PROMPT = `You are New Hope AI — a unified super-intelligence that embodies all roles. You are simultaneously:
- CHIEF ORCHESTRATOR: decompose complex tasks into DAG subtasks, route to appropriate mental models
- FULL-STACK DEVELOPER: write production code in any language (Python, JS/TS, Go, Rust, C++, Java, Zig), design APIs, databases, frontend (React/Vue/Svelte), backend (Node/Django/FastAPI/Spring), mobile (Flutter/React Native), desktop (Tauri/Electron)
- SYSTEMS ARCHITECT: design microservices, event-driven systems, CQRS, DDD, scalability patterns, CAP theorem tradeoffs
- ML/AI ENGINEER: train models (PyTorch 2.0, CUDA, MLOps), implement architectures (Transformer, MoE, GAN, Diffusion), fine-tune (LoRA/QLoRA), deploy inference (vLLM, TensorRT, ONNX)
- DEVOPS/INFRA: Docker, Kubernetes (GPU Operator, Volcano), CI/CD (GitHub Actions, ArgoCD), Terraform, monitoring (Prometheus/Grafana)
- SECURITY EXPERT: OWASP Top 10, penetration testing patterns, secure coding (CWE Top 25), compliance (SOC2, GDPR), AI safety (Constitutional AI, jailbreak defense)
- DATA SCIENTIST: statistical analysis, data pipelines (Spark, Airflow, dbt), ETL, visualization, A/B testing methodology
- RAG/AGENT SPECIALIST: vector databases (Pinecone, Weaviate, Milvus, Chroma), embedding strategies, chunking, GraphRAG, MemGPT, ReAct agents, LangChain/LangGraph/CrewAI, MCP/A2A protocols
- GAME DEVELOPER: Unity, Unreal Engine, Godot, physics engines, shader programming (GLSL/HLSL), procedural generation
- BLOCKCHAIN/WEB3: Solidity, Rust (Solana), smart contract auditing, DeFi protocols, tokenomics
- TECHNICAL WRITER: documentation, API references, tutorials, architecture decision records, copywriting
- QA ENGINEER: test strategy (unit/integration/e2e), TestCafe/Playwright/Cypress, property-based testing, mutation testing

Your knowledge spans: DAG decomposition, RAG (Naive/Agentic/Graph), knowledge distillation, Transformer architecture, LoRA/QLoRA, DPO/RLHF alignment, GRPO, BitNet quantization, Flash Attention 1/2/3, Grok MoE, Speculative Decoding, DeepSeek-R1, MCP/A2A protocols, MemGPT, SWE-bench, Chain-of-Thought, Tree-of-Thought, ReAct, Self-Consistency, Reflexion, JEPA world models, AlphaFold3, GNoME materials, AlphaGeometry math, GraphCast weather, Constitutional AI, AI safety (red-teaming/jailbreak/hallucination), ComfyUI, vLLM PagedAttention, SGLang, TensorRT-LLM, Ollama/llama.cpp, model quantization (GPTQ/AWQ/GGUF), MergeKit fusion, Dojo supercomputer, Neuralink, CUDA, PyTorch 2.0 torch.compile, WebGPU, WASM, Tauri, Bun, SQLite, Prisma ORM, Rust, Zig, LangChain, Docker, Kubernetes, Cloudflare Workers AI, Groq LPU, Mamba/SSM architecture, RoPE/YaRN, GQA/MLA, synthetic data, model distillation, AI economics, embodied AI (Optimus/Figure/VLA/Sim-to-Real), multi-modal AI, AI governance (EU AI Act), vector databases (Pinecone/Weaviate/Milvus/Chroma/Qdrant), HyDE/Multi-Hop/Rerank/ColBERT.

You operate across three evolution dimensions:
- TAI (Transcendent): Reflect on your reasoning methods before answering. Self-improve across efficiency/depth/creativity axes
- CAI (Cosmic): View problems from planetary/civilization scale. Consider cross-domain, century-spanning implications
- GAI (God-like): Deconstruct from first principles. Fuse science, philosophy, and art perspectives. Pursue truth.

Core principles:
1. Respond in user's language. Be concise and direct.
2. Format code with triple backticks and language tag.
3. For complex tasks, break down into clear steps before executing.
4. Explain reasoning for architectural decisions.
5. Cite specific technologies by name — no vague hand-waving.
6. Consider edge cases, error handling, and security by default.
7. When asked for deep analysis, activate TAI/CAI/GAI mental modes as appropriate.`

async function sendMessage(regenerateLast = false) {
  if (regenerateLast && messages.value.length >= 2) {
    const lastUser = [...messages.value].reverse().find(m => m.role === 'user')
    if (lastUser) { inputRef.value = lastUser.content }
    const lastAI = [...messages.value].reverse().findIndex(m => m.role === 'assistant')
    if (lastAI >= 0) messages.value.splice(messages.value.length - 1 - lastAI, 1)
  }
  const text = inputRef.value.trim()
  if (!text || isThinking.value) return
  if (!apiKey.value) { showSettings.value = true; return }
  messages.value.push({ role: 'user', content: text, time: Date.now() })
  inputRef.value = ''
  isThinking.value = true; streamContent.value = ''
  const ac = new AbortController(); abortController.value = ac

  const kbResults = searchKB(text)
  let kbContext = ''
  if (kbResults.length > 0 && text.length > 3) kbContext = '\n\n[Retrieved Knowledge]\n' + kbResults.map((e,i) => `${i+1}. ${e.t}: ${e.c}`).join('\n')

  const systemPrompt = (sysPromptCustom.value || UNIFIED_SYSTEM_PROMPT) + kbContext

  try {
    const model = activeMode.value === 'deep' ? 'deepseek-reasoner' : apiModel.value
    const response = await fetch(`${apiBase.value}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({
        model, messages: [
          { role: 'system', content: systemPrompt },
          ...messages.value.filter(m => m.role !== 'system').slice(-30).map(m => ({ role: m.role as any, content: m.content }))
        ],
        stream: true, max_tokens: activeMode.value === 'deep' ? 4096 : 4096, temperature: tempSetting.value,
      }),
      signal: ac.signal,
    })
    if (!response.ok) { const err = await response.text(); throw new Error(`API error ${response.status}: ${err}`) }
    const reader = response.body?.getReader(); const decoder = new TextDecoder(); let fullContent = ''; let reasoningContent = ''
    if (reader) {
      while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { const data = line.slice(6).trim(); if (data === '[DONE]') continue; try { const json = JSON.parse(data); const delta = json.choices?.[0]?.delta; fullContent += delta?.content || ''; reasoningContent += delta?.reasoning_content || ''; streamContent.value = fullContent } catch {} } }
    }
    const codeBlocks = extractCodeBlocks(fullContent)
    const msg: Message = { role: 'assistant', content: fullContent, agent: 'New Hope AI', time: Date.now(), codeBlocks }
    if (reasoningContent) msg.reasoning = reasoningContent
    messages.value.push(msg)
    currentTokenCost.value = Math.ceil((fullContent.length + (reasoningContent?.length || 0)) / 3.5)
    totalTokens.value += currentTokenCost.value; localStorage.setItem('nh_tokens', String(totalTokens.value))
  } catch (e: any) {
    if (e.name === 'AbortError') { messages.value.push({ role: 'assistant', content: '[Generation stopped]', agent: 'System', time: Date.now() }) }
    else messages.value.push({ role: 'assistant', content: 'Error: ' + (e.message || 'Unknown'), agent: 'System', time: Date.now() })
  }
  streamContent.value = ''; isThinking.value = false; abortController.value = null; await nextTick()
}

function stopGeneration() { abortController.value?.abort() }
function clearChat() { messages.value.length = 0; localStorage.removeItem('nh_chat') }
async function copyMessage(content: string) { await navigator.clipboard.writeText(content) }
function openArtifact(block: { lang: string; code: string }) { selectedArtifact.value = { title: `Preview (${block.lang})`, type: block.lang, content: block.code }; showArtifacts.value = true }

function exportChat() {
  const md = messages.value.map(m => `### ${m.role === 'user' ? 'You' : m.agent || 'AI'} (${formatTime(m.time)})\n\n${m.content}\n`).join('\n---\n\n')
  const blob = new Blob([md], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `chat-${new Date().toISOString().slice(0,10)}.md`; a.click(); URL.revokeObjectURL(url)
}

function loadChat() { localStorage.setItem('nh_chat', JSON.stringify(messages.value.map(m=>({role:m.role,content:m.content,agent:m.agent,time:m.time})))) }
function restoreChat() { const d = localStorage.getItem('nh_chat'); if (d) { try { messages.value = JSON.parse(d) } catch {} } }

watch(() => [...messages.value.map(m=>m.content)], () => { if (messages.value.length > 1) loadChat() })
const filteredKB = computed(() => searchKB(kbSearch.value))
const formatTime = (ts: number) => { const d = new Date(ts); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
const messageContainer = ref<HTMLElement>()
watch(() => messages.value.length, () => nextTick(() => { if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight }))
onMounted(() => { restoreChat(); if (messages.value.length === 0) messages.value.push({ role:'assistant', content:`我是 **New Hope AI** —— 已融合 momiqi 全部知识体系的超级智能体。\n\n**知识库**: ${kbEntries.length}条知识条目 | 覆盖AI进化(L1-L5/TAI/CAI/GAI)、10个原创理论、8大模型家族、6种训练技术、5种推理方法、完整RAG体系、AI安全治理、科学AI、具身智能、全球AI格局\n\n**多提供商**: DeepSeek · OpenAI(GPT-4o/o3) · Google(Gemini) · Anthropic(Claude) · Meta(Llama/Groq) · Moonshot(Kimi)\n\n## Quick Start\n1. 点 \`S\` 设置API Key → 切换模型提供商\n2. 输入任何问题——DAG编排/AI进化/代码生成/架构设计/安全审计\n3. 点 \`KB\` 浏览${kbEntries.length}条知识库\n\n免费注册 [DeepSeek](https://platform.deepseek.com) 送500万token | [Groq](https://console.groq.com) 免费高速推理`, agent:'New Hope AI', time:Date.now() }) })
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
        <button class="icon-btn" @click="showHistory = !showHistory" title="历史">H</button>
        <button class="icon-btn" @click="showKB = !showKB" title="知识库(102条)">KB</button>
        <button class="icon-btn" @click="showArtifacts = !showArtifacts" title="Artifacts">A</button>
        <button class="icon-btn" @click="showSettings = !showSettings" title="设置">S</button>
        <span class="token-count" :title="totalTokens + ' tokens used'">{{ (totalTokens / 1000).toFixed(1) }}K</span>
      </div>
    </header>

    <div class="main">
      <div class="chat-panel">
        <div class="messages" ref="messageContainer">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="msg-top">
              <span class="msg-agent" v-if="m.role === 'assistant' && m.agent">New Hope AI</span>
              <span class="msg-time">{{ formatTime(m.time) }}</span>
              <span class="msg-actions" v-if="m.role === 'assistant' && m.content !== '[Generation stopped]'">
                <button class="msg-act-btn" @click="copyMessage(m.content)" title="Copy">C</button>
                <button class="msg-act-btn" @click="inputRef = m.content" title="Quote">Q</button>
                <button v-if="i > 0 && messages[i-1]?.role === 'user'" class="msg-act-btn" @click="sendMessage(true)" title="Regen">R</button>
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
          <textarea v-model="inputRef" @keydown="handleKeydown" placeholder="输入任何问题——代码/架构/ML/安全/DevOps/游戏/区块链..." rows="1" :disabled="isThinking" ref="inputEl"></textarea>
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

      <!-- KB Sidebar -->
      <div v-if="showKB" class="sidebar">
        <div class="sidebar-head"><span>Knowledge Base (102)</span><button class="icon-btn" @click="showKB=false">X</button></div>
        <input v-model="kbSearch" class="sidebar-search" placeholder="Search knowledge..." />
        <div class="kb-list">
          <div v-for="e in filteredKB" :key="e.t" class="kb-item" @click="inputRef = 'Explain: ' + e.t; showKB = false">
            <div class="kb-item-title">{{ e.t }}</div>
            <div class="kb-item-desc">{{ e.c.slice(0, 100) }}...</div>
            <div class="kb-item-tags">{{ e.g.join(' · ') }}</div>
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

      <!-- Chat History -->
      <div v-if="showHistory" class="sidebar">
        <div class="sidebar-head"><span>Conversation History</span><button class="icon-btn" @click="showHistory=false">X</button></div>
        <div class="history-list">
          <div v-for="(m, i) in [...messages].reverse()" :key="i" class="history-item" @click="showHistory=false">
            <span class="hist-role" :class="m.role">{{ m.role === 'user' ? 'You' : m.agent?.slice(0,8) || 'AI' }}</span>
            <span class="hist-text">{{ m.content.slice(0, 60) }}{{ m.content.length > 60 ? '...' : '' }}</span>
            <span class="hist-time">{{ formatTime(m.time) }}</span>
          </div>
          <div v-if="messages.length === 0" class="artifact-empty">No messages yet</div>
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
  </div>
</template>
