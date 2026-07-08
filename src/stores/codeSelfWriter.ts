export interface CodeSnapshot {
  id: string
  filePath: string
  content: string
  timestamp: number
  description: string
}

export interface CodeChange {
  filePath: string
  originalCode: string
  newCode: string
  description: string
  applied: boolean
}

const STORAGE_KEY = 'nh_codesnap'
const MAX_SNAPSHOTS = 30

function load(): CodeSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(snaps: CodeSnapshot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps))
}

let snapshots = load()
let listeners: (() => void)[] = []

export function useCodeSelfWriter() {
  function subscribe(fn: () => void) { listeners.push(fn) }

  function snapshot(original: string, description: string): CodeSnapshot {
    const s: CodeSnapshot = {
      id: `snap-${Date.now()}`,
      filePath: 'src/App.vue',
      content: original,
      timestamp: Date.now(),
      description,
    }
    snapshots.push(s)
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS)
    save(snapshots)
    listeners.forEach(f => f())
    return s
  }

  function getSnapshots(): CodeSnapshot[] { return [...snapshots].reverse() }

  function rollback(snapId: string): CodeSnapshot | null {
    const idx = snapshots.findIndex(s => s.id === snapId)
    if (idx < 0) return null
    const target = snapshots[idx]
    snapshots.push({
      id: `rollback-${Date.now()}`,
      filePath: target.filePath,
      content: '',
      timestamp: Date.now(),
      description: `回滚到: ${target.description}`,
    })
    save(snapshots)
    listeners.forEach(f => f())
    return target
  }

  function genCodeChange(request: string): CodeChange {
    const change: CodeChange = {
      filePath: '未指定',
      originalCode: '',
      newCode: '',
      description: request,
      applied: false,
    }
    return change
  }

  function getLastSnapshot(): CodeSnapshot | null {
    return snapshots.length ? snapshots[snapshots.length - 1] : null
  }

  function clear() { snapshots = []; save(snapshots); listeners.forEach(f => f()) }

  return { snapshot, getSnapshots, rollback, genCodeChange, getLastSnapshot, clear, subscribe }
}
