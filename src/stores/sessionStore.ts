import { openDB, type IDBPDatabase } from 'idb'

export interface SessionMessage {
  role: string
  content: string
  agent?: string
  time: number
  codeBlocks?: { lang: string; code: string }[]
  reasoning?: string
}

export interface Session {
  id: string
  title: string
  messages: SessionMessage[]
  createdAt: number
  updatedAt: number
  model?: string
  mode?: string
}

const DB_NAME = 'nh_sessions'
const STORE_NAME = 'sessions'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, session)
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function createSession(title?: string): Promise<Session> {
  const session: Session = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title || '新的对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await saveSession(session)
  return session
}

export async function cleanupOldSessions(maxSessions = 50): Promise<void> {
  const sessions = await listSessions()
  if (sessions.length > maxSessions) {
    const toDelete = sessions.slice(maxSessions)
    for (const s of toDelete) {
      await deleteSession(s.id)
    }
  }
}
