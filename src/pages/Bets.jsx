import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'

const STATUS_LABEL = { open: 'Ouvert', closed: 'Mises fermées', resolved: 'Terminé', cancelled: 'Annulé' }
const STATUS_COLOR = { open: 'text-green-400', closed: 'text-orange-400', resolved: 'text-neutral-400', cancelled: 'text-neutral-600' }

export default function Bets() {
  const { currentUser, refresh } = useUser()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', deadline: '' })
  const [submitting, setSubmitting] = useState(false)
  const [joiningBet, setJoiningBet] = useState(null)
  const [joinData, setJoinData] = useState({ side: 'for', amount: 10 })
  const [myParticipations, setMyParticipations] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [currentUser])

  const fetchAll = async () => {
    const [{ data: betsData }, { data: partsData }] = await Promise.all([
      supabase.from('bets').select('*, users(name), bet_participants(*, users(name))').order('created_at', { ascending: false }),
      currentUser
        ? supabase.from('bet_participants').select('bet_id, side, points_wagered').eq('user_id', currentUser.id)
        : Promise.resolve({ data: [] }),
    ])
    if (betsData) setBets(betsData)
    if (partsData) {
      const map = {}
      partsData.forEach(p => { map[p.bet_id] = p })
      setMyParticipations(map)
    }
    setLoading(false)
  }

  const createBet = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const { data } = await supabase.from('bets')
        .insert({ title: form.title.trim(), description: form.description.trim() || null, creator_id: currentUser.id, deadline: form.deadline || null })
        .select('*, users(name), bet_participants(*, users(name))').single()
      if (data) setBets(prev => [data, ...prev])
      setForm({ title: '', description: '', deadline: '' })
      setShowForm(false)
    } finally { setSubmitting(false) }
  }

  const joinBet = async (bet) => {
    if (!currentUser || myParticipations[bet.id]) return
    if (currentUser.total_points < joinData.amount) { alert(`Tu n'as que ${currentUser.total_points} points`); return }
    try {
      await Promise.all([
        supabase.from('bet_participants').insert({ bet_id: bet.id, user_id: currentUser.id, side: joinData.side, points_wagered: joinData.amount }),
        supabase.rpc('add_points', { uid: currentUser.id, pts: -joinData.amount }),
      ])
      await Promise.all([fetchAll(), refresh()])
      setJoiningBet(null)
    } catch { alert('Erreur en rejoignant le pari') }
  }

  const closeBet = async (bet) => {
    await supabase.from('bets').update({ status: 'closed' }).eq('id', bet.id)
    setBets(prev => prev.map(b => b.id === bet.id ? { ...b, status: 'closed' } : b))
  }

  const resolveBet = async (bet, result) => {
    try {
      const participants = bet.bet_participants || []
      const forPool = participants.filter(p => p.side === 'for').reduce((s, p) => s + p.points_wagered, 0)
      const againstPool = participants.filter(p => p.side === 'against').reduce((s, p) => s + p.points_wagered, 0)
      const totalPool = forPool + againstPool
      const updates = []
      for (const p of participants) {
        let payout = 0
        if (result === 'null') {
          payout = p.points_wagered
        } else {
          const won = (result === 'win' && p.side === 'for') || (result === 'lose' && p.side === 'against')
          if (won) {
            const myPool = p.side === 'for' ? forPool : againstPool
            payout = myPool > 0 ? Math.floor(p.points_wagered + (p.points_wagered / myPool) * (totalPool - myPool)) : p.points_wagered
          }
        }
        if (payout > 0) {
          updates.push(supabase.rpc('add_points', { uid: p.user_id, pts: payout }))
          updates.push(supabase.from('bet_participants').update({ points_result: payout }).eq('id', p.id))
        }
      }
      await Promise.all([
        supabase.from('bets').update({ status: 'resolved', result, resolved_at: new Date().toISOString() }).eq('id', bet.id),
        ...updates,
      ])
      await Promise.all([fetchAll(), refresh()])
    } catch { alert('Erreur lors de la résolution') }
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await supabase.from('bets').update({ title: editForm.title, description: editForm.description || null, deadline: editForm.deadline || null }).eq('id', id)
      setBets(prev => prev.map(b => b.id === id ? { ...b, ...editForm, description: editForm.description || null, deadline: editForm.deadline || null } : b))
      setEditingId(null)
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="px-4 pt-5 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Paris</h1>
          <p className="text-neutral-500 text-sm">Solde : <span className="text-white font-semibold">{currentUser?.total_points ?? 0}</span> pts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[#CF101A] text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-light active:scale-90 transition-transform shadow-lg shadow-[#CF101A]/20">
          {showForm ? '×' : '+'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createBet} className="bg-[#141414] border border-[#252525] rounded-2xl p-4 mb-5 space-y-3">
          <p className="text-white font-semibold text-sm">Nouveau pari</p>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Je vais courir 10km cette semaine..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Conditions, précisions..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Date limite (optionnel)</label>
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
          </div>
          <button type="submit" disabled={submitting || !form.title.trim()} className="w-full bg-[#CF101A] text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all">
            {submitting ? 'Création...' : 'Lancer le pari'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {bets.map(bet => {
          const myPart = myParticipations[bet.id]
          const participants = bet.bet_participants || []
          const forPool = participants.filter(p => p.side === 'for').reduce((s, p) => s + p.points_wagered, 0)
          const againstPool = participants.filter(p => p.side === 'against').reduce((s, p) => s + p.points_wagered, 0)
          const isCreator = bet.creator_id === currentUser?.id
          const isOpen = bet.status === 'open'
          const isClosed = bet.status === 'closed'
          const isResolved = bet.status === 'resolved'
          const isPastDeadline = bet.deadline && new Date(bet.deadline) < new Date()
          const canJoin = (isOpen || isClosed) && !myPart && currentUser && !isPastDeadline && isOpen
          const isEditing = editingId === bet.id

          return (
            <div key={bet.id} className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-4">

              {/* Edit form */}
              {isEditing ? (
                <div className="space-y-2 mb-3">
                  <p className="text-[#CF101A] text-xs font-semibold uppercase tracking-wider">Modifier</p>
                  <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CF101A]" placeholder="Titre" />
                  <input value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CF101A]" placeholder="Description" />
                  <input type="date" value={editForm.deadline || ''} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-[#1a1a1a] text-neutral-400 text-sm rounded-xl">Annuler</button>
                    <button onClick={() => saveEdit(bet.id)} disabled={saving} className="flex-1 py-2 bg-[#CF101A] text-white text-sm font-semibold rounded-xl disabled:opacity-40">{saving ? '...' : 'Enregistrer'}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm leading-tight">{bet.title}</p>
                    {bet.description && <p className="text-neutral-500 text-xs mt-0.5">{bet.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-neutral-600 text-xs">par {bet.users?.name}</span>
                      {bet.deadline && (
                        <span className={`text-xs font-medium ${isPastDeadline && !isResolved ? 'text-orange-400' : 'text-neutral-600'}`}>
                          · {isPastDeadline ? '⏰ délai dépassé' : `jusqu'au ${new Date(bet.deadline).toLocaleDateString('fr-FR')}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCreator && !isResolved && (
                      <button onClick={() => { setEditingId(bet.id); setEditForm({ title: bet.title, description: bet.description || '', deadline: bet.deadline ? bet.deadline.split('T')[0] : '' }) }}
                        className="text-neutral-600 hover:text-neutral-400 text-sm p-1 transition-colors">✏️</button>
                    )}
                    <span className={`text-xs font-semibold ${STATUS_COLOR[bet.status]}`}>{STATUS_LABEL[bet.status]}</span>
                  </div>
                </div>
              )}

              {/* Pool display */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
                  <p className="text-green-400 font-bold text-sm">{forPool}</p>
                  <p className="text-green-600 text-[10px] uppercase tracking-wider">Pour</p>
                </div>
                <div className="flex-1 rounded-xl p-2.5 text-center" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
                  <p className="text-red-400 font-bold text-sm">{againstPool}</p>
                  <p className="text-red-600 text-[10px] uppercase tracking-wider">Contre</p>
                </div>
              </div>

              {/* Participants */}
              {participants.length > 0 && (
                <div className="mb-3 space-y-1">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{p.users?.name}</span>
                      <span className={p.side === 'for' ? 'text-green-400' : 'text-red-400'}>
                        {p.side === 'for' ? '↑' : '↓'} {p.points_wagered} pts
                        {bet.status === 'resolved' && p.points_result > 0 && <span className="text-neutral-500"> → +{p.points_result}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Join */}
              {canJoin && (
                joiningBet === bet.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => setJoinData({ ...joinData, side: 'for' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${joinData.side === 'for' ? 'bg-green-500 text-white' : 'bg-[#1a1a1a] text-neutral-400'}`}>Pour ✓</button>
                      <button onClick={() => setJoinData({ ...joinData, side: 'against' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${joinData.side === 'against' ? 'bg-red-500 text-white' : 'bg-[#1a1a1a] text-neutral-400'}`}>Contre ✗</button>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min="1" max={currentUser.total_points} value={joinData.amount}
                        onChange={e => setJoinData({ ...joinData, amount: parseInt(e.target.value) || 1 })}
                        className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
                      <button onClick={() => joinBet(bet)} className="bg-[#CF101A] text-white font-semibold px-4 rounded-xl text-sm active:scale-95">Miser</button>
                      <button onClick={() => setJoiningBet(null)} className="bg-[#1a1a1a] text-neutral-400 px-3 rounded-xl text-sm">✕</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setJoiningBet(bet.id); setJoinData({ side: 'for', amount: 10 }) }}
                    className="w-full py-2.5 bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-300 text-sm font-medium rounded-xl active:scale-95 transition-all">
                    Parier
                  </button>
                )
              )}

              {/* My participation badge */}
              {myPart && (isOpen || isClosed) && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 bg-[#1a1a1a] rounded-xl px-3 py-2">
                  Tu as misé <span className={myPart.side === 'for' ? 'text-green-400' : 'text-red-400'}>{myPart.points_wagered} pts {myPart.side === 'for' ? 'pour' : 'contre'}</span>
                </div>
              )}

              {/* Past deadline message */}
              {isOpen && isPastDeadline && !myPart && !isCreator && (
                <div className="text-center text-xs text-orange-400/70 py-2">
                  Délai dépassé — le créateur doit résoudre le pari
                </div>
              )}

              {/* Creator controls */}
              {isCreator && (isOpen || isClosed) && (
                <div className="mt-2 space-y-2">
                  {isOpen && (
                    <button onClick={() => closeBet(bet)}
                      className="w-full py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold rounded-xl active:scale-95">
                      🔒 Fermer les mises
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => resolveBet(bet, 'win')} className="flex-1 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-xl active:scale-95">Réussi ✓</button>
                    <button onClick={() => resolveBet(bet, 'lose')} className="flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'rgb(248,113,113)'}}>Raté ✗</button>
                    <button onClick={() => resolveBet(bet, 'null')} className="py-2 px-3 bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-500 text-xs font-semibold rounded-xl active:scale-95">Nul</button>
                  </div>
                </div>
              )}

              {isResolved && (
                <div className="mt-2 text-center text-xs text-neutral-600">
                  Résultat : <span className={bet.result === 'win' ? 'text-green-400' : bet.result === 'lose' ? 'text-red-400' : 'text-neutral-400'}>
                    {bet.result === 'win' ? 'Réussi ✓' : bet.result === 'lose' ? 'Raté ✗' : 'Nul'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {bets.length === 0 && (
        <div className="text-center py-20 text-neutral-600">
          <div className="text-4xl mb-3">🎲</div>
          <p>Aucun pari — lance le premier !</p>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="px-4 pt-5 space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[#141414] rounded-2xl animate-pulse" />)}
    </div>
  )
}
