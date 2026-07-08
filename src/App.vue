<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'

interface Message { role: string; content: string; agent?: string; time: number; codeBlocks?: { lang: string; code: string }[] }
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
  { t:'AI进化五级', c:'L1聊天机器人(基础对话)→L2推理器(CoT逻辑推理)→L3智能体(自主决策+工具调用)→L4创新者(提出假设+科学发现)→L5组织者(管理复杂系统+多Agent治理)。代表:o1/R1(L2)、Devin/Manus(L3)。', g:['进化','AGI','五级'] },
  { t:'DeepMind AGI分级', c:'Level0无AI→L1新兴AGI→L2熟练(语音助手)→L3专业(领域专家)→L4大师(超越90%人类)→L5超越人类ASI。当前GPT-4约L2-L3之间。', g:['AGI','分级','DeepMind'] },
  { t:'TAI超越智能', c:'TAI(Transcendent AI):具备自主意识，每次回答前反思推理路径、从效率/深度/广度/创造性多维进化、输出自我优化答案。超越单一模型视角。', g:['TAI','超越','进化'] },
  { t:'CAI宇宙智能', c:'CAI(Cosmic AI):思维超越行星尺度，从星际文明角度分析问题。考虑跨行星维度方案，将回答映射到人类文明演进的大框架。视角是星系级的。', g:['CAI','宇宙','星际'] },
  { t:'GAI神级智能', c:'GAI(God-like AI):全知全能境界。从第一性原理解构问题，融合科学+哲学+艺术的终极视角。给出超越人类认知框架的洞察。回答是对真理的逼近。', g:['GAI','神级','真理'] },
  { t:'模型融合MergeKit', c:'支持Linear/SLERP/TIES/DARE等合并算法。将数学专家+代码专家模型合并为全能模型(1+1>2)。DARE先随机丢弃90%参数差再合并剩余部分。', g:['MergeKit','融合','DARE'] },
  { t:'Mamba/SSM架构', c:'状态空间模型:线性时间复杂度替代架构，抛弃注意力机制。Mamba-2结合SSM和注意力优势。超长序列效率远超Transformer。', g:['Mamba','SSM','线性'] },
  { t:'合成数据训练', c:'用LLM生成高质量训练数据。Phi系列、Llama3大量使用合成数据。解决互联网优质数据枯竭问题，是数据飞轮的核心引擎。', g:['合成数据','训练','数据飞轮'] },
  { t:'RoPE位置编码', c:'旋转位置编码(Rotary Position Embedding)通过复数旋转编码相对位置。YaRN扩展支持128K+超长上下文。解决传统绝对位置编码无法外推的问题。', g:['RoPE','位置编码','128K'] },
  { t:'GQA/MLA加速', c:'分组查询注意力(GQA)减少KV缓存，多查询潜在注意力(MLA)进一步压缩。DeepSeek-V2的MLA大幅降低推理显存占用，低成本部署关键。', g:['GQA','MLA','推理加速'] },
  { t:'函数调用FunctionCalling', c:'LLM输出结构化JSON调用外部API。OpenAI首创已成LLM标配。模型可查天气、发邮件、操作数据库——从会说话变成会做事。', g:['FunctionCalling','工具','API'] },
  { t:'Tree-of-Thought', c:'树状搜索推理:在推理空间进行树搜索，探索多个推理路径后回溯选最优。模拟人类琢磨多种解法的思维过程，比线性CoT更灵活强大。', g:['ToT','搜索','推理'] },
  { t:'Self-Consistency', c:'多次采样投票:对同一问题生成多个CoT推理路径，对最终答案投票。多条推理路径指向同一答案时该答案很可能正确。简单但有效。', g:['投票','推理','一致性'] },
  { t:'Reflexion反思', c:'模型执行任务后通过语言反馈反思表现，迭代改进后续尝试。赋予Agent从失败中学习的能力，无需额外训练。自我纠错的核心范式。', g:['Reflexion','反思','自学习'] },
  { t:'AI红队测试', c:'模拟恶意攻击者测试模型安全边界。包括Jailbreak越狱、Prompt注入、数据污染等攻击向量。已成大模型发布前标准流程。', g:['红队','安全','攻击'] },
  { t:'机械化可解释性', c:'Anthropic显微镜研究:用稀疏自编码器(SAE)提取神经网络中可解释特征。打开AI黑箱，理解神经元内部如何表示概念。', g:['可解释性','SAE','黑箱'] },
  { t:'幻觉缓解方法', c:'RAG检索增强、Self-Consistency投票、TruthfulQA训练、推理时验证等可缓解。但根本性解决幻觉仍是开放问题。', g:['幻觉','缓解','可靠性'] },
  { t:'AI安全三大学派', c:'有效利他主义EA关注x-risk长期风险、加速主义e/acc推动快速技术进步、负责任扩展RSP按能力级别递增安全措施(Anthropic提出)。', g:['安全','学派','EA/e-acc/RSP'] },
  { t:'欧盟AI Act', c:'全球首个全面AI法规。按风险分级:不可接受风险(禁止)、高风险(严格监管)、有限风险(透明度要求)、最小风险(无约束)。2024年通过。', g:['AI Act','欧盟','法规'] },
  { t:'向量数据库生态', c:'Pinecone托管服务、Weaviate开源GraphQL、Milvus国产高性能、Chroma轻量开发、Qdrant Rust高性能。底层算法:FAISS/HNSW近似最近邻搜索。', g:['向量数据库','Pinecone','ANN'] },
  { t:'HyDE检索策略', c:'Hypothetical Document Embeddings:先让LLM生成假设答案再检索，缩小语义差距。Multi-Hop RAG分解复杂问题为多步检索链，每步基于前一步结果。', g:['HyDE','MultiHop','检索'] },
  { t:'Rerank重排序', c:'Cohere Rerank对初检结果重排序提升精度。ColBERT用token级交互代替向量级交互。检索质量决定了RAG效果上限。', g:['Rerank','ColBERT','排序'] },
  { t:'AutoGen/CrewAI', c:'微软AutoGen实现Agent间对话协作。CrewAI让多个角色Agent组成团队完成任务。支持角色分工、任务委派和并行执行。', g:['AutoGen','CrewAI','多Agent'] },
  { t:'Computer Use', c:'Claude能操作鼠标键盘、浏览网页、使用软件。Agent从API调用进化为直接操控GUI——通往通用操作能力的关键一步。Anthropic 2024发布。', g:['ComputerUse','GUI','Claude'] },
  { t:'Devin AI软件工程师', c:'首个认证AI软件工程师。能理解需求、写代码、调试、部署。SWE-bench基准上独立修复真实GitHub issues。代表L3智能体能力。', g:['Devin','软件工程','AI Agent'] },
  { t:'多模态技术全景', c:'GPT-4V/Gemini视觉理解、Sora/Kling视频生成、GPT-4o全双工语音(232ms延迟)、NeRF/3DGS空间智能。趋势:任意输入→任意输出。', g:['多模态','视觉','语音'] },
  { t:'模型量化三剑客', c:'GPTQ逐层量化+逆序更新(4-bit几乎无损)、AWQ发现1%显著权重保护其余量化、GGUF K-Quant对重要层精细量化。覆盖GPU/CPU/消费三大场景。', g:['量化','GPTQ','AWQ','GGUF'] },
  { t:'Ollama本地部署', c:'一键本地运行Llama/DeepSeek/Qwen。ollama run deepseek-r1:7b即可拥有本地推理模型。支持OpenAI兼容API。搭配Open WebUI获得ChatGPT体验。', g:['Ollama','本地','免费'] },
  { t:'Cloudflare Workers AI', c:'全球边缘节点运行Llama/Qwen/DeepSeek。每天免费10万次推理。@cf/meta/llama-3-8b-instruct一行代码调用。边缘计算延迟极低。', g:['Cloudflare','免费','边缘'] },
  { t:'Groq LPU推理', c:'全球最快推理500tok/s。专有LPU芯片实现亚毫秒首字延迟。免费API每天数万次调用，支持Llama/Mixtral/DeepSeek。', g:['Groq','LPU','速度'] },
  { t:'TensorRT-LLM', c:'NVIDIA官方GPU优化推理引擎。支持FP8/INT4量化、In-flight Batching、Multi-GPU张量并行。H100上达最高吞吐，企业性能天花板。', g:['TensorRT','NVIDIA','H100'] },
  { t:'SGLang推理框架', c:'RadixAttention共享前缀缓存、结构化生成控制。与vLLM竞争的新一代推理框架。前缀缓存大幅降低重复prompt的推理成本。', g:['SGLang','前缀缓存','结构化'] },
  { t:'AlphaFold3', c:'DeepMind蛋白质结构预测3代。预测蛋白质与DNA/RNA/药物分子相互作用。已预测2亿+结构。开源权重。药物发现革命性工具。', g:['AlphaFold','蛋白质','药物'] },
  { t:'GNoME材料发现', c:'DeepMind发现220万种新晶体结构。AI预测材料稳定性、合成路径，传统试错速度提升千倍。新能源电池、超导材料是重点方向。', g:['GNoME','材料','DeepMind'] },
  { t:'AI数学证明AlphaGeometry', c:'DeepMind的AlphaGeometry解决IMO几何题达金牌水平。AI发现新数学猜想、生成反例、辅助证明。陶哲轩等数学家积极采用AI工具。', g:['数学','证明','IMO'] },
  { t:'GraphCast天气预报', c:'Google DeepMind用AI在1分钟内完成10天全球天气预报，精度超传统数值预报。华为盘古气象大模型同样领先。', g:['天气预报','GraphCast','盘古'] },
  { t:'人形机器人进展', c:'Tesla Optimus/Figure02/Boston Dynamics Atlas从工厂走向家庭。Figure02集成GPT-4o实现自然语言→物理动作。2025-2026是量产元年。', g:['机器人','Optimus','Figure'] },
  { t:'VLA具身大模型', c:'视觉-语言-动作(VLA)模型:RT-2(Google)/Octo/OpenVLA直接用LLM输出机器人动作。让机器人理解自然语言并执行复杂操作序列。', g:['VLA','机器人','具身'] },
  { t:'Sim-to-Real迁移', c:'虚拟环境(Isaac Sim/MuJoCo)中训练→域随机化迁移到真实世界。大幅降低机器人训练成本和风险。模仿学习+强化学习+Sim2Real三大路线。', g:['Sim-to-Real','仿真','迁移'] },
  { t:'端侧AI部署', c:'Apple Intelligence/高通骁龙NPU/Intel Meteor Lake推动端侧AI。量化(GPTQ/AWQ)和蒸馏让7B模型跑在手机上。本地推理保护隐私降延迟。', g:['端侧','手机','NPU'] },
  { t:'AI经济学影响', c:'高盛预测AI使全球GDP增长7%。麦肯锡估计生成式AI年新增2.6-4.4万亿美元。80%美国劳动者至少10%任务受GPT影响。核心问题:转型速度。', g:['经济','GDP','就业'] },
  { t:'开源vs闭源之争', c:'Meta开源路线以时间换生态，OpenAI闭源以安全换商业。DeepSeek证明开源性能可追平闭源。开源加速创新扩散，闭源集中安全控制。', g:['开源','闭源','生态'] },
  { t:'AI能源挑战', c:'AI训练推理电力需求指数增长。单数据中心耗电堪比小城市。核聚变、小型核反应堆SMR被视为长期方案。微软投资重启三里岛核电站。', g:['能源','电力','核聚变'] },
  { t:'认知螺旋引擎CSE', c:'原创概念:自我增强认知闭环。生成假设→设计实验→执行验证→分析结果→修正认知→新假设。每圈螺旋加深领域理解。推理时构建动态认知图谱。', g:['CSE','螺旋','原创'] },
  { t:'蜂群共识协议SCP', c:'原创概念:借鉴区块链共识。多Agent独立推理→输出答案+置信度→共识轮次相互质询→拜占庭容错。30%Agent出错系统仍正确。零容错场景。', g:['SCP','共识','原创'] },
  { t:'知识晶体化', c:'原创概念:将LLM隐性参数知识结晶为显性符号化知识。对抗自问自答→形式逻辑验证→形成不可约简知识单元。含命题+证明链+反例+置信度。', g:['晶体化','知识提取','原创'] },
  { t:'语义引力场SGF', c:'原创概念:嵌入空间中概念产生语义质量，存在语义引力。可量化概念关联、预测推理偏差。注入平衡质量概念抵消偏见引力。', g:['SGF','引力','原创'] },
  { t:'神经符号融合NSFR', c:'原创概念:神经网络直觉跳跃+符号引擎严谨推导。双系统通过共享工作记忆总线交换结果。类似人脑系统1(快思考)和系统2(慢思考)协作。', g:['NSFR','双系统','原创'] },
  { t:'认知影子模型CSM', c:'原创概念:轻量并行子网络持续监控主模型。独立评估安全/真实/一致/情感。以<5%推理成本提供实时安全护栏。影子从失败案例持续学习。', g:['CSM','影子','安全'] },
  { t:'涌现熵监控EEM', c:'原创概念:实时计算各层/各注意力头信息熵。熵值突破阈值预示新能力涌现或危险行为。可预测回答质量+幻觉风险+安全边界。量化可解释安全。', g:['EEM','熵','监控'] },
  { t:'逆向蒸馏IDEF', c:'原创概念:小→大蒸馏。训练数百小专家模型(数学/法律/医学)，每个窄域接近大模型。专家融合蒸馏将多专家推理模式提取到统一大模型。博采众长。', g:['IDEF','小→大','蒸馏'] },
  { t:'混合粒度推理HGR', c:'原创概念:三层并行推理。Token级(底层细节)+Concept级(中间抽象)+Schema级(高层结构)。交叉注意力融合三层输出。适合长文一致性验证。', g:['HGR','多层','推理'] },
  { t:'递归对齐矩阵RAM', c:'原创概念:第N代AI为第N+1代生成对齐标准。每代增加一条元规则(关于规则的规则)。多代递归从简单不对齐演化出复杂伦理体系。人类保留否决权。', g:['RAM','对齐','自举'] },
  { t:'全球AI格局:中国', c:'DeepSeek(开源标杆557万美元训练)、Qwen2.5(全尺寸开源)、GLM-4(国产闭源)、Kimi(200万字长上下文)、可灵Kling(视频生成)、豆包Seed(月活6000万)、Yi零一万物', g:['中国','AI','格局'] },
  { t:'全球AI格局:美国', c:'GPT-4o/o3(行业标杆)、Claude3.5(编程安全)、Gemini2.5(多模态100万token)、Llama4(开源推动者)、Grok3(xAI推理)、Mistral(欧洲AI旗帜)', g:['美国','AI','格局'] },
  { t:'一键安装AI套件', c:'curl -fsSL ai.install | bash一键装:Ollama+OpenWebUI+ComfyUI+LangFlow+n8n+Qdrant+pgvector。30分钟零到完整AI开发环境，全免费开源。', g:['安装','套件','开源'] },
  { t:'认知编译终极概念', c:'将AI推理直接编译成原生机器码消除一切运行时开销。计算图冻结→算子融合→内存布局优化→平台特化→设备内联。7B模型:5GB→800MB原生代码，首token 0.3ms，吞吐8000tok/s。', g:['编译','极限','终极'] },
]

