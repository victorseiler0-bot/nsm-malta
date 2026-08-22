import { readDB, send, safe } from './_lib/store.js'

async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })

  const { data } = await readDB()
  const userById = Object.fromEntries(data.users.map((u) => [u.id, u]))
  const challengeById = Object.fromEntries(data.challenges.map((c) => [c.id, c]))

  const defiEvents = data.challenge_completions.map((c) => {
    const ch = challengeById[c.challenge_id]
    return {
      type: 'defi',
      at: c.completed_at,
      user_name: userById[c.user_id]?.name || 'quelqu\'un',
      title: ch?.title || 'Défi supprimé',
      badge_emoji: ch?.badge_emoji || '🏆',
      points: ch?.points ?? 0,
    }
  })

  const betEvents = data.bets
    .filter((b) => b.status === 'resolved')
    .map((b) => ({
      type: 'pari',
      at: b.resolved_at,
      title: b.title,
      result: b.result,
      participants: data.bet_participants
        .filter((p) => p.bet_id === b.id)
        .map((p) => ({
          user_name: userById[p.user_id]?.name || 'quelqu\'un',
          side: p.side,
          points_wagered: p.points_wagered,
          points_result: p.points_result,
        })),
    }))

  const events = [...defiEvents, ...betEvents].sort((a, b) => new Date(b.at) - new Date(a.at))
  send(res, 200, events)
}

export default safe(handler)
