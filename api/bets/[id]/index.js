import { withDB, now, send, safe } from '../../_lib/store.js'

function withJoins(bet, data, userById) {
  const participants = data.bet_participants
    .filter((p) => p.bet_id === bet.id)
    .map((p) => ({ ...p, users: { name: userById[p.user_id]?.name || null } }))
  return { ...bet, users: { name: userById[bet.creator_id]?.name || null }, bet_participants: participants }
}

async function handler(req, res) {
  if (req.method !== 'PATCH') return send(res, 405, { error: 'method not allowed' })
  const { id: betId } = req.query
  const { action } = req.body || {}

  let result = null
  let notFound = false
  await withDB((data) => {
    const bet = data.bets.find((b) => b.id === betId)
    if (!bet) { notFound = true; return }

    if (action === 'edit') {
      const { title, description, deadline } = req.body
      if (title !== undefined) bet.title = title
      if (description !== undefined) bet.description = description
      if (deadline !== undefined) bet.deadline = deadline
    } else if (action === 'close') {
      bet.status = 'closed'
    } else if (action === 'resolve') {
      const { result: outcome } = req.body
      const participants = data.bet_participants.filter((p) => p.bet_id === betId)
      const forPool = participants.filter((p) => p.side === 'for').reduce((s, p) => s + p.points_wagered, 0)
      const againstPool = participants.filter((p) => p.side === 'against').reduce((s, p) => s + p.points_wagered, 0)
      const totalPool = forPool + againstPool

      for (const p of participants) {
        let payout = 0
        if (outcome === 'null') {
          payout = p.points_wagered
        } else {
          const won = (outcome === 'win' && p.side === 'for') || (outcome === 'lose' && p.side === 'against')
          if (won) {
            const myPool = p.side === 'for' ? forPool : againstPool
            payout = myPool > 0 ? Math.floor(p.points_wagered + (p.points_wagered / myPool) * (totalPool - myPool)) : p.points_wagered
          }
        }
        if (payout > 0) {
          p.points_result = payout
          const user = data.users.find((u) => u.id === p.user_id)
          if (user) user.total_points += payout
        }
      }

      bet.status = 'resolved'
      bet.result = outcome
      bet.resolved_at = now()
    } else {
      notFound = true
      return
    }

    const userById = Object.fromEntries(data.users.map((u) => [u.id, u]))
    result = withJoins(bet, data, userById)
  })

  if (notFound || !result) return send(res, 404, { error: 'not found' })
  return send(res, 200, result)
}

export default safe(handler)
