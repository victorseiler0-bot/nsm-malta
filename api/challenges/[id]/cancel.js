import { withDB, send } from '../../_lib/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  const { id: challengeId } = req.query
  const { user_id } = req.body || {}
  if (!user_id) return send(res, 400, { error: 'user_id required' })

  let result = null
  await withDB((data) => {
    const ch = data.challenges.find((c) => c.id === challengeId)
    const user = data.users.find((u) => u.id === user_id)
    if (!ch || !user) return

    const mine = data.challenge_completions
      .filter((k) => k.challenge_id === challengeId && k.user_id === user_id)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    const last = mine[0]
    if (!last) { result = { total_points: user.total_points }; return }

    data.challenge_completions = data.challenge_completions.filter((k) => k.id !== last.id)
    user.total_points -= ch.points
    result = { total_points: user.total_points }
  })

  if (!result) return send(res, 404, { error: 'not found' })
  return send(res, 200, result)
}
