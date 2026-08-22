import { readDB, send, safe } from '../_lib/store.js'

async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })
  const { id: userId } = req.query

  const { data } = await readDB()
  const challengeById = Object.fromEntries(data.challenges.map((c) => [c.id, c]))
  const betById = Object.fromEntries(data.bets.map((b) => [b.id, b]))

  const grouped = {}
  let completions = 0
  data.challenge_completions
    .filter((c) => c.user_id === userId)
    .forEach((c) => {
      const ch = challengeById[c.challenge_id]
      if (!ch) return
      completions++
      if (!grouped[c.challenge_id]) {
        grouped[c.challenge_id] = {
          challenge_id: c.challenge_id,
          badge_emoji: ch.badge_emoji,
          badge_name: ch.badge_name,
          title: ch.title,
          points: ch.points,
          count: 0,
        }
      }
      grouped[c.challenge_id].count++
    })

  let betsWon = 0
  let betsTotal = 0
  data.bet_participants
    .filter((p) => p.user_id === userId)
    .forEach((p) => {
      const bet = betById[p.bet_id]
      if (bet?.status === 'resolved') {
        betsTotal++
        if (p.points_result > p.points_wagered) betsWon++
      }
    })

  send(res, 200, { badges: Object.values(grouped), stats: { completions, betsWon, betsTotal } })
}

export default safe(handler)
