import { withDB, send } from './_lib/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
  const { from, to, amount } = req.body || {}
  const amt = Number(amount)
  if (!from || !to || from === to || !(amt > 0)) return send(res, 400, { error: 'invalid payload' })

  let status = 200
  let result = { ok: true }
  await withDB((data) => {
    const sender = data.users.find((u) => u.id === from)
    const recipient = data.users.find((u) => u.id === to)
    if (!sender || !recipient) { status = 404; result = { error: 'not found' }; return }
    if (sender.total_points < amt) { status = 400; result = { error: 'not enough points' }; return }

    sender.total_points -= amt
    recipient.total_points += amt
    result = { ok: true, sender_points: sender.total_points }
  })

  return send(res, status, result)
}
