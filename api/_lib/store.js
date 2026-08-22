import { put, get } from '@vercel/blob'
import { text } from 'node:stream/consumers'
import { randomUUID } from 'node:crypto'

const DB_PATH = 'db.json'

function emptyDB() {
  return { users: [], challenges: [], challenge_completions: [], bets: [], bet_participants: [] }
}

export async function readDB() {
  const result = await get(DB_PATH, { access: 'private', useCache: false })
  if (!result) return { data: emptyDB() }
  const raw = await text(result.stream)
  return { data: JSON.parse(raw) }
}

async function writeDB(data) {
  const body = JSON.stringify(data)
  return put(DB_PATH, body, { access: 'private', allowOverwrite: true, contentType: 'application/json' })
}

// Reads the DB, lets `mutate` change it in place, writes it back.
// No locking: this is a small trusted friend group, true simultaneous
// writes are rare enough that a last-write-wins retry is good enough.
export async function withDB(mutate) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await readDB()
      const result = await mutate(data)
      await writeDB(data)
      return result
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error('Could not write DB after retries')
}

export function id() {
  return randomUUID()
}

export function now() {
  return new Date().toISOString()
}

export function userPublic(u) {
  return { id: u.id, name: u.name, total_points: u.total_points, created_at: u.created_at }
}

export function send(res, status, body) {
  res.status(status).json(body)
}

// Wraps a handler so a thrown error becomes a JSON 500 instead of an
// opaque Vercel crash page the frontend can't parse.
export function safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res)
    } catch (err) {
      send(res, 500, { error: err.message || 'server error' })
    }
  }
}
