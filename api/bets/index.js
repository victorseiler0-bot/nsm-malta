import { withDB, readDB, id, now, send } from '../_lib/store.js'

function withJoins(bet, data, userById) {
  const participants = data.bet_participants
    .filter((p) => p.bet_id === bet.id)
    .map((p) => ({ ...p, users: { name: userById[p.user_id]?.name || null } }))
  return { ...bet, users: { name: userById[bet.creator_id]?.name || null }, bet_participants: participants }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data } = await readDB()
    const userById = Object.fromEntries(data.users.map((u) => [u.id, u]))
    const bets = data.bets
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((b) => withJoins(b, data, userById))
    return send(res, 200, bets)
  }

  if (req.method === 'POST') {
    const { title, description, creator_id, deadline } = req.body || {}
    if (!title?.trim() || !creator_id) return send(res, 400, { error: 'missing fields' })

    let created = null
    let joined = null
    await withDB((data) => {
      created = {
        id: id(),
        title: title.trim(),
        description: description?.trim() || null,
        creator_id,
        deadline: deadline || null,
        status: 'open',
        result: null,
        resolved_at: null,
        created_at: now(),
      }
      data.bets.push(created)
      const userById = Object.fromEntries(data.users.map((u) => [u.id, u]))
      joined = withJoins(created, data, userById)
    })

    return send(res, 201, joined)
  }

  return send(res, 405, { error: 'method not allowed' })
}
