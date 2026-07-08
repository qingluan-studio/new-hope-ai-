interface CacheEntry<T> {
  data: T
  expires: number
  hits: number
}

interface AccelStats {
  cacheHits: number
  cacheMisses: number
  lazyLoads: number
  totalSaved: number
}

class DevAccelerator {
  private cache = new Map<string, CacheEntry<any>>()
  private stats: AccelStats = { cacheHits: 0, cacheMisses: 0, lazyLoads: 0, totalSaved: 0 }
  private idleCallbacks: (() => void)[] = []

  memo<T>(key: string, fn: () => T, ttlMs = 300000): T {
    const existing = this.cache.get(key)
    if (existing && existing.expires > Date.now()) {
      existing.hits++
      this.stats.cacheHits++
      return existing.data as T
    }
    this.stats.cacheMisses++
    const start = performance.now()
    const data = fn()
    const elapsed = performance.now() - start
    this.stats.totalSaved += elapsed
    this.cache.set(key, { data, expires: Date.now() + ttlMs, hits: 1 })
    return data
  }

  async lazy<T>(key: string, loader: () => Promise<T>, ttlMs = 600000): Promise<T> {
    const existing = this.cache.get(key)
    if (existing && existing.expires > Date.now()) {
      existing.hits++
      this.stats.cacheHits++
      this.stats.lazyLoads++
      return existing.data as T
    }
    this.stats.cacheMisses++
    const data = await loader()
    this.cache.set(key, { data, expires: Date.now() + ttlMs, hits: 1 })
    return data
  }

  warm(key: string, data: any, ttlMs = 300000) {
    this.cache.set(key, { data, expires: Date.now() + ttlMs, hits: 0 })
  }

  invalidate(key: string) { this.cache.delete(key) }
  clear() { this.cache.clear(); this.stats = { cacheHits: 0, cacheMisses: 0, lazyLoads: 0, totalSaved: 0 } }

  getStats() { return { ...this.stats, cacheSize: this.cache.size, hitRate: this.stats.cacheHits / Math.max(1, this.stats.cacheHits + this.stats.cacheMisses) } }

  /** 在浏览器空闲时执行低优先级任务 */
  requestIdle(fn: () => void) {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => fn(), { timeout: 2000 })
    } else {
      setTimeout(fn, 100)
    }
  }

  /** 预连接：提前建立到 API 服务器的连接，节省 TLS 握手 */
  preconnect(url: string) {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = url
    document.head.appendChild(link)
  }

  /** 预取：提前获取可能需要的 API 响应 */
  prefetch(url: string) {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  }

  /** 批量处理：合并多次操作避免重复计算 */
  batch(fns: (() => void)[], delayMs = 0) {
    if (delayMs > 0) {
      setTimeout(() => fns.forEach(f => f()), delayMs)
    } else {
      queueMicrotask(() => fns.forEach(f => f()))
    }
  }
}

export const accelerator = new DevAccelerator()

export function useAccelerator() {
  return accelerator
}

export function debouncedMemo<T extends (...args: any[]) => any>(fn: T, wait = 200): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastResult: ReturnType<T>
  return ((...args: any[]) => {
    if (timer) { clearTimeout(timer); timer = null }
    return new Promise<ReturnType<T>>(resolve => {
      timer = setTimeout(() => {
        lastResult = fn(...args)
        resolve(lastResult)
      }, wait)
    })
  }) as unknown as T
}
