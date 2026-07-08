import { reactive, computed } from 'vue'

export interface EnvironmentConfig {
  id: string
  name: string
  description: string
  type: 'frontend' | 'backend' | 'fullstack' | 'data' | 'ai' | 'mobile' | 'devops' | 'custom'
  runtime: string
  packages: PackageDef[]
  envVars: EnvVar[]
  scripts: BuildScript[]
  ports: number[]
  volumes: VolumeMount[]
  services: ServiceDef[]
  template: string
  status: 'ready' | 'running' | 'stopped' | 'error'
  containerId?: string
  createdAt: number
  updatedAt: number
}

export interface PackageDef {
  name: string
  version: string
  manager: 'npm' | 'pip' | 'cargo' | 'go' | 'composer' | 'gem'
  dev?: boolean
}

export interface EnvVar {
  key: string
  value: string
  secret: boolean
  description: string
}

export interface BuildScript {
  name: string
  command: string
  description: string
  when: 'setup' | 'build' | 'dev' | 'test' | 'deploy'
}

export interface VolumeMount {
  hostPath: string
  containerPath: string
  mode: 'ro' | 'rw'
}

export interface ServiceDef {
  name: string
  image: string
  version: string
  ports: number[]
  env: Record<string, string>
  dependsOn: string[]
}

interface EnvBuilderState {
  environments: EnvironmentConfig[]
  selectedEnvId: string | null
  activeEnvId: string | null
  logs: { envId: string; timestamp: number; level: 'info' | 'warn' | 'error'; message: string }[]
  filter: { type: string; status: string; search: string }
}

