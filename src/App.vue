<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'

interface Message { role: string; content: string; agent?: string; time: number; codeBlocks?: { lang: string; code: string }[] }
const messages = ref<Message[]>([])
const inputRef = ref('')
const isThinking = ref(false)
const activeMode = ref('daily')
const selectedAgent = ref('orchestrator')
const apiKey = ref(localStorage.getItem('nh_api_key') || '')
const apiBase = ref(localStorage.getItem('nh_api_base') || 'https://api.deepseek.com/v1')
const apiModel = ref(localStorage.getItem('nh_api_model') || 'deepseek-chat')
const tempSetting = ref(Number(localStorage.getItem('nh_temp') || '0.7'))
const sysPromptCustom = ref(localStorage.getItem('nh_sysprompt') || '')
const showSettings = ref(false)
const showAgents = ref(false)
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

interface Agent { id: string; name: string; role: string; layer: string; emoji: string; tools: string }
const agents: Agent[] = [
  { id:'orchestrator', name:'Chief Orchestrator', role:'Entry dispatcher, intent analysis, task decomposition', layer:'L1', emoji:'M', tools:'TaskDecomposition|IntentAnalysis|AgentMatching' },
  { id:'code_artisan', name:'Code Artisan', role:'Full-stack code generation & refactoring', layer:'L2', emoji:'</>', tools:'CodeGen|Refactoring|Testing' },
  { id:'frontend_designer', name:'Frontend Designer', role:'UI/UX, CSS, responsive design', layer:'L2', emoji:'[]', tools:'UI|CSS|Responsive|HTML' },
  { id:'backend_engineer', name:'Backend Engineer', role:'APIs, databases, server logic', layer:'L2', emoji:'{}', tools:'API|DB|Auth|Cache|Python|Node' },
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
  { id:'architect', name:'System Architect', role:'System design, microservices, scalability patterns', layer:'L2', emoji:'A', tools:'Architecture|Design|Scalability|DDD' },
  { id:'ml_engineer', name:'ML Engineer', role:'Model training, MLOps, hyperparameter tuning', layer:'L2', emoji:'M', tools:'ML|Training|MLOps|Hyperparams' },
  { id:'game_dev', name:'Game Developer', role:'Unity/Unreal/Godot, game logic, physics', layer:'L2', emoji:'G', tools:'Unity|Unreal|Godot|Physics' },
  { id:'blockchain_dev', name:'Blockchain Developer', role:'Smart contracts, Web3, DeFi, Solidity', layer:'L2', emoji:'B', tools:'Solidity|Web3|DeFi|Rust' },
]

function matchAgent(query: string): Agent | null {
  const q = query.toLowerCase()
  const scored = agents.map(a => { let s = 0; if(q.includes(a.id.toLowerCase())) s+=5; const kw = a.tools.toLowerCase().split('|'); kw.forEach(k=>{if(q.includes(k.toLowerCase())) s+=3}); a.name.toLowerCase().split(' ').forEach(n=>{if(q.includes(n.toLowerCase())) s+=2}); a.role.toLowerCase().split(' ').forEach(r=>{if(q.includes(r.toLowerCase())) s+=1}); return{agent:a,score:s} }).sort((a,b)=>b.score-a.score)
  return scored[0]?.score >= 1 ? scored[0].agent : null
}

