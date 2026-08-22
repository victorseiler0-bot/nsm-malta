import { withDB, now, send, safe } from '../../_lib/store.js'

function withJoins(bet, data, userById) {
  const participants = data.bet_participants
    .filter((p) => p.bet_id === bet.id)
    .map((p) => ({ ...p, users: { name: userById[p.user_id]?.name || null } }))
  return { ...bet, users: { name: userById[bet.creator_id]?.name || null }, bet_participants: participants }
}

async function handler(req, res) {
  const { id: betId } = req.query

  if (req.method === 'DELETE') {
    let found = false
    await withDB((data) => {
      const before = data.bets.length
      data.bets = data.bets.filter((b) => b.id !== betId)
      found = data.bets.length !== before
      data.bet_participants = data.bet_participants.filter((p) => p.bet_id !== betId)
    })
    if (!found) return send(res, 404, { error: 'not found' })
    return send(res, 200, { ok: true })
  }

  if (req.method !== 'PATCH') return send(res, 405, { error: 'method not allowed' })
  const { action } = req.body || {}

  let result = null
  let notFound = false
  await withDB((data) => {
    const bet = data.bets.find((b) => b.id === betId)
    if (!bet) { notFound = true; return }

    if (action === 'edit') {
      const { title, description, choice1_label, choice2_label, badge_emoji, badge_name } = req.body
      if (title !== undefined) bet.title = title
      if (description !== undefined) bet.description = description
      if (choice1_label !== undefined) bet.choice1_label = choice1_label?.trim() || 'Choix 1'
      if (choice2_label !== undefined) bet.choice2_label = choice2_label?.trim() || 'Choix 2'
      if (badge_emoji !== undefined) bet.badge_emoji = badge_emoji
      if (badge_name !== undefined) bet.badge_name = badge_name?.trim() || bet.title
    } else if (action === 'set_cote') {
      const cote = Number(req.body.cote)
      const side = req.body.side
      if (!(cote > 1) || !['for', 'against', 'null'].includes(side)) { notFound = true; return }
      if (side === 'for') bet.cote_for = cote
      else if (side === 'against') bet.cote_against = cote
      else bet.cote_null = cote
    } else if (action === 'close') {
      bet.status = 'closed'
    } else if (action === 'resolve') {
      const { result: outcome } = req.body
      const participants = data.bet_participants.filter((p) => p.bet_id === betId)
      const coteFor = bet.cote_for || 2
      const coteAgainst = bet.cote_against || 2
      const coteNull = bet.cote_null || 2

      for (const p of participants) {
        let payout = 0
        if (outcome === 'null') {
          payout = Math.floor(p.points_wagered * coteNull)
        } else {
          const won = (outcome === 'win' && p.side === 'for') || (outcome === 'lose' && p.side === 'against')
          if (won) payout = Math.floor(p.points_wagered * (p.side === 'for' ? coteFor : coteAgainst))
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
