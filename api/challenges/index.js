import { withDB, readDB, id, now, send } from '../_lib/store.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data } = await readDB()
    const userId = req.query.user_id || null
    const userById = Object.fromEntries(data.users.map((u) => [u.id, u]))

    const challenges = data.challenges
      .filter((c) => c.is_active !== false)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((c) => ({
        ...c,
        creator_name: userById[c.created_by]?.name || null,
        my_count: userId
          ? data.challenge_completions.filter((k) => k.challenge_id === c.id && k.user_id === userId).length
          : 0,
      }))

    return send(res, 200, challenges)
  }

  if (req.method === 'POST') {
    const { title, description, points, badge_emoji, badge_name, created_by } = req.body || {}
    if (!title?.trim() || !badge_name?.trim() || !created_by) return send(res, 400, { error: 'missing fields' })

    let created = null
    let creatorName = null
    await withDB((data) => {
      created = {
        id: id(),
        title: title.trim(),
        description: description?.trim() || '',
        points: Number(points) || 0,
        badge_emoji: badge_emoji || '🏆',
        badge_name: badge_name.trim(),
        is_active: true,
        created_by,
        created_at: now(),
      }
      data.challenges.push(created)
      creatorName = data.users.find((u) => u.id === created_by)?.name || null
    })

    return send(res, 201, { ...created, creator_name: creatorName, my_count: 0 })
  }

  return send(res, 405, { error: 'method not allowed' })
}
