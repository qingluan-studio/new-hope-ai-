<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'

const messages = ref<{ role: string; content: string; agent?: string; time: number }[]>([])
let inputRef = ref('')
const isThinking = ref(false)
const activeMode = ref('daily')
const selectedAgent = ref('orchestrator')
const apiKey = ref(localStorage.getItem('nh_api_key') || '')
const apiBase = ref(localStorage.getItem('nh_api_base') || 'https://api.deepseek.com/v1')
const apiModel = ref(localStorage.getItem('nh_api_model') || 'deepseek-chat')
const showSettings = ref(false)
const showAgents = ref(false)
const showKB = ref(false)
const kbSearch = ref('')
const currentTab = ref('chat')
const streamContent = ref('')

interface Agent { id: string; name: string; role: string; layer: string; emoji: string; tools: string }
const agents: Agent[] = [
  { id:'orchestrator', name:'Chief Orchestrator', role:'Entry dispatcher, intent analysis, task decomposition', layer:'L1', emoji:'M', tools:'TaskDecomposition|IntentAnalysis|AgentMatching' },
  { id:'code_artisan', name:'Code Artisan', role:'Full-stack code generation & refactoring', layer:'L2', emoji:'</>', tools:'CodeGen|Refactoring|Testing' },
  { id:'frontend_designer', name:'Frontend Designer', role:'UI/UX, CSS, responsive design', layer:'L2', emoji:'[]', tools:'UI|CSS|Responsive' },
  { id:'backend_engineer', name:'Backend Engineer', role:'APIs, databases, server logic', layer:'L2', emoji:'{}', tools:'API|DB|Auth|Cache' },
  { id:'copy_master', name:'Copy Master', role:'Content writing, copywriting, translation', layer:'L2', emoji:'T', tools:'Writing|Translation|Editing' },
  { id:'data_scientist', name:'Data Scientist', role:'Analysis, ML models, data pipelines', layer:'L2', emoji:'D', tools:'Analysis|ML|Pipeline|Stats' },
  { id:'devops_engineer', name:'DevOps Engineer', role:'CI/CD, Docker, K8s, monitoring', layer:'L2', emoji:'D', tools:'Docker|K8s|CI/CD|Terraform' },
  { id:'security_auditor', name:'Security Auditor', role:'Vulnerability scanning, pentesting, compliance', layer:'L2', emoji:'S', tools:'Scan|Audit|Compliance|OWASP' },
  { id:'mobile_dev', name:'Mobile Developer', role:'iOS/Android/Flutter/React Native', layer:'L2', emoji:'M', tools:'iOS|Android|Flutter|RN' },
  { id:'test_qa', name:'Test & QA Engineer', role:'Test cases, automation, quality assurance', layer:'L2', emoji:'T', tools:'Test|Automation|QA|Coverage' },
  { id:'rag_specialist', name:'RAG Specialist', role:'Knowledge retrieval, embedding, vector DBs', layer:'L3', emoji:'R', tools:'Embedding|VectorDB|Chunking|Rerank' },
  { id:'knowledge_graph', name:'Knowledge Graph', role:'Entity extraction, graph DB, reasoning', layer:'L3', emoji:'K', tools:'NER|GraphDB|Reasoning|Ontology' },
  { id:'etl_engineer', name:'ETL Engineer', role:'Data extraction, transformation, loading', layer:'L3', emoji:'E', tools:'ETL|Pipeline|Cleaning|Batch' },
  { id:'ai_safety', name:'AI Safety Guardian', role:'Alignment, jailbreak defense, content filtering', layer:'L4', emoji:'S', tools:'Alignment|Jailbreak|Filter|Audit' },
  { id:'evolution_agent', name:'Evolution Agent', role:'Self-improvement, learning from interactions', layer:'L4', emoji:'E', tools:'SelfLearn|Pattern|Insight|Optimize' },
  { id:'token_guard', name:'Token Gatekeeper', role:'Cost optimization, budget management', layer:'L4', emoji:'$', tools:'Budget|Optimize|Meter|Report' },
]

function matchAgent(query: string): Agent | null {
  const q = query.toLowerCase()
  const scored = agents.map(a => {
    let s = 0
    if (q.includes(a.id.toLowerCase())) s += 5
    const kw = a.tools.toLowerCase().split('|')
    kw.forEach(k => { if (q.includes(k.toLowerCase())) s += 3 })
    a.name.toLowerCase().split(' ').forEach(n => { if (q.includes(n.toLowerCase())) s += 2 })
    a.role.toLowerCase().split(' ').forEach(r => { if (q.includes(r.toLowerCase())) s += 1 })
    return { agent: a, score: s }
  }).sort((a,b) => b.score - a.score)
  return scored[0]?.score >= 1 ? scored[0].agent : null
}

