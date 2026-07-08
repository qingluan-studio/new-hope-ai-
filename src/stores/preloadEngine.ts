import { reactive, computed } from 'vue'

export interface KnowledgeNode {
  id: string
  topic: string
  content: string
  source: 'kb' | 'chat' | 'tool' | 'agent' | 'external'
  confidence: number
  relevance: number
  tags: string[]
  dependencies: string[]
  lastAccessed: number
  accessCount: number
  embedding?: number[]
}

export interface PredictionResult {
  id: string
  query: string
  predictedTopics: string[]
  recommendedNodes: KnowledgeNode[]
  confidence: number
  reasoning: string
  timestamp: number
}

export interface PreloadCandidate {
  id: string
  topic: string
  nodes: KnowledgeNode[]
  priority: number
  reason: string
  estimatedTokens: number
}

interface PreloadState {
  knowledgeGraph: KnowledgeNode[]
  predictions: PredictionResult[]
  preloadQueue: PreloadCandidate[]
  activePreloads: string[]
  contextHistory: string[]
  maxContextSize: number
  autoPreload: boolean
  stats: {
    preloadHits: number
    preloadMisses: number
    totalPredictions: number
    avgConfidence: number
  }
}

function genId() {
  return 'pre-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

function textToSparseVector(text: string, dim = 128): number[] {
  const vec = new Array(dim).fill(0)
  const chars = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
  for (let i = 0; i < chars.length; i++) {
    vec[chars.charCodeAt(i) % dim] += 1
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  return mag > 0 ? vec.map(v => v / mag) : vec
}

const STATIC_KNOWLEDGE: KnowledgeNode[] = [
  {
    id: 'kn-transformers',
    topic: 'Transformer Architecture',
    content: '自注意力机制、多头注意力、位置编码、残差连接、LayerNorm。QKV投影、缩放点积注意力。Decoder使用因果mask。FFN两层MLP+激活。',
    source: 'kb',
    confidence: 0.98,
    relevance: 0,
    tags: ['transformer', 'attention', 'nlp', 'architecture'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-rag',
    topic: 'RAG Systems',
    content: '检索增强生成：Embedding→向量检索→重排序→上下文注入→LLM生成。七范式：Naive/Corrective/Self/Agentic/Graph/Speculative/Fusion。Chunk策略：固定大小、语义分割、递归分割。',
    source: 'kb',
    confidence: 0.96,
    relevance: 0,
    tags: ['rag', 'retrieval', 'vector-db', 'embedding'],
    dependencies: ['kn-transformers'],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-finetune',
    topic: 'Fine-tuning Methods',
    content: '全量微调、LoRA/QLoRA低秩适配、Prefix Tuning、Adapter、IA3、Prompt Tuning。QLoRA: 4bit量化+双重量化+分页优化器。DPO/RLHF/GRPO对齐训练。',
    source: 'kb',
    confidence: 0.95,
    relevance: 0,
    tags: ['finetune', 'lora', 'qlora', 'dpo', 'rlhf'],
    dependencies: ['kn-transformers'],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-inference',
    topic: 'Inference Optimization',
    content: 'FlashAttention2/3、Speculative Decoding、KV Cache量化、Continuous Batching、PagedAttention(vLLM)、TensorRT-LLM、SGLang RadixAttention、AWQ/GPTQ量化。',
    source: 'kb',
    confidence: 0.97,
    relevance: 0,
    tags: ['inference', 'optimization', 'quantization', 'vllm'],
    dependencies: ['kn-transformers'],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-react',
    topic: 'React Best Practices',
    content: 'Hooks: useState/useEffect/useMemo/useCallback/useRef/useContext。自定义Hook提取逻辑。React.memo+useMemo避免不必要渲染。Suspense+lazy代码分割。Server Components vs Client Components。',
    source: 'kb',
    confidence: 0.94,
    relevance: 0,
    tags: ['react', 'hooks', 'frontend', 'performance'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-vue3',
    topic: 'Vue 3 Composition API',
    content: 'ref/reactive响应式、computed计算属性、watch/watchEffect、provide/inject依赖注入。Composables模式。Teleport/Suspense内置组件。Pinia状态管理。Vite构建工具。',
    source: 'kb',
    confidence: 0.94,
    relevance: 0,
    tags: ['vue', 'composition-api', 'frontend', 'pinia'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-rust',
    topic: 'Rust Systems Programming',
    content: '所有权/借用/生命周期。Trait/泛型/关联类型。async/await+Tokio运行时。unsafe块和安全抽象。Cargo构建系统。错误处理: Result/Option/?运算符。模式匹配。智能指针: Box/Rc/Arc/RefCell。',
    source: 'kb',
    confidence: 0.93,
    relevance: 0,
    tags: ['rust', 'systems', 'memory', 'concurrency'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-k8s',
    topic: 'Kubernetes Operations',
    content: 'Pod/Deployment/Service/Ingress核心资源。ConfigMap/Secret配置管理。HPA/VPA自动扩缩。RBAC权限控制。Helm Charts包管理。CRD+Operator扩展模式。Service Mesh(Istio/Linkerd)。GitOps(ArgoCD/Flux)。',
    source: 'kb',
    confidence: 0.92,
    relevance: 0,
    tags: ['kubernetes', 'devops', 'container', 'orchestration'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-security',
    topic: 'Web Security',
    content: 'OWASP Top 10: 注入/SSTI/SSRF/XXE/IDOR/不安全的反序列化/日志注入。防御: CSP/CORS/SRI/HSTS/X-Frame-Options。JWT安全: 短过期/refresh token轮换/签名验证。密码: bcrypt/argon2。',
    source: 'kb',
    confidence: 0.95,
    relevance: 0,
    tags: ['security', 'owasp', 'web', 'authentication'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-database',
    topic: 'Database Design',
    content: '关系型: 范式设计(1NF-3NF)、索引策略(B-Tree/Hash/GIN/GiST)、EXPLAIN查询计划、连接池、读写分离。NoSQL: MongoDB文档模型、Redis数据结构、Elasticsearch倒排索引。NewSQL: CockroachDB/TiDB分布式事务。',
    source: 'kb',
    confidence: 0.91,
    relevance: 0,
    tags: ['database', 'sql', 'nosql', 'performance'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-docker',
    topic: 'Docker & Containers',
    content: 'Dockerfile最佳实践: 多阶段构建/alpine基础镜像/层缓存优化/.dockerignore。Docker Compose多服务编排。容器安全: 非root用户/只读文件系统/资源限制/seccomp/AppArmor。镜像仓库: Harbor/ECR/GCR。',
    source: 'kb',
    confidence: 0.90,
    relevance: 0,
    tags: ['docker', 'container', 'devops', 'deployment'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
  {
    id: 'kn-python',
    topic: 'Python Advanced Patterns',
    content: 'asyncio异步编程。类型注解(Type Hints)+mypy/pydantic。装饰器/上下文管理器/生成器。GIL与多进程/多线程选择。Poetry/pipenv依赖管理。FastAPI/Django/Flask框架对比。',
    source: 'kb',
    confidence: 0.93,
    relevance: 0,
    tags: ['python', 'async', 'typing', 'backend'],
    dependencies: [],
    lastAccessed: 0,
    accessCount: 0
  },
]

// Topic co-occurrence and transition probability matrix
// Maps how topics relate to each other for predictive preloading
const TOPIC_RELATIONS: Record<string, string[]> = {
  'transformer': ['rag', 'finetune', 'inference', 'attention', 'nlp'],
  'rag': ['vector-db', 'embedding', 'retrieval', 'langchain', 'llamaindex'],
  'finetune': ['lora', 'qlora', 'dpo', 'rlhf', 'quantization'],
  'inference': ['quantization', 'vllm', 'tensorrt', 'optimization'],
  'react': ['hooks', 'state-management', 'nextjs', 'typescript', 'testing'],
  'vue': ['composition-api', 'pinia', 'vite', 'nuxt', 'typescript'],
  'rust': ['cargo', 'tokio', 'async', 'memory', 'webassembly'],
  'kubernetes': ['docker', 'helm', 'terraform', 'monitoring', 'gitops'],
  'security': ['authentication', 'authorization', 'encryption', 'csrf', 'xss'],
  'database': ['sql', 'postgresql', 'mongodb', 'redis', 'indexing'],
  'docker': ['kubernetes', 'compose', 'container', 'devops', 'ci-cd'],
  'python': ['fastapi', 'django', 'async', 'pandas', 'numpy'],
  'api': ['rest', 'graphql', 'grpc', 'websocket', 'authentication'],
  'testing': ['unit-testing', 'e2e', 'jest', 'vitest', 'playwright'],
  'deployment': ['docker', 'kubernetes', 'ci-cd', 'vercel', 'cloudflare'],
}

export function usePreloadEngine() {
  const state = reactive<PreloadState>({
    knowledgeGraph: [...STATIC_KNOWLEDGE],
    predictions: [],
    preloadQueue: [],
    activePreloads: [],
    contextHistory: [],
    maxContextSize: 32768, // 32K token window
    autoPreload: true,
    stats: {
      preloadHits: 0,
      preloadMisses: 0,
      totalPredictions: 0,
      avgConfidence: 0
    }
  })

  // Index knowledge graph with sparse embeddings for fast retrieval
  const indexedGraph = computed(() => {
    return state.knowledgeGraph.map(node => ({
      ...node,
      embedding: textToSparseVector(node.topic + ' ' + node.tags.join(' ') + ' ' + node.content.slice(0, 200))
    }))
  })

  function addNode(node: KnowledgeNode) {
    const exists = state.knowledgeGraph.find(n => n.id === node.id)
    if (exists) {
      Object.assign(exists, node, { lastAccessed: Date.now() })
    } else {
      state.knowledgeGraph.push({ ...node, lastAccessed: Date.now() })
    }
  }

  function accessNode(id: string) {
    const node = state.knowledgeGraph.find(n => n.id === id)
    if (node) {
      node.lastAccessed = Date.now()
      node.accessCount++
      node.relevance = Math.min(1, node.relevance + 0.05)
    }
    return node
  }

  function findRelevantNodes(query: string, topK = 5): KnowledgeNode[] {
    const queryVec = textToSparseVector(query, 128)
    const graph = indexedGraph.value
    const scored = graph.map(node => ({
      node,
      score: cosineSimilarity(queryVec, node.embedding || [])
    }))
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK).map(s => {
      accessNode(s.node.id)
      return { ...s.node, relevance: s.score }
    })
  }

  function predictNextTopics(currentQuery: string): string[] {
    const lowerQuery = currentQuery.toLowerCase()
    const matchedTopics: string[] = []

    for (const [topic, related] of Object.entries(TOPIC_RELATIONS)) {
      if (lowerQuery.includes(topic)) {
        matchedTopics.push(topic)
        related.forEach(r => {
          if (!matchedTopics.includes(r)) matchedTopics.push(r)
        })
      }
    }

    for (const [topic, related] of Object.entries(TOPIC_RELATIONS)) {
      for (const r of related) {
        if (lowerQuery.includes(r) && !matchedTopics.includes(topic)) {
          matchedTopics.push(topic)
        }
      }
    }

    return matchedTopics.slice(0, 8)
  }

  function generatePrediction(query: string): PredictionResult {
    const relevantNodes = findRelevantNodes(query, 5)
    const predictedTopics = predictNextTopics(query)
    const confidence = Math.min(0.95, relevantNodes.length * 0.15 + predictedTopics.length * 0.05)

    const result: PredictionResult = {
      id: genId(),
      query,
      predictedTopics,
      recommendedNodes: relevantNodes,
      confidence,
      reasoning: `基于查询"${query.slice(0, 30)}"的语义分析和主题关联图谱，预判用户可能需要以下${predictedTopics.length}个主题的知识`,
      timestamp: Date.now()
    }

    state.predictions.push(result)
    if (state.predictions.length > 50) state.predictions.shift()

    state.stats.totalPredictions++
    state.stats.avgConfidence = ((state.stats.avgConfidence * (state.stats.totalPredictions - 1)) + confidence) / state.stats.totalPredictions

    return result
  }

  function buildPreloadQueue(prediction: PredictionResult): PreloadCandidate[] {
    const candidates: PreloadCandidate[] = []

    for (const topic of prediction.predictedTopics) {
      const nodes = state.knowledgeGraph.filter(n =>
        n.tags.some(tag => topic.includes(tag) || tag.includes(topic)) ||
        n.topic.toLowerCase().includes(topic)
      )
      if (nodes.length > 0) {
        candidates.push({
          id: genId(),
          topic,
          nodes,
          priority: 1 - (candidates.length / prediction.predictedTopics.length),
          reason: `用户查询关联到 ${topic} 主题`,
          estimatedTokens: nodes.reduce((sum, n) => sum + n.content.length, 0) / 3.5
        })
      }
    }

    candidates.sort((a, b) => b.priority - a.priority)
    state.preloadQueue = candidates
    return candidates
  }

  function executePreload(candidates: PreloadCandidate[], maxTokens = 4096): string[] {
    const loadedIds: string[] = []
    let totalTokens = 0

    for (const candidate of candidates) {
      for (const node of candidate.nodes) {
        const nodeTokens = node.content.length / 3.5
        if (totalTokens + nodeTokens > maxTokens) break
        if (!state.activePreloads.includes(node.id)) {
          state.activePreloads.push(node.id)
          loadedIds.push(node.id)
          totalTokens += nodeTokens
          accessNode(node.id)
        }
      }
    }

    return loadedIds
  }

  function getPreloadedContext(maxTokens = 3072): string {
    const preloaded = state.activePreloads
      .map(id => state.knowledgeGraph.find(n => n.id === id))
      .filter(Boolean) as KnowledgeNode[]

    let context = ''
    let used = 0
    for (const node of preloaded.sort((a, b) => b.relevance - a.relevance)) {
      const chunk = `[${node.topic}]\n${node.content}\n\n`
      const chunkTokens = chunk.length / 3.5
      if (used + chunkTokens > maxTokens) break
      context += chunk
      used += chunkTokens
    }
    return context
  }

  function clearPreloads() {
    state.activePreloads = []
    state.preloadQueue = []
  }

  function processQuery(query: string): { prediction: PredictionResult; preloadContext: string } {
    clearPreloads()
    const prediction = generatePrediction(query)
    const candidates = buildPreloadQueue(previewQuery(query))
    executePreload(candidates)
    return { prediction, preloadContext: getPreloadedContext() }
  }

  function getNextQueryPrediction(): string[] {
    if (state.contextHistory.length === 0) return []
    const lastQuery = state.contextHistory[state.contextHistory.length - 1]
    return predictNextTopics(lastQuery)
  }

  function previewQuery(query: string): PredictionResult {
    return generatePrediction(query)
  }

  function addToHistory(query: string) {
    state.contextHistory.push(query)
    if (state.contextHistory.length > 100) state.contextHistory.shift()
  }

  function getContextWindow(): string {
    return state.contextHistory.slice(-10).join('\n')
  }

  function getInsightNodes(): KnowledgeNode[] {
    return state.knowledgeGraph
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
  }

  function getTopicGraph(): { nodes: { id: string; label: string; count: number }[]; edges: { from: string; to: string }[] } {
    const nodes: { id: string; label: string; count: number }[] = []
    const edges: { from: string; to: string }[] = []
    const addedNodes = new Set<string>()

    for (const [topic, related] of Object.entries(TOPIC_RELATIONS)) {
      if (!addedNodes.has(topic)) {
        const graphNode = state.knowledgeGraph.find(n => n.topic.toLowerCase().includes(topic))
        nodes.push({ id: topic, label: topic, count: graphNode?.accessCount || 0 })
        addedNodes.add(topic)
      }
      for (const r of related) {
        if (!addedNodes.has(r)) {
          const graphNode = state.knowledgeGraph.find(n => n.topic.toLowerCase().includes(r))
          nodes.push({ id: r, label: r, count: graphNode?.accessCount || 0 })
          addedNodes.add(r)
        }
        edges.push({ from: topic, to: r })
      }
    }

    return { nodes, edges }
  }

  const preloadProgress = computed(() => {
    if (state.preloadQueue.length === 0) return 100
    return (state.activePreloads.length / Math.max(1, state.preloadQueue.reduce((s, c) => s + c.nodes.length, 0))) * 100
  })

  const hitRate = computed(() => {
    const total = state.stats.preloadHits + state.stats.preloadMisses
    return total > 0 ? (state.stats.preloadHits / total * 100).toFixed(1) + '%' : 'N/A'
  })

  return {
    state,
    addNode,
    accessNode,
    findRelevantNodes,
    generatePrediction,
    buildPreloadQueue,
    executePreload,
    getPreloadedContext,
    clearPreloads,
    processQuery,
    getNextQueryPrediction,
    previewQuery,
    addToHistory,
    getContextWindow,
    getInsightNodes,
    getTopicGraph,
    preloadProgress,
    hitRate,
  }
}
