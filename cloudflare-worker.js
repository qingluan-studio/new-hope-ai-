/**
 * Cloudflare Worker API 代理 — 隐藏 API Key
 * 
 * 使用方法:
 * 1. 复制此文件到 Cloudflare Workers 编辑器
 * 2. Settings → Variables → 添加 Secret: API_KEY = 你的密钥
 * 3. 部署后获得 worker URL (如 https://nh-proxy.xxx.workers.dev)
 * 4. 在 new-hope-ai 设置中: API Base 填 worker URL, API Key 留空
 */

export default {
  async fetch(request: Request): Promise<Response> {
    // 只允许 POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // 从环境变量读取密钥 (Secret 类型，不会暴露)
    const apiKey = (request as any).env?.API_KEY
    if (!apiKey) {
      return new Response('API Key not configured', { status: 500 })
    }

    // 读取前端发来的目标 URL 和请求体
    const body = await request.text()
    let targetUrl = 'https://api.deepseek.com/v1/chat/completions'

    // 支持自定义目标 (前端通过 x-target-url header 指定)
    const customTarget = request.headers.get('x-target-url')
    if (customTarget) targetUrl = customTarget

    // 转发到大模型 API，注入密钥
    const proxyReq = new Request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // 透传其他有用 header
        'Accept': request.headers.get('accept') || 'text/event-stream',
      },
      body,
    })

    try {
      const response = await fetch(proxyReq)

      // 流式转发
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'text/event-stream',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, x-target-url',
        },
      })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  },
}

// 处理 OPTIONS 预检请求
export async function handleOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-target-url',
    },
  })
}
