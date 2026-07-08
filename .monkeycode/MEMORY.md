# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

### 思考过程使用中文
- Date: 2026-07-08
- Context: 用户要求后续所有思考和回复过程均使用中文
- Instructions:
  - 思考过程（thinking tags 内）使用简体中文
  - 回复（response）使用简体中文
  - 代码注释保持英文，技术术语可按需保留英文

### 项目启动与预览
- Date: 2026-07-08
- Context: Agent 在执行部署任务时发现
- Category: 构建方法
- Instructions:
  - 开发服务器启动: `cd /workspace/new-hope-ai && npm run dev`
  - 生产构建: `cd /workspace/new-hope-ai && npx vite build`
  - 类型检查: `cd /workspace/new-hope-ai && npx vue-tsc --noEmit`
  - 构建产物目录: `dist/`
