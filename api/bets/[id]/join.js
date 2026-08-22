import { withDB, id, send } from '../../_lib/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  const { id: betId } = req.query
  const { user_id, side, amount } = req.body || {}
  const amt = Number(amount)
  if (!user_id || !side || !(amt > 0)) return send(res, 400, { error: 'invalid payload' })

  let status = 200
  let result = { ok: true }
  await withDB((data) => {
    const bet = data.bets.find((b) => b.id === betId)
    const user = data.users.find((u) => u.id === user_id)
    if (!bet || !user) { status = 404; result = { error: 'not found' }; return }
    if (bet.status !== 'open') { status = 409; result = { error: 'bet not open' }; return }
    if (data.bet_participants.some((p) => p.bet_id === betId && p.user_id === user_id)) {
      status = 409; result = { error: 'already joined' }; return
    }
    if (user.total_points < amt) { status = 400; result = { error: 'not enough points' }; return }

    data.bet_participants.push({ id: id(), bet_id: betId, user_id, side, points_wagered: amt, points_result: 0 })
    user.total_points -= amt
    result = { ok: true, total_points: user.total_points }
  })

  return send(res, status, result)
}