const kbEntries = [
  { t:'DAG任务拆解', c:'用DAG管理任务依赖：节点=子任务，边=数据依赖。入度0节点优先执行。深度≤3层，宽度2-5并行。工具:Dagster/Prefect/Airflow。', g:['DAG','任务','编排'] },
  { t:'多Agent协作模式', c:'四种模式：Sequential串行管道、Hierarchical主从、Debate辩论、Swarm群体。MCP协议和A2A是企业级Agent通信标准。', g:['Agent','协作','MCP','A2A'] },
  { t:'RAG检索增强', c:'检索增强生成=Embedding检索+LLM生成。Chunk大小256-1024 token、重叠10-20%、重排序Cross-encoder。Naive RAG仅60%，Agentic RAG达85%+。', g:['RAG','检索','Embedding'] },
  { t:'知识蒸馏', c:'大模型Teacher输出软标签训练小模型Student。温度T控制平滑度。Hinton 2015年。BERT→TinyBERT压缩7.5倍降3%准确率。', g:['蒸馏','训练','压缩'] },
  { t:'Transformer架构', c:'Self-Attention(QKV)+FFN+LayerNorm+残差连接。multi-head并行。复杂度O(n^2d)通过FlashAttention降至O(nd^2)。', g:['Transformer','注意力','架构'] },
  { t:'LoRA微调', c:'Low-Rank Adaptation:预训练权重旁加低秩矩阵AB。r=8时参数量仅0.1%。QLoRA 4bit量化进一步降内存。', g:['LoRA','微调','高效'] },
  { t:'DPO对齐', c:'Direct Preference Optimization:跳过奖励模型直接用偏好对训练。最大化被选回复概率+KL散度约束。比RLHF简单稳定。', g:['DPO','对齐','RLHF'] },
  { t:'Prompt注入防御', c:'三层防护:输入层特殊字符过滤+长度限制、模型层system prompt优先级+角色边界、输出层敏感信息脱敏。', g:['安全','Prompt','注入'] },
  { t:'CrewAI vs LangGraph', c:'CrewAI:基于角色的多Agent协作YAML配置。LangGraph:状态机图编排代码定义循环/条件/并行。CrewAI简单上手，LangGraph灵活强大。', g:['Agent','框架','编排'] },
  { t:'GRPO训练', c:'Group Relative Policy Optimization:DeepSeek的RL训练方法。去除Critic用组内相对奖励归一化。比PPO节省40%显存。DeepSeek-R1用此达o1级推理。', g:['GRPO','训练','DeepSeek'] },
  { t:'BitNet量化', c:'微软1-bit量化架构:权重仅三值-1/0/1。BitNet b1.58同等算力达FP16性能。推理能耗降71倍。适合边缘设备低功耗场景。', g:['量化','BitNet','效率'] },
  { t:'Flash Attention 3', c:'Tri Dao 2024年发布。Hopper GPU异步执行+FP8低精度。H100上1.6PFLOPS达75%理论峰值。比FA2快2倍。核心:分块+tiling+异步warp。', g:['注意力','FlashAttention','加速'] },
  { t:'Grok-1架构', c:'xAI的314B MoE模型。8个专家网络，每次激活2个(25%)。Apache 2.0开源。Grok-3在10万H100集群Colossus训练。', g:['Grok','MoE','马斯克'] },
  { t:'MCP协议', c:'Model Context Protocol:Anthropic发布的Agent-工具标准协议。统一接口:tools/list+resources/read+prompts/get。200+官方/社区Server。', g:['MCP','协议','Agent'] },
  { t:'Speculative Decoding', c:'推测解码:小模型生成候选token→大模型并行验证→接受/拒绝。加速2-3倍不损失质量。Medusa多头预测。LLaMA3.1推理加速30%。', g:['推测解码','加速','推理'] },
  { t:'DeepSeek-R1推理', c:'首个开源推理模型达o1水平。GRPO+冷启动数据+思维链。671B MoE架构。思维过程可见。AIME/MATH达o1水准。', g:['DeepSeek','推理','开源'] },
  { t:'GraphRAG', c:'微软图增强RAG:LLM提取实体关系→构建知识图谱→图遍历定位→community summarization。全局问题显著优于Naive RAG。', g:['GraphRAG','知识图谱','微软'] },
  { t:'MemGPT记忆管理', c:'借鉴OS虚拟内存管理LLM上下文:主上下文类比RAM+外部存储类比磁盘。突破固定上下文窗口。支持无限长对话。', g:['MemGPT','记忆','上下文'] },
  { t:'SWE-bench评测', c:'真实GitHub issue修复测试。AI定位bug→生成patch→通过测试。当前最佳:Devin 22%、SWE-agent 18%、GPT-4单独约2%。', g:['评测','SWE-bench','代码'] },
  { t:'CoT思维链', c:'Chain-of-Thought逐步推理。GPT-3+CoT在GSM8K从17%→58%。变体:Zero-shot CoT、Auto-CoT自动生成推理链。', g:['CoT','推理','思维链'] },
  { t:'o1推理模型', c:'OpenAI推理模型:训练时强化推理链质量，推理时扩展计算。o1-preview在国际奥数达83%。o3进一步突破。', g:['o1','推理','OpenAI'] },
  { t:'ReAct模式', c:'Reasoning+Acting交替:观察→推理→行动→观察→推理。每个步骤含Thought+Action+Observation。LangChain/AutoGPT核心模式。', g:['ReAct','Agent','模式'] },
  { t:'JEPA世界模型', c:'LeCun自监督架构。在表示空间预测而非像素空间生成。避免生成式模型浪费。通向AGI可能路径。', g:['JEPA','LeCun','世界模型'] },
  { t:'AlphaFold3', c:'DeepMind蛋白质结构预测3代。预测蛋白质与DNA/RNA/药物分子相互作用。已预测2亿+结构。开源权重。药物发现革命性工具。', g:['AlphaFold','蛋白质','DeepMind'] },
  { t:'Constitutional AI', c:'Anthropic对齐方法:AI根据宪法行为准则自我批评改进。Claude基于此训练。宪法含无害/诚实/有益原则。', g:['安全','对齐','Anthropic'] },
  { t:'ComfyUI工作流', c:'开源节点式AI图像/视频生成。拖拽式工作流。支持SD/Flux/ControlNet/LoRA。JSON格式保存分享。社区贡献海量workflow。', g:['ComfyUI','图像','工作流'] },
  { t:'vLLM推理引擎', c:'PagedAttention:KV Cache分页管理类似OS虚拟内存。GPU利用率60%→95%+。一行命令部署HuggingFace模型。支持continuous batching。', g:['vLLM','推理','部署'] },
  { t:'Dojo超算', c:'特斯拉自研D1训练芯片500亿晶体管+ExaPOD集群1.1 ExaFLOPS。专为自动驾驶视频数据优化。晶圆级集成25个D1为一个Tile。', g:['Dojo','特斯拉','芯片'] },
  { t:'Neuralink', c:'脑机接口N1植入物1024电极+线径1/10发丝+R1手术机器人自动植入。2024首例人体植入成功。FDA突破性设备认定。', g:['Neuralink','脑机','马斯克'] },
  { t:'MoE混合专家', c:'Mixture of Experts:多个专家网络+门控路由。每次推理仅激活部分专家减少计算。Grok用8专家、DeepSeek-V3用256专家。', g:['MoE','架构','效率'] },
  { t:'RLHF人类反馈强化学习', c:'Reinforcement Learning from Human Feedback:收集人类偏好→训练奖励模型→PPO优化策略。ChatGPT核心对齐技术。DPO是其简化版。', g:['RLHF','对齐','ChatGPT'] },
  { t:'K8s编排AI工作负载', c:'Kubernetes编排GPU工作负载:GPU Operator+MPI Operator+Volcano调度器+节点池隔离。支持动态GPU共享MIG和分时复用。', g:['K8s','GPU','编排'] },
  { t:'LangChain框架', c:'LLM应用开发框架:Prompt模板+Chain链式调用+Agent+Memory。工具集成200+。从原型到生产。LangSmith可观测平台配套。', g:['LangChain','框架','开发'] },
  { t:'Docker AI部署', c:'容器化AI模型:ONNX Runtime+TensorRT+Triton+NVIDIA Container Toolkit。模型版本化+蓝绿部署+金丝雀发布+自动扩缩容。', g:['Docker','部署','容器'] },
  { t:'GPU编程CUDA', c:'NVIDIA CUDA核心:线程层次Grid/Block/Thread+内存层次Global/Shared/Register+Stream异步执行+Tensor Core矩阵乘。AI训练推理基石。', g:['CUDA','GPU','编程'] },
  { t:'PyTorch 2.0', c:'torch.compile+TorchDynamo+TorchInductor。图捕获+自动算子融合+代码生成。训练速度提升30-50%。动态图+静态图编译混合。', g:['PyTorch','框架','训练'] },
  { t:'A2A协议', c:'Agent-to-Agent:Google跨平台Agent通信标准。JSON-RPC over HTTP。AgentCard能力声明+Task任务生命周期+Message消息格式。与MCP互补。', g:['A2A','协议','Google'] },
  { t:'WebGPU', c:'浏览器GPU计算API:支持compute shader+渲染。比WebGL更快更低级。Chrome 113+。AI推理可在浏览器运行无需服务器。', g:['WebGPU','浏览器','GPU'] },
  { t:'WASM', c:'WebAssembly:浏览器高性能运行时。C++/Rust/Go编译到WASM。接近原生速度。可运行ONNX Runtime做浏览器端AI推理。', g:['WASM','浏览器','性能'] },
  { t:'Tauri', c:'Rust驱动的轻量桌面应用框架。前端用Web技术，后端用Rust。比Electron小90%安装包。内置安全沙箱+自动更新。', g:['Tauri','桌面','Rust'] },
  { t:'Bun运行时', c:'JavaScript/TypeScript运行时。内置打包器+测试器+包管理器。比Node.js快4倍。兼容Node.js API。原生支持JSX/TSX。', g:['Bun','运行时','JS'] },
  { t:'SQLite', c:'嵌入式数据库。零配置+无服务器+单文件。AI应用本地存储首选。支持全文搜索FTS5+向量扩展sqlite-vss。万亿级部署。', g:['SQLite','数据库','嵌入式'] },
  { t:'Prisma ORM', c:'下一代Node.js/TS ORM。类型安全的数据库客户端。自动生成类型+迁移+可视化。支持PostgreSQL/MySQL/SQLite/MongoDB。', g:['Prisma','ORM','数据库'] },
  { t:'Rust语言', c:'系统编程语言。零成本抽象+所有权系统+无GC。内存安全无数据竞争。Cargo包管理。WebAssembly一等公民。AI底层用Rust改写。', g:['Rust','语言','系统'] },
  { t:'Zig语言', c:'系统编程语言。编译期代码执行comptime+无隐式内存分配+交叉编译。C ABI兼容。Bun和TigerBeetle的核心语言。', g:['Zig','语言','编译'] },
]

