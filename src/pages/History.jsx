import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const RESULT_LABEL = { win: 'Réussi ✓', lose: 'Raté ✗', null: 'Nul' }

function timeAgo(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function History() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 20000)
    return () => clearInterval(interval)
  }, [])

  const fetchHistory = async () => {
    const data = await api.get('/history')
    setEvents(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="px-4 pt-5 space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#141414] rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-2xl font-bold text-white mb-1">Historique</h1>
      <p className="text-neutral-500 text-sm mb-6">{events.length} événement{events.length !== 1 ? 's' : ''}</p>

      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-4">
            {e.type === 'defi' ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{e.badge_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    <span className="font-semibold">{e.user_name}</span> a réalisé <span className="font-semibold">{e.title}</span>
                  </p>
                  <p className="text-neutral-600 text-xs mt-0.5">{timeAgo(e.at)}</p>
                </div>
                <span className={`text-sm font-bold ${e.points < 0 ? 'text-red-400' : 'text-[#CF101A]'}`}>
                  {e.points > 0 ? '+' : ''}{e.points}
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white text-sm font-semibold">🎲 {e.title}</p>
                  <span className={`text-xs font-semibold ${e.result === 'win' ? 'text-green-400' : e.result === 'lose' ? 'text-red-400' : 'text-neutral-400'}`}>
                    {RESULT_LABEL[e.result] ?? e.result}
                  </span>
                </div>
                <p className="text-neutral-600 text-xs mt-0.5">{timeAgo(e.at)}</p>
                {e.participants.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {e.participants.map((p, j) => (
                      <div key={j} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">{p.user_name} ({p.side === 'for' ? 'pour' : 'contre'})</span>
                        <span className={p.points_result > p.points_wagered ? 'text-green-400' : p.points_result > 0 ? 'text-neutral-400' : 'text-red-400'}>
                          {p.points_result > 0 ? `+${p.points_result}` : `-${p.points_wagered}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 text-neutral-600">
          <div className="text-4xl mb-3">📜</div>
          <p>Rien encore — les défis réalisés et paris terminés apparaîtront ici.</p>
        </div>
      )}
    </div>
  )
}
