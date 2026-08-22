import { withDB, readDB, send } from '../_lib/store.js'

export default async function handler(req, res) {
  const { id: userId } = req.query

  if (req.method === 'GET') {
    const { data } = await readDB()
    const user = data.users.find((u) => u.id === userId)
    if (!user) return send(res, 404, { error: 'not found' })
    return send(res, 200, user)
  }

  if (req.method === 'DELETE') {
    let found = false
    await withDB((data) => {
      const before = data.users.length
      data.users = data.users.filter((u) => u.id !== userId)
      found = data.users.length !== before
      data.challenge_completions = data.challenge_completions.filter((c) => c.user_id !== userId)
      data.bet_participants = data.bet_participants.filter((p) => p.user_id !== userId)
    })
    if (!found) return send(res, 404, { error: 'not found' })
    return send(res, 200, { ok: true })
  }

  return send(res, 405, { error: 'method not allowed' })
}
