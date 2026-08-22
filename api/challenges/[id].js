import { withDB, send } from '../_lib/store.js'

export default async function handler(req, res) {
  const { id: challengeId } = req.query

  if (req.method === 'PATCH') {
    const { title, description, points, badge_emoji, badge_name } = req.body || {}
    let updated = null
    await withDB((data) => {
      const ch = data.challenges.find((c) => c.id === challengeId)
      if (!ch) return
      if (title !== undefined) ch.title = title
      if (description !== undefined) ch.description = description
      if (points !== undefined) ch.points = Number(points) || 0
      if (badge_emoji !== undefined) ch.badge_emoji = badge_emoji
      if (badge_name !== undefined) ch.badge_name = badge_name
      updated = ch
    })
    if (!updated) return send(res, 404, { error: 'not found' })
    return send(res, 200, updated)
  }

  if (req.method === 'DELETE') {
    let found = false
    await withDB((data) => {
      const ch = data.challenges.find((c) => c.id === challengeId)
      if (!ch) return
      ch.is_active = false
      found = true
    })
    if (!found) return send(res, 404, { error: 'not found' })
    return send(res, 200, { ok: true })
  }

  return send(res, 405, { error: 'method not allowed' })
}