const kbEntries = [
  { t:'DAG任务拆解', c:'用DAG管理任务依赖：节点=子任务，边=数据依赖。入度0节点优先执行。深度≤3层，宽度2-5并行。工具:Dagster/Prefect/Airflow。', g:['DAG','任务','编排'] },
  { t:'多Agent协作模式', c:'四种模式：Sequential(串行管道)、Hierarchical(主从)、Debate(辩论)、Swarm(群体)。Sequential适用确定性流程，Debate适用创意/策略。MCP协议和A2A是企业级标准。', g:['Agent','协作','MCP','A2A'] },
  { t:'RAG检索增强', c:'检索增强生成=Embedding检索+LLM生成。关键:Chunk大小(256-1024 token)、重叠(10-20%)、重排序(Cross-encoder)。Naive RAG仅60%准确，Agentic RAG可达85%+。', g:['RAG','检索','Embedding'] },
  { t:'知识蒸馏', c:'用大模型(Teacher)输出软标签训练小模型(Student)。温度参数T控制软标签平滑度。Hinton 2015年提出。BERT→TinyBERT压缩7.5倍仅降3%准确率。', g:['蒸馏','训练','压缩'] },
  { t:'Transformer架构', c:'Self-Attention(QKV)+FFN+LayerNorm+残差连接。multi-head并行。复杂度O(n²d)可通过FlashAttention降至O(nd²)。GPT/Claude/DeepSeek全部基于此。', g:['Transformer','注意力','架构'] },
  { t:'LoRA微调', c:'Low-Rank Adaptation:在预训练权重旁加低秩矩阵AB(A∈Rd×r,B∈Rr×k,r<<d)。仅训练AB参数。r=8时参数量仅原模型0.1%。可用QLoRA(4bit量化)进一步降内存。', g:['LoRA','微调','高效'] },
  { t:'DPO对齐', c:'Direct Preference Optimization:跳过奖励模型直接用偏好对训练。公式:最大化被选回复概率/降低被拒回复概率+KL散度约束。比RLHF简单且更稳定。LLaMA3用DPO对齐。', g:['DPO','对齐','RLHF'] },
  { t:'Prompt注入防御', c:'三层防护:输入层(特殊字符过滤+长度限制)、模型层(system prompt优先级+角色边界)、输出层(敏感信息脱敏)。用分隔符明确区分指令和数据。', g:['安全','Prompt','注入'] },
  { t:'CrewAI vs LangGraph', c:'CrewAI:基于角色的多Agent协作(YAML配置)。LangGraph:状态机图编排(代码定义循环/条件/并行)。CrewAI简单上手，LangGraph灵活强大。AutoGen类似CrewAI。', g:['Agent','框架','编排'] },
  { t:'GRPO训练', c:'Group Relative Policy Optimization:DeepSeek提出的RL训练方法。去除价值函数Critic，用组内相对奖励归一化。比PPO节省40%显存，DeepSeek-R1用此方法达到o1级推理。', g:['GRPO','训练','DeepSeek'] },
  { t:'BitNet量化', c:'微软1-bit量化架构:权重仅用三值(-1,0,1)。BitNet b1.58在同等算力下达到FP16模型的性能。推理能耗降低71倍。适用于边缘设备和低功耗场景。', g:['量化','BitNet','效率'] },
  { t:'Flash Attention 3', c:'Tri Dao 2024年发布。利用Hopper GPU的异步执行+FP8低精度。在H100上速度达1.6PFLOPS(75%理论峰值)。比FlashAttention-2快2倍。核心:分块+tiling+异步warp。', g:['注意力','FlashAttention','加速'] },
  { t:'Grok-1架构', c:'马斯克xAI的314B MoE模型。8个专家网络，每次激活2个(25%)。Apache 2.0开源。Grok-2在LMSYS排名前列。Grok-3在10万H100集群训练。', g:['Grok','MoE','马斯克'] },
  { t:'MCP协议', c:'Model Context Protocol:Anthropic发布的Agent-工具标准协议。替代碎片化API集成。统一接口:tools/list+resources/read+prompts/get。已有200+官方/社区MCP Server。', g:['MCP','协议','Agent'] },
  { t:'A2A协议', c:'Agent-to-Agent:Google发布的跨平台Agent通信标准。基于JSON-RPC over HTTP。核心:AgentCard(能力声明)+Task(任务生命周期)+Message(消息格式)。与MCP互补。', g:['A2A','协议','Google'] },
  { t:'Speculative Decoding', c:'推测解码:用小模型生成多个候选token→大模型并行验证→接受/拒绝。可加速2-3倍不损失质量。Medusa在此基础上增加多头预测。LLaMA3.1推理用此加速30%。', g:['推测解码','加速','推理'] },
  { t:'DeepSeek-R1推理', c:'首个开源推理模型达o1水平。GRPO训练+冷启动数据+思维链。公开完整训练过程。671B MoE架构。思维过程可见。在AIME/MATH上达到o1水准。', g:['DeepSeek','推理','开源'] },
  { t:'GraphRAG', c:'微软提出的图增强RAG:先用LLM从文档中提取实体和关系→构建知识图谱→查询时图遍历定位→用community summarization生成回答。在全局问题上显著优于Naive RAG。', g:['GraphRAG','知识图谱','微软'] },
  { t:'MemGPT记忆管理', c:'借鉴操作系统虚拟内存思想管理LLM上下文:主上下文(类比RAM)+外部存储(类比磁盘)。自动在两者间swap。突破固定上下文窗口限制。支持无限长对话。', g:['MemGPT','记忆','上下文'] },
  { t:'SWE-bench评测', c:'真实GitHub issue修复测试。AI在代码库中定位bug→生成patch→通过测试。SWE-bench Verified去除歧义issue。当前最佳:Devin 22%、SWE-agent 18%、GPT-4单独约2%。', g:['评测','SWE-bench','代码'] },
  { t:'GAIA评测', c:'Meta提出的通用AI助手评测。需多步推理+工具使用+网页浏览。例题:查找冬奥会冠军队伍的维基百科编辑日期。当前最佳约35%，人类92%。AI最难的评测之一。', g:['评测','GAIA','Agent'] },
  { t:'CoT思维链', c:'Chain-of-Thought:逐步推理而非直接给答案。GPT-3+CoT在GSM8K从17%跃升到58%。变体:Zero-shot CoT(Let us think step by step)、Auto-CoT(自动生成推理链)。', g:['CoT','推理','思维链'] },
  { t:'o1推理模型', c:'OpenAI推理模型:训练时强化推理链质量，推理时投入更多计算(推理时扩展)。在数学/编程/科学推理上大幅超越GPT-4。o1-preview在国际奥数达83%。o3进一步突破。', g:['o1','推理','OpenAI'] },
  { t:'ReAct模式', c:'Reasoning+Acting交替:观察→推理→行动→观察→推理→...。每个步骤包含Thought(思考)+Action(行动)+Observation(观察)。Agent通用模式。LangChain和AutoGPT都基于此。', g:['ReAct','Agent','模式'] },
  { t:'JEPA世界模型', c:'Joint Embedding Predictive Architecture:LeCun提出的自监督学习架构。在表示空间预测而非像素空间生成。避免生成式模型的浪费。被认为是通向AGI的可能路径。', g:['JEPA','LeCun','世界模型'] },
  { t:'AlphaFold3', c:'DeepMind蛋白质结构预测3代。不仅预测蛋白质3D结构还能预测蛋白质与DNA/RNA/药物分子的相互作用。已预测2亿+结构。开源权重。药物发现革命性工具。', g:['AlphaFold','蛋白质','DeepMind'] },
  { t:'Constitutional AI', c:'Anthropic提出的AI对齐方法:让AI根据宪法(行为准则)自我批评和自我改进。比RLHF更可扩展。Claude基于此训练。宪法包含无害/诚实/有益等原则。', g:['安全','对齐','Anthropic'] },
  { t:'Sora文生视频', c:'OpenAI的文本生成视频模型。基于Diffusion Transformer(DiT)架构。生成最长60秒视频。理解物理世界(重力/碰撞/光影)。目前未公开可用。引发视频生成竞赛。', g:['Sora','视频','生成'] },
  { t:'ComfyUI工作流', c:'开源节点式AI图像/视频生成工具。拖拽式搭工作流。支持SD/Flux/ControlNet/LoRA。JSON格式保存/分享工作流。社区贡献海量workflow。比WebUI灵活10倍。', g:['ComfyUI','图像','工作流'] },
  { t:'vLLM推理引擎', c:'PagedAttention技术:把KV Cache分页管理，类似OS的虚拟内存。GPU利用率60%→95%+。一行命令部署任意HuggingFace模型。支持continuous batching。开源Apache 2.0。', g:['vLLM','推理','部署'] },
]

