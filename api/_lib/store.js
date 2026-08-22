import { put, get } from '@vercel/blob'
import { text } from 'node:stream/consumers'
import { randomUUID } from 'node:crypto'

const DB_PATH = 'db.json'

function emptyDB() {
  return { users: [], challenges: [], challenge_completions: [], bets: [], bet_participants: [] }
}

export async function readDB() {
  const result = await get(DB_PATH, { access: 'private' })
  if (!result) return { data: emptyDB(), etag: null }
  const raw = await text(result.stream)
  return { data: JSON.parse(raw), etag: result.blob.etag }
}

async function writeDB(data, etag) {
  const body = JSON.stringify(data)
  const opts = { access: 'private', allowOverwrite: true, contentType: 'application/json' }
  if (etag) opts.ifMatch = etag
  return put(DB_PATH, body, opts)
}

// Reads the DB, lets `mutate` change it in place, writes it back.
// Retries the whole read-mutate-write cycle if a concurrent write raced us.
export async function withDB(mutate) {
  let lastErr
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await readDB()
    const result = await mutate(data)
    try {
      await writeDB(data, etag)
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
