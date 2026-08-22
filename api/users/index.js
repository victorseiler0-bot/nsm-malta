import { withDB, readDB, id, now, send } from '../_lib/store.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data } = await readDB()
    const users = data.users.slice().sort((a, b) => b.total_points - a.total_points)
    return send(res, 200, users)
  }

  if (req.method === 'POST') {
    const name = (req.body?.name || '').trim()
    if (!name) return send(res, 400, { error: 'name required' })

    let created = null
    let duplicate = false
    await withDB((data) => {
      if (data.users.some((u) => u.name === name)) { duplicate = true; return }
      created = { id: id(), name, total_points: 0, created_at: now() }
      data.users.push(created)
    })

    if (duplicate) return send(res, 409, { error: 'duplicate' })
    return send(res, 201, created)
  }

  return send(res, 405, { error: 'method not allowed' })
}