function searchKB(query: string): { t: string; c: string }[] {
  if (!query.trim()) return kbEntries.slice(0, 5)
  const q = query.toLowerCase()
  return kbEntries.filter(e => 
    e.t.toLowerCase().includes(q) || e.c.toLowerCase().includes(q) || e.g.some(g => q.includes(g))
  ).slice(0, 8)
}

async function sendMessage() {
  const text = inputRef.value.trim()
  if (!text || isThinking.value) return
  if (!apiKey.value) { showSettings.value = true; return }

  messages.value.push({ role: 'user', content: text, time: Date.now() })
  inputRef.value = ''
  isThinking.value = true
  streamContent.value = ''

  const matched = matchAgent(text)
  if (matched) selectedAgent.value = matched.id
  const agent = agents.find(a => a.id === selectedAgent.value)
  const agentName = agent?.name || 'New Hope AI'
  const agentRole = agent?.role || 'AI Assistant'

  const kbResults = searchKB(text)
  let kbContext = ''
  if (kbResults.length > 0 && text.length > 3) {
    kbContext = '\nRelevant knowledge from knowledge base:\n' + kbResults.map((e,i) => `${i+1}. ${e.t}: ${e.c}`).join('\n')
  }

  const systemPrompt = `You are ${agentName} (${agentRole}) on New Hope AI — a unified AI platform merging multi-agent orchestration, knowledge bases, and AI evolution insights. Tools: ${agent?.tools || 'General'}. ${kbContext}
  
You have access to cutting-edge AI knowledge: DAG task decomposition, RAG retrieval, LoRA fine-tuning, DPO alignment, GRPO training, Flash Attention, Speculative Decoding, MCP/A2A protocols, DeepSeek-R1 reasoning, GraphRAG, MemGPT memory, Transformer architectures, SWE-bench evaluation, CoT reasoning, ReAct patterns, Constitutional AI, vLLM inference, ComfyUI workflows, and more.

Respond in the user's language. Be concise, direct, and helpful. If asked about AI topics, leverage all available knowledge.`

  try {
    const models = activeMode.value === 'deep' 
      ? ['deepseek-chat', 'deepseek-reasoner'] 
      : ['deepseek-chat']
    const model = apiModel.value || models[0]

    const response = await fetch(`${apiBase.value}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.value.filter(m => m.role !== 'system').slice(-20).map(m => ({ role: m.role as any, content: m.content }))
        ],
        stream: true,
        max_tokens: activeMode.value === 'deep' ? 4096 : 2048,
        temperature: activeMode.value === 'deep' ? 0.3 : 0.7,
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`API error ${response.status}: ${err}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content || ''
            fullContent += delta
            streamContent.value = fullContent
          } catch {}
        }
      }
    }

    messages.value.push({ role: 'assistant', content: fullContent, agent: agentName, time: Date.now() })
  } catch (e: any) {
    messages.value.push({ role: 'assistant', content: 'Error: ' + (e.message || 'Unknown'), agent: 'System', time: Date.now() })
  }
  
  streamContent.value = ''
  isThinking.value = false
  await nextTick()
}

