import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Home() {
  const { currentUser, refresh } = useUser()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [giftTarget, setGiftTarget] = useState(null)
  const [giftAmount, setGiftAmount] = useState(10)
  const [gifting, setGifting] = useState(false)
  const [giftError, setGiftError] = useState('')

  useEffect(() => {
    fetchLeaderboard()
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchLeaderboard)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('users').select('*').order('total_points', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const openGift = (user) => {
    setGiftTarget(user)
    setGiftAmount(10)
    setGiftError('')
  }

  const sendGift = async () => {
    if (!giftTarget || !currentUser || gifting) return
    const amt = parseInt(giftAmount) || 0
    if (amt <= 0) { setGiftError('Mets un montant positif'); return }

    // Check sender has enough — block if they don't have enough
    const fresh = users.find(u => u.id === currentUser.id)
    if (fresh && fresh.total_points < amt) {
      setGiftError(`Tu n'as que ${fresh.total_points} pts`)
      return
    }

    setGifting(true)
    setGiftError('')
    try {
      await Promise.all([
        supabase.rpc('add_points', { uid: currentUser.id, pts: -amt }),
        supabase.rpc('add_points', { uid: giftTarget.id, pts: amt }),
      ])
      await Promise.all([fetchLeaderboard(), refresh()])
      setGiftTarget(null)
    } catch {
      setGiftError('Erreur, réessaie')
    } finally {
      setGifting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-2xl font-bold text-white mb-1">Classement</h1>
      <p className="text-neutral-500 text-sm mb-6">{users.length} joueur{users.length !== 1 ? 's' : ''}</p>

      <div className="space-y-2">
        {users.map((user, i) => {
          const isMe = user.id === currentUser?.id
          const isNeg = user.total_points < 0
          return (
            <div key={user.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                isMe ? 'bg-[#1e0a0b] border-[#CF101A]/30' : 'bg-[#141414] border-[#1e1e1e]'
              }`}
            >
              <span className="text-2xl w-8 text-center flex-shrink-0">
                {i < 3
                  ? MEDALS[i]
                  : <span className="text-neutral-600 text-base font-bold">{i + 1}</span>
                }
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${isMe ? 'text-white' : 'text-neutral-200'}`}>{user.name}</span>
                  {isMe && <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF101A] bg-[#CF101A]/10 px-1.5 py-0.5 rounded flex-shrink-0">toi</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isMe && currentUser && (
                  <button
                    onClick={() => openGift(user)}
                    className="text-neutral-600 hover:text-[#CF101A] transition-colors text-base active:scale-90"
                    title={`Donner des points à ${user.name}`}
                  >
                    🎁
                  </button>
                )}
                <div className="text-right">
                  <span className={`text-lg font-bold ${isMe ? 'text-[#CF101A]' : isNeg ? 'text-red-400' : 'text-white'}`}>
                    {isNeg ? '' : ''}{user.total_points}
                  </span>
                  <span className="text-neutral-500 text-xs ml-1">pts</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-20 text-neutral-600">
          <div className="text-4xl mb-3">🏆</div>
          <p>Soyez les premiers à marquer des points !</p>
        </div>
      )}

      {/* Gift modal */}
      {giftTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 pb-8 px-4" onClick={e => { if (e.target === e.currentTarget) setGiftTarget(null) }}>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div>
              <p className="text-white font-bold text-base">Donner des points</p>
              <p className="text-neutral-500 text-sm">à <span className="text-white font-semibold">{giftTarget.name}</span></p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500">Montant</label>
                <span className="text-neutral-600 text-xs">Ton solde : {users.find(u => u.id === currentUser?.id)?.total_points ?? 0} pts</span>
              </div>
              <input
                type="number"
                min="1"
                value={giftAmount}
                onChange={e => { setGiftAmount(e.target.value); setGiftError('') }}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-lg font-bold text-center focus:outline-none focus:border-[#CF101A]"
                autoFocus
              />
            </div>

            {giftError && <p className="text-red-400 text-sm text-center">{giftError}</p>}

            <div className="flex gap-2">
              <button onClick={() => setGiftTarget(null)} className="flex-1 py-3 bg-[#1a1a1a] text-neutral-400 font-medium rounded-xl text-sm">Annuler</button>
              <button
                onClick={sendGift}
                disabled={gifting || !giftAmount}
                className="flex-1 py-3 bg-[#CF101A] text-white font-semibold rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                {gifting ? '...' : `Donner ${giftAmount || 0} pts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="px-4 pt-5 space-y-2">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#141414] rounded-2xl animate-pulse" />)}
    </div>
  )
}
