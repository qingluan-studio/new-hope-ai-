interface StoredValue {
  data: any
  checksum: string
  version: number
  updatedAt: number
}

const PREFIX = 'nh_'
const META_SUFFIX = ':meta'
const MIGRATIONS: Record<string, (old: any) => any> = {
  'nh_brain': (old) => {
    if (old.regions && !old.regions[0]?.synapseCount) {
      return { ...old, regions: old.regions.map((r: any) => ({ ...r, synapseCount: r.synapseCount || 0 })) }
    }
    return old
  },
}

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function getMetaKey(key: string) { return `${key}${META_SUFFIX}` }

export function guardedSave(key: string, value: any) {
  const fk = PREFIX + key
  try {
    const existing = guardedLoadRaw(fk)
    const version = existing ? existing.version + 1 : 1
    const raw = JSON.stringify(value)
    const entry: StoredValue = { data: value, checksum: hash(raw), version, updatedAt: Date.now() }
    localStorage.setItem(fk, JSON.stringify(entry))
    localStorage.setItem(getMetaKey(fk), JSON.stringify({ version, size: raw.length, updatedAt: entry.updatedAt }))
  } catch (e) {
    console.error(`[DataIntegrity] Save failed for ${fk}:`, e)
  }
}

function guardedLoadRaw(fk: string): StoredValue | null {
  try {
    const raw = localStorage.getItem(fk)
    if (!raw) return null
    const entry: StoredValue = JSON.parse(raw)
    const computed = hash(JSON.stringify(entry.data))
    if (computed !== entry.checksum) {
      console.warn(`[DataIntegrity] Checksum mismatch for ${fk}, returning null`)
      return null
    }
    return entry
  } catch { return null }
}

export function guardedLoad<T>(key: string, fallback: T): T {
  const fk = PREFIX + key
  const entry = guardedLoadRaw(fk)
  return entry ? (entry.data as T) : fallback
}

export function guardedRemove(key: string) {
  localStorage.removeItem(PREFIX + key)
  localStorage.removeItem(getMetaKey(PREFIX + key))
}

export function initDataIntegrity() {
  for (const [key, migrate] of Object.entries(MIGRATIONS)) {
    try {
      const entry = guardedLoadRaw(key)
      if (entry) {
        const migrated = migrate(entry.data)
        if (migrated !== entry.data) {
          guardedSave(key.replace(PREFIX, ''), migrated)
        }
      }
    } catch (e) {
      console.warn(`[DataIntegrity] Migration failed for ${key}:`, e)
    }
  }
}

export function exportAllData(): string {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX) && !key.endsWith(META_SUFFIX)) {
      const entry = guardedLoadRaw(key)
      if (entry) data[key.replace(PREFIX, '')] = entry.data
    }
  }
  return JSON.stringify({ exportAt: new Date().toISOString(), data })
}

export function importAllData(jsonStr: string): { imported: number; errors: string[] } {
  const errors: string[] = []
  let imported = 0
  try {
    const wrapper = JSON.parse(jsonStr)
    const data = wrapper.data || wrapper
    for (const [key, value] of Object.entries(data)) {
      try {
        guardedSave(key, value)
        imported++
      } catch (e: any) {
        errors.push(`${key}: ${e.message}`)
      }
    }
  } catch (e: any) {
    errors.push(`Parse error: ${e.message}`)
  }
  return { imported, errors }
}

export function getStorageStats() {
  let totalSize = 0
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      const val = localStorage.getItem(key) || ''
      totalSize += new Blob([val]).size
      count++
    }
  }
  const maxSize = 5 * 1024 * 1024
  return { count, totalSizeKB: Math.round(totalSize / 1024), maxSizeKB: Math.round(maxSize / 1024), percentUsed: ((totalSize / maxSize) * 100).toFixed(1) + '%' }
}
