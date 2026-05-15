import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'

export default function Profile() {
  const { currentUser } = useUser()
  const [badges, setBadges] = useState([])
  const [stats, setStats] = useState({ completions: 0, betsWon: 0, betsTotal: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    fetchProfile()
  }, [currentUser])

  const fetchProfile = async () => {
    const [{ data: comps }, { data: betsData }] = await Promise.all([
      supabase
        .from('challenge_completions')
        .select('challenge_id, completed_at, challenges(badge_emoji, badge_name, title, points)')
        .eq('user_id', currentUser.id),
      supabase
        .from('bet_participants')
        .select('bet_id, side, points_wagered, points_result, bets(status, result)')
        .eq('user_id', currentUser.id),
    ])

    if (comps) {
      const grouped = {}
      comps.forEach((c) => {
        const ch = c.challenges
        if (!ch) return
        const key = c.challenge_id
        if (!grouped[key]) {
          grouped[key] = {
            challenge_id: key,
            badge_emoji: ch.badge_emoji,
            badge_name: ch.badge_name,
            title: ch.title,
            points: ch.points,
            count: 0,
          }
        }
        grouped[key].count++
      })
      setBadges(Object.values(grouped))

      let betsWon = 0
      let betsTotal = 0
      if (betsData) {
        betsData.forEach((p) => {
          if (p.bets?.status === 'resolved') {
            betsTotal++
            if (p.points_result > p.points_wagered) betsWon++
          }
        })
      }
      setStats({ completions: comps.length, betsWon, betsTotal })
    }
    setLoading(false)
  }

  if (!currentUser) return null

  return (
    <div className="px-4 pt-5 pb-6">
      {/* Header */}
      <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#CF101A]/20 border border-[#CF101A]/30 flex items-center justify-center">
            <span className="text-2xl font-black text-[#CF101A]">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
            <p className="text-neutral-500 text-sm">
              Membre depuis {new Date(currentUser.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#0a0a0a] rounded-xl p-3 text-center">
            <p className="text-[#CF101A] text-xl font-black">{currentUser.total_points}</p>
            <p className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5">Points</p>
          </div>
          <div className="bg-[#0a0a0a] rounded-xl p-3 text-center">
            <p className="text-white text-xl font-black">{stats.completions}</p>
            <p className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5">Défis</p>
          </div>
          <div className="bg-[#0a0a0a] rounded-xl p-3 text-center">
            <p className="text-white text-xl font-black">
              {stats.betsTotal > 0 ? `${stats.betsWon}/${stats.betsTotal}` : '—'}
            </p>
            <p className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5">Paris</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-white font-bold text-base mb-3">
          Badges
          {badges.length > 0 && (
            <span className="text-neutral-500 font-normal text-sm ml-2">{badges.length}</span>
          )}
        </h3>

        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-[#141414] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : badges.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {badges.map((b) => (
              <div
                key={b.challenge_id}
                className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-3 flex flex-col items-center gap-1.5 relative"
              >
                <span className="text-3xl">{b.badge_emoji}</span>
                <p className="text-white text-xs font-semibold text-center leading-tight">{b.badge_name}</p>
                <p className="text-neutral-600 text-[10px] text-center">+{b.points} pts</p>
                {b.count > 1 && (
                  <span className="absolute top-2 right-2 bg-[#CF101A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {b.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-600">
            <div className="text-4xl mb-3">🏅</div>
            <p>Complète des défis pour gagner des badges !</p>
          </div>
        )}
      </div>
    </div>
  )
}