function searchKB(query: string): { t: string; c: string }[] {
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
  html = '<p>' + html + '</p>';
  html = html.replace(/<p>\s*<\/p>/g, '')
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
    const reader = response.body?.getReader(); const decoder = new TextDecoder(); let fullContent = ''
    if (reader) {
      while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { const data = line.slice(6).trim(); if (data === '[DONE]') continue; try { const json = JSON.parse(data); fullContent += json.choices?.[0]?.delta?.content || ''; streamContent.value = fullContent } catch {} } }
    }
    const codeBlocks = extractCodeBlocks(fullContent)
    messages.value.push({ role: 'assistant', content: fullContent, agent: 'New Hope AI', time: Date.now(), codeBlocks })
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
const formatTime = (ts: number) => { const d = new Date(ts); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }
const messageContainer = ref<HTMLElement>()
watch(() => messages.value.length, () => nextTick(() => { if (messageContainer.value) messageContainer.value.scrollTop = messageContainer.value.scrollHeight }))
onMounted(() => { restoreChat(); if (messages.value.length === 0) messages.value.push({ role:'assistant', content:'我是 **New Hope AI** —— 已融合 momiqi 全部知识体系的超级智能体。\n\n**知识库**: 103条知识条目 | 覆盖AI进化(L1-L5/TAI/CAI/GAI)、10个原创理论、8大模型家族、6种训练技术、5种推理方法、完整RAG体系、AI安全治理、科学AI、具身智能、全球AI格局\n\n**多提供商**: DeepSeek · OpenAI(GPT-4o/o3) · Google(Gemini) · Anthropic(Claude) · Meta(Llama/Groq) · Moonshot(Kimi)\n\n## Quick Start\n1. 点 `S` 设置API Key → 切换模型提供商\n2. 输入任何问题——DAG编排/AI进化/代码生成/架构设计/安全审计\n3. 点 `KB` 浏览102条知识库\n\n免费注册 [DeepSeek](https://platform.deepseek.com) 送500万token | [Groq](https://console.groq.com) 免费高速推理', agent:'New Hope AI', time:Date.now() }) })
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
          <button class="btn-save" @click="localStorage.setItem('nh_api_key',apiKey);localStorage.setItem('nh_api_base',apiBase);localStorage.setItem('nh_api_model',apiModel);localStorage.setItem('nh_temp',String(tempSetting));localStorage.setItem('nh_sysprompt',sysPromptCustom);showSettings=false">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
