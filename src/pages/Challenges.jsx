import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'

const EMOJIS = ['🏆', '🔥', '💪', '🎯', '⚡', '🚀', '👑', '💎', '🎖️', '🦁', '🐉', '🌟']

export default function Challenges() {
  const { currentUser, refresh } = useUser()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [completing, setCompleting] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', points: 10, badge_emoji: '🏆', badge_name: '' })
  const [submitting, setSubmitting] = useState(false)
  const [myCompletionCounts, setMyCompletionCounts] = useState({})

  useEffect(() => { fetchAll() }, [currentUser])

  const fetchAll = async () => {
    const [{ data: chs }, { data: comps }] = await Promise.all([
      supabase.from('challenges').select('*, users(name)').eq('is_active', true).order('created_at', { ascending: false }),
      currentUser
        ? supabase.from('challenge_completions').select('challenge_id').eq('user_id', currentUser.id)
        : Promise.resolve({ data: [] }),
    ])
    if (chs) setChallenges(chs)
    if (comps) {
      const counts = {}
      comps.forEach((c) => { counts[c.challenge_id] = (counts[c.challenge_id] || 0) + 1 })
      setMyCompletionCounts(counts)
    }
    setLoading(false)
  }

  const complete = async (challenge) => {
    if (!currentUser || completing) return
    setCompleting(challenge.id)
    try {
      await supabase.from('challenge_completions').insert({ user_id: currentUser.id, challenge_id: challenge.id })
      await supabase.rpc('add_points', { uid: currentUser.id, pts: challenge.points })
      setMyCompletionCounts(prev => ({ ...prev, [challenge.id]: (prev[challenge.id] || 0) + 1 }))
      await refresh()
    } finally {
      setCompleting(null)
    }
  }

  const cancelLast = async (challenge) => {
    if (!currentUser || cancelling) return
    const count = myCompletionCounts[challenge.id] || 0
    if (count === 0) return
    setCancelling(challenge.id)
    try {
      const { data } = await supabase
        .from('challenge_completions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('challenge_id', challenge.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
      if (data) {
        await Promise.all([
          supabase.from('challenge_completions').delete().eq('id', data.id),
          supabase.rpc('add_points', { uid: currentUser.id, pts: -challenge.points })
        ])
        setMyCompletionCounts(prev => ({ ...prev, [challenge.id]: Math.max(0, count - 1) }))
        await refresh()
      }
    } finally {
      setCancelling(null)
    }
  }

  const deleteChallenge = async (id) => {
    await supabase.from('challenges').update({ is_active: false }).eq('id', id)
    setChallenges(prev => prev.filter(c => c.id !== id))
  }

  const createChallenge = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.badge_name.trim()) return
    setSubmitting(true)
    try {
      const { data } = await supabase
        .from('challenges')
        .insert({ ...form, created_by: currentUser.id })
        .select('*, users(name)')
        .single()
      if (data) setChallenges(prev => [data, ...prev])
      setForm({ title: '', description: '', points: 10, badge_emoji: '🏆', badge_name: '' })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="px-4 pt-5 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Défis</h1>
          <p className="text-neutral-500 text-sm">{challenges.length} défi{challenges.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#CF101A] text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-light active:scale-90 transition-transform shadow-lg shadow-[#CF101A]/20"
        >
          {showForm ? '×' : '+'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createChallenge} className="bg-[#141414] border border-[#252525] rounded-2xl p-4 mb-5 space-y-3">
          <p className="text-white font-semibold text-sm">Nouveau défi</p>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Titre</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nager 2km..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Description (optionnel)</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Conditions, détails..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Points</label>
              <input type="number" min="-9999" max="9999" value={form.points} onChange={e => setForm({ ...form, points: parseInt(e.target.value) || 0 })} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Nom du badge</label>
              <input value={form.badge_name} onChange={e => setForm({ ...form, badge_name: e.target.value })} placeholder="Nageur" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2 block">Emoji badge</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setForm({ ...form, badge_emoji: e })}
                  className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.badge_emoji === e ? 'bg-[#CF101A]/20 ring-2 ring-[#CF101A]' : 'bg-[#1a1a1a]'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={submitting || !form.title.trim() || !form.badge_name.trim()}
            className="w-full bg-[#CF101A] text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all">
            {submitting ? 'Création...' : 'Créer le défi'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {challenges.map(ch => {
          const count = myCompletionCounts[ch.id] || 0
          const isCompleting = completing === ch.id
          const isCancelling = cancelling === ch.id
          const isNeg = ch.points < 0

          return (
            <div key={ch.id} className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-0.5">{ch.badge_emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-white font-semibold text-sm leading-tight">{ch.title}</h3>
                    <button onClick={() => deleteChallenge(ch.id)} className="text-neutral-700 hover:text-neutral-500 text-lg leading-none flex-shrink-0 p-1">×</button>
                  </div>
                  {ch.description && <p className="text-neutral-500 text-xs mt-0.5">{ch.description}</p>}

                  <div className="flex items-center justify-between mt-3 gap-2">
                    <div>
                      <span className={`font-bold text-sm ${isNeg ? 'text-red-400' : 'text-[#CF101A]'}`}>
                        {ch.points > 0 ? '+' : ''}{ch.points} pts
                      </span>
                      <span className="text-neutral-600 text-xs ml-2">· {ch.badge_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {count > 0 && (
                        <button
                          onClick={() => cancelLast(ch)}
                          disabled={isCancelling}
                          className="text-neutral-600 hover:text-red-400 text-xs w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center transition-colors active:scale-90"
                          title="Annuler la dernière"
                        >
                          −
                        </button>
                      )}
                      {count > 0 && (
                        <span className="text-neutral-400 text-xs font-semibold bg-[#1a1a1a] px-2 py-1 rounded-full">
                          ×{count}
                        </span>
                      )}
                      <button
                        onClick={() => complete(ch)}
                        disabled={isCompleting || isCancelling}
                        className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                          isNeg
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-[#CF101A] text-white active:bg-[#a80d15]'
                        } disabled:opacity-40`}
                      >
                        {isCompleting ? '...' : isNeg ? "Ça m'est arrivé" : 'Réalisé !'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-20 text-neutral-600">
          <div className="text-4xl mb-3">🎯</div>
          <p>Aucun défi — sois le premier !</p>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="px-4 pt-5 space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#141414] rounded-2xl animate-pulse" />)}
    </div>
  )
}
