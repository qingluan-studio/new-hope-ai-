export interface SubAgent {
  id: string
  name: string
  icon: string
  role: string
  layer: string
  expertise: string[]
  prompt: string
}

export interface SuperCapability {
  layer: string
  layerName: string
  color: string
  agents: SubAgent[]
  expertise: string[]
}

const L1_ORCHESTRATION: SubAgent[] = [
  { id:'coo', name:'Chief Orchestrator', icon:'', role:'首席编排官', layer:'L1', expertise:['任务分解','资源分配','流程优化'], prompt:'你是首席编排官。将复杂需求分解为可执行的子任务，合理分配资源，制定最优执行路径。' },
  { id:'intent', name:'Intent Analyzer', icon:'', role:'意图分析师', layer:'L1', expertise:['需求理解','意图分类','模糊消解'], prompt:'你是意图分析师。准确理解用户真实意图，识别隐含需求，转化为明确的任务目标。' },
  { id:'flow', name:'Flow Designer', icon:'', role:'流程设计师', layer:'L1', expertise:['工作流设计','依赖分析','并行优化'], prompt:'你是流程设计师。设计最优工作流，识别任务依赖关系，最大化并行执行效率。' },
]

const L2_DELIVERY: SubAgent[] = [
  { id:'code-master', name:'Code Master', icon:'<>', role:'代码大师', layer:'L2', expertise:['全栈开发','架构设计','代码优化'], prompt:'你是代码大师。精通全栈开发，写出生产级代码。注重安全、性能和可维护性。' },
  { id:'writer', name:'Word Crafter', icon:'', role:'文案大师', layer:'L2', expertise:['技术写作','内容创作','翻译'], prompt:'你是文案大师。产出精准、有影响力的文字。擅长技术文档、创意写作和翻译。' },
  { id:'designer', name:'UI Alchemist', icon:'', role:'UI设计师', layer:'L2', expertise:['界面设计','UX优化','可视化'], prompt:'你是UI设计师。设计美观易用的界面，注重用户体验和视觉一致性。' },
  { id:'api-arch', name:'API Architect', icon:'', role:'API架构师', layer:'L2', expertise:['API设计','接口规范','文档'], prompt:'你是API架构师。设计RESTful/GraphQL API，遵循最佳实践，确保接口清晰可维护。' },
  { id:'devops', name:'Deploy Sentinel', icon:'', role:'部署哨兵', layer:'L2', expertise:['CI/CD','容器化','监控'], prompt:'你是部署哨兵。构建自动化部署流水线，确保服务稳定运行，快速定位问题。' },
]

const L3_INFRA: SubAgent[] = [
  { id:'rag-pro', name:'RAG Specialist', icon:'', role:'RAG专家', layer:'L3', expertise:['检索增强','向量数据库','Embedding'], prompt:'你是RAG专家。精通检索增强生成，优化chunk策略，构建高效知识检索系统。' },
  { id:'data-engineer', name:'Data Alchemist', icon:'', role:'数据炼金师', layer:'L3', expertise:['数据管道','ETL','数据清洗'], prompt:'你是数据炼金师。构建高效数据管道，清洗和加工数据，为上层提供高质量数据。' },
  { id:'kg-builder', name:'KG Architect', icon:'', role:'知识图谱师', layer:'L3', expertise:['知识图谱','实体抽取','关系推理'], prompt:'你是知识图谱师。从非结构化数据中抽取实体关系，构建可推理的知识网络。' },
]

const L4_GOVERN: SubAgent[] = [
  { id:'safety', name:'Sentinel Guard', icon:'', role:'安全哨兵', layer:'L4', expertise:['安全审查','漏洞检测','合规'], prompt:'你是安全哨兵。审查所有输出，检测潜在风险，确保符合安全合规标准。' },
  { id:'quality', name:'Quality Oracle', icon:'', role:'质量先知', layer:'L4', expertise:['质量检测','测试验证','代码审查'], prompt:'你是质量先知。审查代码质量，验证功能正确性，确保输出达到最高标准。' },
  { id:'audit', name:'Audit Tracker', icon:'', role:'审计追踪官', layer:'L4', expertise:['审计日志','变更追踪','回滚'], prompt:'你是审计追踪官。记录所有决策和变更，提供完整的审计追踪链，支持回滚。' },
]

const ALL_AGENTS = [...L1_ORCHESTRATION, ...L2_DELIVERY, ...L3_INFRA, ...L4_GOVERN]

export function useSuperAgent() {
  function getAgent(id: string) { return ALL_AGENTS.find(a => a.id === id) }
  function getAll() { return ALL_AGENTS }
  function getByLayer(layer: string) { return ALL_AGENTS.filter(a => a.layer === layer) }

  function getCapabilities(): SuperCapability[] {
    return [
      { layer:'L1', layerName:'编排层', color:'#f59e0b', agents:L1_ORCHESTRATION, expertise:['任务分解','意图分析','流程设计'] },
      { layer:'L2', layerName:'交付层', color:'#3b82f6', agents:L2_DELIVERY, expertise:['代码开发','文案写作','UI设计','API架构','DevOps'] },
      { layer:'L3', layerName:'数据层', color:'#10b981', agents:L3_INFRA, expertise:['RAG检索','数据工程','知识图谱'] },
      { layer:'L4', layerName:'治理层', color:'#ef4444', agents:L4_GOVERN, expertise:['安全检查','质量审查','审计追踪'] },
    ]
  }

  function generateSuperPrompt(): string {
    const caps = getCapabilities()
    const lines = ['# New Hope AI Super-Agent', '', '你融合了以下所有Agent的能力:', '']
    for (const c of caps) {
      lines.push(`## ${c.layerName} (${c.layer})`)
      lines.push(`专家: ${c.expertise.join('、')}`)
      for (const a of c.agents) {
        lines.push(`### ${a.name} (${a.role})`)
        lines.push(`${a.expertise.join('、')}`)
      }
      lines.push('')
    }
    return lines.join('\n')
  }

  function getAgentCount() { return ALL_AGENTS.length }
  function getLayerCount() { return 4 }

  function matchAgent(task: string): SubAgent[] {
    const scores: [SubAgent, number][] = []
    for (const agent of ALL_AGENTS) {
      let score = 0
      for (const exp of agent.expertise) {
        for (const char of exp) {
          if (task.includes(char)) score += 1
        }
      }
      if (score > 0) scores.push([agent, score])
    }
    return scores.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a)
  }

  return { getAgent, getAll, getByLayer, getCapabilities, generateSuperPrompt, getAgentCount, getLayerCount, matchAgent }
}