function saveSettings() {
  localStorage.setItem('nh_api_key', apiKey.value)
  localStorage.setItem('nh_api_base', apiBase.value)
  localStorage.setItem('nh_api_model', apiModel.value)
  showSettings.value = false
}

const filteredKB = computed(() => searchKB(kbSearch.value))
const filteredAgents = computed(() => {
  const q = kbSearch.value.toLowerCase()
  if (!q) return agents
  return agents.filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.tools.toLowerCase().includes(q))
})

function selectAgent(id: string) {
  selectedAgent.value = id
  showAgents.value = false
  const agent = agents.find(a => a.id === id)
  if (agent) inputRef.value = `@${agent.name} `
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')
}

const messageContainer = ref<HTMLElement>()
watch(() => messages.value.length, () => nextTick(() => {
  if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight
}))

onMounted(() => {
  messages.value.push({ role: 'assistant', content: '你好！我是 New Hope AI —— 一个融合了 AI 进化知识库(56章)、多Agent协作引擎(15+角色)和前沿技术体系的统一智能平台。\n\n我可以帮你做:代码生成、知识问答、架构设计、安全审计、技术研究... 输入你的问题，我会自动匹配最合适的AI角色来回答。\n\n没有 API Key? 点右上角设置按钮配置(免费注册 DeepSeek API: https://platform.deepseek.com)。', agent: 'Chief Orchestrator', time: Date.now() })
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <span class="logo">H</span>
        <span class="brand">New Hope AI</span>
        <span class="tagline">单一AI，创造奇迹</span>
      </div>
      <div class="header-right">
        <button class="mode-btn" :class="{ active: activeMode === 'daily' }" @click="activeMode = 'daily'">Daily</button>
        <button class="mode-btn" :class="{ active: activeMode === 'deep' }" @click="activeMode = 'deep'">Deep</button>
        <span class="agent-badge" @click="showAgents = !showAgents">{{ agents.find(a => a.id === selectedAgent)?.emoji || 'AI' }}</span>
        <button class="icon-btn" @click="showKB = !showKB" title="知识库">KB</button>
        <button class="icon-btn" @click="showSettings = !showSettings" title="设置">S</button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main">
      <!-- Chat Panel -->
      <div class="chat-panel" :class="{ narrow: showKB || showAgents }">
        <div class="messages" ref="messageContainer">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="msg-meta" v-if="m.role === 'assistant' && m.agent">
              <span class="msg-agent">{{ m.agent }}</span>
              <span class="msg-time">{{ formatTime(m.time) }}</span>
            </div>
            <div v-else-if="m.role === 'user'" class="msg-meta user-meta">
              <span class="msg-time">{{ formatTime(m.time) }}</span>
            </div>
            <div class="msg-content" v-html="m.content.replace(/\n/g,'<br>').replace(/`([^`]+)`/g,'<code>$1</code>')"></div>
          </div>
          <div v-if="isThinking && streamContent" class="msg assistant">
            <div class="msg-content" v-html="streamContent.replace(/\n/g,'<br>').replace(/`([^`]+)`/g,'<code>$1</code>') + '<span class=cursor>|</span>'"></div>
          </div>
          <div v-else-if="isThinking" class="msg assistant">
            <div class="msg-content thinking">Thinking<span class="dots"><span>.</span><span>.</span><span>.</span></span></div>
          </div>
        </div>

        <div class="input-area">
          <textarea
            v-model="inputRef"
            @keydown="handleKeydown"
            placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
            rows="1"
            :disabled="isThinking"
            ref="inputEl"
          ></textarea>
          <button class="send-btn" @click="sendMessage" :disabled="isThinking || !inputRef.trim()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      <!-- KB Sidebar -->
      <div v-if="showKB" class="sidebar kb-sidebar">
        <div class="sidebar-head">
          <span>知识库 · 30+条目</span>
          <button class="icon-btn" @click="showKB = false">X</button>
        </div>
        <input v-model="kbSearch" class="sidebar-search" placeholder="搜索知识..." />
        <div class="kb-list">
          <div v-for="e in filteredKB" :key="e.t" class="kb-item" @click="inputRef = e.t; showKB = false">
            <div class="kb-item-title">{{ e.t }}</div>
            <div class="kb-item-desc">{{ e.c.slice(0, 100) }}...</div>
          </div>
        </div>
      </div>

      <!-- Agents Sidebar -->
      <div v-if="showAgents" class="sidebar agent-sidebar">
        <div class="sidebar-head">
          <span>Agents · 15+角色</span>
          <button class="icon-btn" @click="showAgents = false">X</button>
        </div>
        <input v-model="kbSearch" class="sidebar-search" placeholder="搜索 Agent..." />
        <div class="agent-list">
          <div v-for="a in filteredAgents" :key="a.id" class="agent-item" :class="{ active: a.id === selectedAgent }" @click="selectAgent(a.id)">
            <span class="agent-emoji">{{ a.emoji }}</span>
            <div class="agent-info">
              <div class="agent-name">{{ a.name }}</div>
              <div class="agent-role">{{ a.role }}</div>
            </div>
            <span class="agent-layer">{{ a.layer }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="modal">
        <div class="modal-head">API Settings</div>
        <label>API Base URL</label>
        <input v-model="apiBase" placeholder="https://api.deepseek.com/v1" />
        <label>API Key</label>
        <input v-model="apiKey" type="password" placeholder="sk-..." />
        <label>Model</label>
        <select v-model="apiModel">
          <option value="deepseek-chat">DeepSeek Chat (快)</option>
          <option value="deepseek-reasoner">DeepSeek Reasoner (推理)</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o-mini</option>
          <option value="claude-3-5-sonnet">Claude 3.5</option>
        </select>
        <p class="modal-hint">免费注册: platform.deepseek.com (送500万token)</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showSettings = false">取消</button>
          <button class="btn-save" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>