const ENV_TEMPLATES: Omit<EnvironmentConfig, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'containerId'>[] = [
  {
    name: 'React + Vite + Tailwind',
    description: '现代 React 前端开发环境，Vite + TypeScript + Tailwind CSS + Vitest',
    type: 'frontend',
    runtime: 'node:20-alpine',
    packages: [
      { name: 'react', version: '^18.3', manager: 'npm' },
      { name: 'react-dom', version: '^18.3', manager: 'npm' },
      { name: 'vite', version: '^6', manager: 'npm', dev: true },
      { name: 'typescript', version: '^5.5', manager: 'npm', dev: true },
      { name: 'tailwindcss', version: '^3.4', manager: 'npm', dev: true },
      { name: 'vitest', version: '^2', manager: 'npm', dev: true },
      { name: '@testing-library/react', version: '^16', manager: 'npm', dev: true },
    ],
    envVars: [
      { key: 'VITE_API_BASE', value: '/api', secret: false, description: 'API 基础路径' },
      { key: 'VITE_APP_TITLE', value: 'My App', secret: false, description: '应用标题' },
    ],
    scripts: [
      { name: 'dev', command: 'vite --host 0.0.0.0', description: '开发服务器', when: 'dev' },
      { name: 'build', command: 'tsc && vite build', description: '生产构建', when: 'build' },
      { name: 'test', command: 'vitest run', description: '运行测试', when: 'test' },
    ],
    ports: [5173],
    volumes: [{ hostPath: './src', containerPath: '/app/src', mode: 'rw' }],
    services: [],
    template: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]`
  },
  {
    name: 'Vue 3 + Nuxt',
    description: 'Vue 3/Nuxt 3 全栈开发环境，SSR + API Routes + Pinia + UnoCSS',
    type: 'fullstack',
    runtime: 'node:20-alpine',
    packages: [
      { name: 'nuxt', version: '^3.13', manager: 'npm' },
      { name: 'vue', version: 'latest', manager: 'npm' },
      { name: 'pinia', version: '^2', manager: 'npm' },
      { name: '@unocss/nuxt', version: '^0.63', manager: 'npm', dev: true },
    ],
    envVars: [
      { key: 'NUXT_PUBLIC_API_BASE', value: '/api', secret: false, description: 'API 基础路径' },
      { key: 'DATABASE_URL', value: 'sqlite:./data.db', secret: true, description: '数据库连接' },
    ],
    scripts: [
      { name: 'dev', command: 'nuxt dev --host 0.0.0.0', description: '开发服务器', when: 'dev' },
      { name: 'build', command: 'nuxt build', description: '生产构建', when: 'build' },
      { name: 'preview', command: 'nuxt preview', description: '预览构建产物', when: 'build' },
    ],
    ports: [3000],
    volumes: [{ hostPath: './server', containerPath: '/app/server', mode: 'rw' }],
    services: [],
    template: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]`
  },
  {
    name: 'Python FastAPI + PostgreSQL',
    description: 'Python 后端开发环境，FastAPI + SQLAlchemy + Alembic + Redis + Celery',
    type: 'backend',
    runtime: 'python:3.12-slim',
    packages: [
      { name: 'fastapi', version: '^0.115', manager: 'pip' },
      { name: 'uvicorn', version: '^0.32', manager: 'pip' },
      { name: 'sqlalchemy', version: '^2.0', manager: 'pip' },
      { name: 'alembic', version: '^1.13', manager: 'pip' },
      { name: 'pydantic', version: '^2.9', manager: 'pip' },
      { name: 'redis', version: '^5.2', manager: 'pip' },
      { name: 'celery', version: '^5.4', manager: 'pip' },
      { name: 'pytest', version: '^8.3', manager: 'pip' },
    ],
    envVars: [
      { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db', secret: true, description: '数据库连接' },
      { key: 'REDIS_URL', value: 'redis://localhost:6379/0', secret: false, description: 'Redis连接' },
      { key: 'SECRET_KEY', value: 'change-me-in-production', secret: true, description: 'JWT签名密钥' },
    ],
    scripts: [
      { name: 'dev', command: 'uvicorn app.main:app --reload --host 0.0.0.0 --port 8000', description: '开发服务器', when: 'dev' },
      { name: 'test', command: 'pytest -v', description: '运行测试', when: 'test' },
      { name: 'migrate', command: 'alembic upgrade head', description: '数据库迁移', when: 'setup' },
    ],
    ports: [8000],
    volumes: [{ hostPath: './app', containerPath: '/app/app', mode: 'rw' }],
    services: [
      { name: 'postgres', image: 'postgres', version: '16-alpine', ports: [5432], env: { POSTGRES_DB: 'app', POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass' }, dependsOn: [] },
      { name: 'redis', image: 'redis', version: '7-alpine', ports: [6379], env: {}, dependsOn: [] },
    ],
    template: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`
  },
  {
    name: 'Go + Gin + GORM',
    description: 'Go 后端开发环境，Gin 框架 + GORM ORM + Wire DI + 热重载 (Air)',
    type: 'backend',
    runtime: 'golang:1.23-alpine',
    packages: [
      { name: 'github.com/gin-gonic/gin', version: 'v1.10', manager: 'go' },
      { name: 'gorm.io/gorm', version: 'v1.25', manager: 'go' },
      { name: 'gorm.io/driver/postgres', version: 'v1.5', manager: 'go' },
      { name: 'github.com/google/wire', version: 'v0.6', manager: 'go' },
    ],
    envVars: [
      { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db', secret: true, description: '数据库连接' },
      { key: 'PORT', value: '8080', secret: false, description: '服务端口' },
    ],
    scripts: [
      { name: 'dev', command: 'air', description: '热重载开发', when: 'dev' },
      { name: 'build', command: 'go build -o app ./cmd/server', description: '构建二进制', when: 'build' },
      { name: 'test', command: 'go test ./... -v', description: '运行测试', when: 'test' },
    ],
    ports: [8080],
    volumes: [{ hostPath: './cmd', containerPath: '/app/cmd', mode: 'rw' }, { hostPath: './internal', containerPath: '/app/internal', mode: 'rw' }],
    services: [
      { name: 'postgres', image: 'postgres', version: '16-alpine', ports: [5432], env: { POSTGRES_DB: 'app', POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass' }, dependsOn: [] },
    ],
    template: `FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]`
  },
  {
    name: 'Next.js Fullstack',
    description: 'Next.js 14+ 全栈开发环境，App Router + Server Actions + Prisma + NextAuth',
    type: 'fullstack',
    runtime: 'node:20-alpine',
    packages: [
      { name: 'next', version: '^14.2', manager: 'npm' },
      { name: 'react', version: '^18.3', manager: 'npm' },
      { name: 'react-dom', version: '^18.3', manager: 'npm' },
      { name: 'prisma', version: '^5.19', manager: 'npm' },
      { name: '@prisma/client', version: '^5.19', manager: 'npm' },
      { name: 'next-auth', version: '^4.24', manager: 'npm' },
      { name: 'typescript', version: '^5.5', manager: 'npm', dev: true },
    ],
    envVars: [
      { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db', secret: true, description: '数据库连接' },
      { key: 'NEXTAUTH_SECRET', value: 'generate-a-random-secret', secret: true, description: 'Auth密钥' },
      { key: 'NEXTAUTH_URL', value: 'http://localhost:3000', secret: false, description: 'Auth回调地址' },
    ],
    scripts: [
      { name: 'dev', command: 'next dev -H 0.0.0.0', description: '开发服务器', when: 'dev' },
      { name: 'build', command: 'next build', description: '生产构建', when: 'build' },
      { name: 'start', command: 'next start -H 0.0.0.0', description: '生产启动', when: 'deploy' },
      { name: 'db:push', command: 'npx prisma db push', description: '数据库推送', when: 'setup' },
    ],
    ports: [3000],
    volumes: [{ hostPath: './prisma', containerPath: '/app/prisma', mode: 'rw' }],
    services: [
      { name: 'postgres', image: 'postgres', version: '16-alpine', ports: [5432], env: { POSTGRES_DB: 'app', POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass' }, dependsOn: [] },
    ],
    template: `FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]`
  },
  {
    name: 'AI/ML Jupyter',
    description: 'AI/ML 开发环境，Python + Jupyter + PyTorch + Transformers + Scikit-learn',
    type: 'ai',
    runtime: 'python:3.12-slim',
    packages: [
      { name: 'torch', version: '^2.4', manager: 'pip' },
      { name: 'transformers', version: '^4.45', manager: 'pip' },
      { name: 'datasets', version: '^3.0', manager: 'pip' },
      { name: 'scikit-learn', version: '^1.5', manager: 'pip' },
      { name: 'pandas', version: '^2.2', manager: 'pip' },
      { name: 'numpy', version: '^1.26', manager: 'pip' },
      { name: 'matplotlib', version: '^3.9', manager: 'pip' },
      { name: 'jupyter', version: '^1.1', manager: 'pip' },
      { name: 'accelerate', version: '^1.0', manager: 'pip' },
    ],
    envVars: [
      { key: 'HF_HOME', value: '/app/.cache/huggingface', secret: false, description: 'HuggingFace缓存' },
      { key: 'CUDA_VISIBLE_DEVICES', value: '0', secret: false, description: 'GPU设备' },
    ],
    scripts: [
      { name: 'dev', command: 'jupyter notebook --ip=0.0.0.0 --port=8888 --allow-root --no-browser', description: 'Jupyter', when: 'dev' },
      { name: 'train', command: 'python train.py', description: '训练模型', when: 'dev' },
    ],
    ports: [8888],
    volumes: [
      { hostPath: './notebooks', containerPath: '/app/notebooks', mode: 'rw' },
      { hostPath: './models', containerPath: '/app/models', mode: 'rw' },
      { hostPath: './data', containerPath: '/app/data', mode: 'ro' },
    ],
    services: [],
    template: `FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir jupyter torch transformers datasets scikit-learn pandas numpy matplotlib accelerate
COPY . .
EXPOSE 8888
CMD ["jupyter", "notebook", "--ip=0.0.0.0", "--port=8888", "--allow-root", "--no-browser"]`
  },
  {
    name: 'Rust + Axum + SQLx',
    description: 'Rust 后端开发环境，Axum Web框架 + SQLx 异步ORM + Tokio + Tracing',
    type: 'backend',
    runtime: 'rust:1.81-alpine',
    packages: [
      { name: 'axum', version: '0.7', manager: 'cargo' },
      { name: 'tokio', version: '1', manager: 'cargo' },
      { name: 'sqlx', version: '0.8', manager: 'cargo' },
      { name: 'serde', version: '1', manager: 'cargo' },
      { name: 'tracing', version: '0.1', manager: 'cargo' },
      { name: 'tower-http', version: '0.5', manager: 'cargo' },
    ],
    envVars: [
      { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db', secret: true, description: '数据库连接' },
      { key: 'RUST_LOG', value: 'info', secret: false, description: '日志级别' },
    ],
    scripts: [
      { name: 'dev', command: 'cargo watch -x run', description: '热重载开发', when: 'dev' },
      { name: 'build', command: 'cargo build --release', description: '发布构建', when: 'build' },
      { name: 'test', command: 'cargo test', description: '运行测试', when: 'test' },
    ],
    ports: [3000],
    volumes: [{ hostPath: './src', containerPath: '/app/src', mode: 'rw' }],
    services: [
      { name: 'postgres', image: 'postgres', version: '16-alpine', ports: [5432], env: { POSTGRES_DB: 'app', POSTGRES_USER: 'user', POSTGRES_PASSWORD: 'pass' }, dependsOn: [] },
    ],
    template: `FROM rust:1.81-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
COPY . .
RUN cargo build --release

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/target/release/server /server
EXPOSE 3000
CMD ["/server"]`
  },
  {
    name: 'Mobile Flutter',
    description: 'Flutter 跨平台移动开发环境，Material 3 + Riverpod + GoRouter + Dio',
    type: 'mobile',
    runtime: 'cirrusci/flutter:3.24',
    packages: [
      { name: 'flutter_riverpod', version: '^2.5', manager: 'pip' },
      { name: 'go_router', version: '^14.2', manager: 'pip' },
      { name: 'dio', version: '^5.7', manager: 'pip' },
      { name: 'freezed_annotation', version: '^2.4', manager: 'pip' },
    ],
    envVars: [
      { key: 'API_BASE_URL', value: 'https://api.example.com', secret: false, description: 'API地址' },
    ],
    scripts: [
      { name: 'dev', command: 'flutter run -d web-server --web-port 8088', description: 'Web开发', when: 'dev' },
      { name: 'build', command: 'flutter build apk --release', description: '构建APK', when: 'build' },
      { name: 'test', command: 'flutter test', description: '运行测试', when: 'test' },
    ],
    ports: [8088],
    volumes: [{ hostPath: './lib', containerPath: '/app/lib', mode: 'rw' }],
    services: [],
    template: `FROM cirrusci/flutter:3.24
WORKDIR /app
COPY pubspec.* ./
RUN flutter pub get
COPY . .
RUN flutter build web
EXPOSE 8088
CMD ["flutter", "run", "-d", "web-server", "--web-port", "8088"]`
  }
]

function genId() {
  return 'env-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

export function useEnvBuilder() {
  const state = reactive<EnvBuilderState>({
    environments: [],
    selectedEnvId: null,
    activeEnvId: null,
    logs: [],
    filter: { type: '', status: '', search: '' }
  })

  function getEnv(id: string) {
    return state.environments.find(e => e.id === id)
  }

  function createFromTemplate(tplIdx: number): EnvironmentConfig {
    const tpl = ENV_TEMPLATES[tplIdx]
    if (!tpl) throw new Error('Template not found')
    const env: EnvironmentConfig = {
      ...tpl,
      id: genId(),
      status: 'ready',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    state.environments.push(env)
    state.selectedEnvId = env.id
    addLog(env.id, 'info', `环境 "${env.name}" 创建成功`)
    return env
  }

  function startEnv(id: string) {
    const env = getEnv(id)
    if (!env) return
    env.status = 'running'
    env.updatedAt = Date.now()
    state.activeEnvId = id
    addLog(id, 'info', `环境 "${env.name}" 已启动 (端口: ${env.ports.join(', ')})`)
  }

  function stopEnv(id: string) {
    const env = getEnv(id)
    if (!env) return
    env.status = 'stopped'
    env.updatedAt = Date.now()
    if (state.activeEnvId === id) state.activeEnvId = null
    addLog(id, 'info', `环境 "${env.name}" 已停止`)
  }

  function deleteEnv(id: string) {
    const idx = state.environments.findIndex(e => e.id === id)
    if (idx === -1) return
    const env = state.environments[idx]
    if (env.status === 'running') stopEnv(id)
    state.environments.splice(idx, 1)
    if (state.selectedEnvId === id) state.selectedEnvId = state.environments[0]?.id || null
    addLog(id, 'info', `环境 "${env.name}" 已删除`)
  }

  function addLog(envId: string, level: 'info' | 'warn' | 'error', message: string) {
    state.logs.unshift({ envId, timestamp: Date.now(), level, message })
    if (state.logs.length > 200) state.logs.length = 200
  }

  function updateEnv(id: string, updates: Partial<EnvironmentConfig>) {
    const idx = state.environments.findIndex(e => e.id === id)
    if (idx === -1) return
    Object.assign(state.environments[idx], updates, { updatedAt: Date.now() })
  }

  function addService(envId: string, service: ServiceDef) {
    const env = getEnv(envId)
    if (!env) return
    env.services.push(service)
    env.updatedAt = Date.now()
    addLog(envId, 'info', `添加服务: ${service.name} (${service.image}:${service.version})`)
  }

  function addPackage(envId: string, pkg: PackageDef) {
    const env = getEnv(envId)
    if (!env) return
    env.packages.push(pkg)
    env.updatedAt = Date.now()
    addLog(envId, 'info', `添加依赖: ${pkg.name}@${pkg.version}`)
  }

  function addScript(envId: string, script: BuildScript) {
    const env = getEnv(envId)
    if (!env) return
    env.scripts.push(script)
    env.updatedAt = Date.now()
  }

  function duplicateEnv(id: string) {
    const env = getEnv(id)
    if (!env) return
    const copy: EnvironmentConfig = {
      ...JSON.parse(JSON.stringify(env)),
      id: genId(),
      name: env.name + ' (Copy)',
      status: 'ready',
      containerId: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    state.environments.push(copy)
    return copy
  }

  function exportEnv(id: string): string {
    const env = getEnv(id)
    if (!env) return ''
    return JSON.stringify({
      name: env.name,
      description: env.description,
      type: env.type,
      runtime: env.runtime,
      packages: env.packages,
      envVars: env.envVars.filter(v => !v.secret),
      scripts: env.scripts,
      ports: env.ports,
      volumes: env.volumes,
      services: env.services,
      template: env.template,
    }, null, 2)
  }

  function importEnv(json: string) {
    try {
      const data = JSON.parse(json)
      const env: EnvironmentConfig = {
        ...data,
        id: genId(),
        status: 'ready',
        secrets: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      state.environments.push(env)
      addLog(env.id, 'info', `环境 "${env.name}" 导入成功`)
      return env
    } catch {
      addLog('', 'error', 'JSON 解析失败，导入中止')
      return null
    }
  }

  const filteredEnvs = computed(() => {
    return state.environments.filter(e => {
      if (state.filter.type && e.type !== state.filter.type) return false
      if (state.filter.status && e.status !== state.filter.status) return false
      if (state.filter.search) {
        const s = state.filter.search.toLowerCase()
        return e.name.toLowerCase().includes(s) || e.description.toLowerCase().includes(s)
      }
      return true
    })
  })

  const templates = computed(() => ENV_TEMPLATES)

  const stats = computed(() => {
    const total = state.environments.length
    const running = state.environments.filter(e => e.status === 'running').length
    const totalServices = state.environments.reduce((sum, e) => sum + e.services.length, 0)
    const totalPackages = state.environments.reduce((sum, e) => sum + e.packages.length, 0)
    return { total, running, totalServices, totalPackages }
  })

  const envLogs = computed(() => {
    if (!state.selectedEnvId) return state.logs.slice(0, 50)
    return state.logs.filter(l => l.envId === state.selectedEnvId).slice(0, 50)
  })

  return {
    state,
    templates: ENV_TEMPLATES,
    getEnv,
    createFromTemplate,
    startEnv,
    stopEnv,
    deleteEnv,
    addLog,
    updateEnv,
    addService,
    addPackage,
    addScript,
    duplicateEnv,
    exportEnv,
    importEnv,
    filteredEnvs,
    stats,
    envLogs,
  }
}
