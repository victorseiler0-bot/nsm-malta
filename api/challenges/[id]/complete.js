import { withDB, id, now, send, safe } from '../../_lib/store.js'

async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  const { id: challengeId } = req.query
  const { user_id } = req.body || {}
  if (!user_id) return send(res, 400, { error: 'user_id required' })

  let result = null
  await withDB((data) => {
    const ch = data.challenges.find((c) => c.id === challengeId)
    const user = data.users.find((u) => u.id === user_id)
    if (!ch || !user) return
    data.challenge_completions.push({ id: id(), user_id, challenge_id: challengeId, completed_at: now() })
    user.total_points += ch.points
    result = { total_points: user.total_points }
  })

  if (!result) return send(res, 404, { error: 'not found' })
  return send(res, 200, result)
}

export default safe(handler)