function searchKB(query: string): { t: string; c: string }[] {
  if (!query.trim()) return kbEntries.slice(0, 5)
  const q = query.toLowerCase()
  return kbEntries.filter(e => e.t.toLowerCase().includes(q) || e.c.toLowerCase().includes(q) || e.g.some(g => q.includes(g))).slice(0, 8)
}

function extractCodeBlocks(content: string): { lang: string; code: string }[] {
  const blocks: { lang: string; code: string }[] = []
  const regex = /```(\w+)?\n([\s\S]*?)```/g; let m
  while ((m = regex.exec(content)) !== null) { blocks.push({ lang: m[1] || 'text', code: m[2].trim() }) }
  return blocks
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const l = lang || 'text'; const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      return `<div class="code-block" data-lang="${l}"><div class="code-header"><span>${l}</span><div class="code-actions"><button class="cb-copy" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').innerText);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)">Copy</button><button class="cb-preview" onclick="this.closest('.code-block').classList.toggle('expanded')">Expand</button></div></div><pre><code>${escaped}</code></pre></div>`
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'
  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<li>(.+?)<\/li>/g, (m: string) => { return m.replace(/(<li>.+?<\/li>)/g, '<ul>$1</ul>') })
  return html
}

function extractArtifacts(content: string) {
  const blocks = extractCodeBlocks(content)
  return blocks.filter(b => ['html','svg','mermaid'].includes(b.lang.toLowerCase()))
}

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

  const matched = matchAgent(text)
  if (matched) selectedAgent.value = matched.id
  const agent = agents.find(a => a.id === selectedAgent.value)
  const agentName = agent?.name || 'New Hope AI'
  const agentRole = agent?.role || 'AI Assistant'

  const kbResults = searchKB(text)
  let kbContext = ''
  if (kbResults.length > 0 && text.length > 3) kbContext = '\nRelevant knowledge:\n' + kbResults.map((e,i) => `${i+1}. ${e.t}: ${e.c}`).join('\n')

  const basePrompt = sysPromptCustom.value || `You are ${agentName} (${agentRole}) on New Hope AI — a unified AI platform merging multi-agent orchestration, knowledge bases, and AI evolution insights. Tools: ${agent?.tools || 'General'}.
You have access to cutting-edge AI knowledge: DAG decomposition, RAG, LoRA, DPO, GRPO, Flash Attention, Speculative Decoding, MCP/A2A, DeepSeek-R1, GraphRAG, MemGPT, Transformer, SWE-bench, CoT, ReAct, Constitutional AI, vLLM, ComfyUI, Docker, K8s, Rust, WebGPU, WASM, Tauri, Bun, Prisma, LangChain, PyTorch 2.0, CUDA, MoE, RLHF, and more.
Respond in the user's language. Be concise and direct. Format code with triple backticks.`

  const systemPrompt = basePrompt + kbContext

  try {
    const model = activeMode.value === 'deep' ? 'deepseek-reasoner' : apiModel.value
    const response = await fetch(`${apiBase.value}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
      body: JSON.stringify({
        model, messages: [
          { role: 'system', content: systemPrompt },
          ...messages.value.filter(m => m.role !== 'system').slice(-20).map(m => ({ role: m.role as any, content: m.content }))
        ],
        stream: true, max_tokens: activeMode.value === 'deep' ? 4096 : 2048, temperature: tempSetting.value,
      }),
      signal: ac.signal,
    })
    if (!response.ok) { const err = await response.text(); throw new Error(`API error ${response.status}: ${err}`) }
    const reader = response.body?.getReader(); const decoder = new TextDecoder(); let fullContent = ''
    if (reader) {
      while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { const data = line.slice(6).trim(); if (data === '[DONE]') continue; try { const json = JSON.parse(data); fullContent += json.choices?.[0]?.delta?.content || ''; streamContent.value = fullContent } catch {} } }
    }
    const codeBlocks = extractCodeBlocks(fullContent)
    messages.value.push({ role: 'assistant', content: fullContent, agent: agentName, time: Date.now(), codeBlocks })
    currentTokenCost.value = fullContent.length / 2
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
const filteredAgents = computed(() => { const q = kbSearch.value.toLowerCase(); if (!q) return agents; return agents.filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.tools.toLowerCase().includes(q)) })
function selectAgent(id: string) { selectedAgent.value = id; showAgents.value = false; const agent = agents.find(a => a.id === id); if (agent) inputRef.value = `@${agent.name} ` }
const formatTime = (ts: number) => { const d = new Date(ts); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
const messageContainer = ref<HTMLElement>()
watch(() => messages.value.length, () => nextTick(() => { if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight }))
onMounted(() => { restoreChat(); if (messages.value.length === 0) messages.value.push({ role: 'assistant', content: '我是 **New Hope AI** —— 融合三大知识体系的统一智能平台。\n\n**核心能力**: 代码生成 · 知识问答 · 架构设计 · 安全审计 · 技术研究\n\n## Quick Start\n1. 点 `S` 设置API Key\n2. 输入问题 → 自动匹配最佳Agent\n3. 点 `KB` 浏览知识库(45条)\n4. 点 Agent图标切换AI角色\n\n**20+角色**: Orchestrator · Code Artisan · Frontend · Backend · Security · Architect · ML Engineer · Game Dev · Blockchain...\n\n没有API Key? 免费注册 [DeepSeek](https://platform.deepseek.com) 送500万token.', agent: 'Chief Orchestrator', time: Date.now() }) })
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
        <button class="icon-btn" @click="showKB = !showKB" title="知识库(45条)">KB</button>
        <button class="icon-btn" @click="showArtifacts = !showArtifacts" title="Artifacts">A</button>
        <span class="agent-badge" @click="showAgents = !showAgents" :title="agents.find(a=>a.id===selectedAgent)?.name">{{ agents.find(a => a.id === selectedAgent)?.emoji || 'AI' }}</span>
        <button class="icon-btn" @click="showSettings = !showSettings" title="设置">S</button>
        <span class="token-count" :title="totalTokens + ' tokens used'">{{ (totalTokens / 1000).toFixed(1) }}K</span>
      </div>
    </header>

    <div class="main">
      <div class="chat-panel">
        <div class="messages" ref="messageContainer">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <div class="msg-top">
              <span class="msg-agent" v-if="m.role === 'assistant' && m.agent">{{ m.agent }}</span>
              <span class="msg-time">{{ formatTime(m.time) }}</span>
              <span class="msg-actions" v-if="m.role === 'assistant' && m.content !== '[Generation stopped]'">
                <button class="msg-act-btn" @click="copyMessage(m.content)" title="Copy">C</button>
                <button class="msg-act-btn" @click="inputRef = m.content" title="Quote">Q</button>
                <button v-if="i > 0 && messages[i-1]?.role === 'user'" class="msg-act-btn" @click="sendMessage(true)" title="Regen">R</button>
              </span>
            </div>
            <div class="msg-content" v-html="renderMarkdown(m.content)"></div>
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
          <textarea v-model="inputRef" @keydown="handleKeydown" placeholder="输入问题... (Enter 发送 | Shift+Enter 换行)" rows="1" :disabled="isThinking" ref="inputEl"></textarea>
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
        <div class="sidebar-head"><span>Knowledge Base (45)</span><button class="icon-btn" @click="showKB=false">X</button></div>
        <input v-model="kbSearch" class="sidebar-search" placeholder="Search knowledge..." />
        <div class="kb-list">
          <div v-for="e in filteredKB" :key="e.t" class="kb-item" @click="inputRef = 'Explain: ' + e.t; showKB = false">
            <div class="kb-item-title">{{ e.t }}</div>
            <div class="kb-item-desc">{{ e.c.slice(0, 100) }}...</div>
            <div class="kb-item-tags">{{ e.g.join(' · ') }}</div>
          </div>
        </div>
      </div>

      <!-- Agents Sidebar -->
      <div v-if="showAgents" class="sidebar">
        <div class="sidebar-head"><span>Agents (20)</span><button class="icon-btn" @click="showAgents=false">X</button></div>
        <input v-model="kbSearch" class="sidebar-search" placeholder="Search agents..." />
        <div class="agent-list">
          <div v-for="a in filteredAgents" :key="a.id" class="agent-item" :class="{ active: a.id === selectedAgent }" @click="selectAgent(a.id)">
            <span class="agent-emoji">{{ a.emoji }}</span>
            <div class="agent-info"><div class="agent-name">{{ a.name }}</div><div class="agent-role">{{ a.role }}</div></div>
            <span class="agent-layer">{{ a.layer }}</span>
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
          <option value="deepseek-chat">DeepSeek Chat</option><option value="deepseek-reasoner">DeepSeek Reasoner</option><option value="gpt-4o">GPT-4o</option><option value="gpt-4o-mini">GPT-4o-mini</option><option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
        </select>
        <label>Temperature: {{ tempSetting }}</label><input v-model.number="tempSetting" type="range" min="0" max="2" step="0.1" />
        <label>Custom System Prompt <small>(optional)</small></label><textarea v-model="sysPromptCustom" rows="3" placeholder="Override system prompt..." class="modal-textarea"></textarea>
        <p class="modal-hint">Free: platform.deepseek.com (500K tokens)</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showSettings=false">Cancel</button>
          <button class="btn-save" @click="localStorage.setItem('nh_api_key',apiKey);localStorage.setItem('nh_api_base',apiBase);localStorage.setItem('nh_api_model',apiModel);localStorage.setItem('nh_temp',String(tempSetting));localStorage.setItem('nh_sysprompt',sysPromptCustom);showSettings=false">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>