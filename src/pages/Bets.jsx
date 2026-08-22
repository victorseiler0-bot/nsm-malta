import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useUser } from '../contexts/UserContext'

const STATUS_LABEL = { open: 'Ouvert', closed: 'Mises fermées', resolved: 'Terminé', cancelled: 'Annulé' }
const STATUS_COLOR = { open: 'text-green-400', closed: 'text-orange-400', resolved: 'text-neutral-400', cancelled: 'text-neutral-600' }

export default function Bets() {
  const { currentUser, refresh } = useUser()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', cote_for: 2, cote_against: 2, cote_null: 2 })
  const [submitting, setSubmitting] = useState(false)
  const [joiningBet, setJoiningBet] = useState(null)
  const [joinData, setJoinData] = useState({ side: 'for', amount: 10 })
  const [myParticipations, setMyParticipations] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editingCote, setEditingCote] = useState(null) // { betId, side }
  const [coteValue, setCoteValue] = useState(2)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 20000)
    return () => clearInterval(interval)
  }, [currentUser])

  const fetchAll = async () => {
    const betsData = await api.get('/bets')
    setBets(betsData)
    const map = {}
    if (currentUser) {
      betsData.forEach(b => {
        const mine = (b.bet_participants || []).find(p => p.user_id === currentUser.id)
        if (mine) map[b.id] = mine
      })
    }
    setMyParticipations(map)
    setLoading(false)
  }

  const createBet = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const data = await api.post('/bets', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        creator_id: currentUser.id,
        cote_for: Number(form.cote_for) || 2,
        cote_against: Number(form.cote_against) || 2,
        cote_null: Number(form.cote_null) || 2,
      })
      setBets(prev => [data, ...prev])
      setForm({ title: '', description: '', cote_for: 2, cote_against: 2, cote_null: 2 })
      setShowForm(false)
    } finally { setSubmitting(false) }
  }

  const coteField = { for: 'cote_for', against: 'cote_against', null: 'cote_null' }

  const saveCote = async (bet, side) => {
    const cote = Number(coteValue)
    if (!(cote > 1)) return
    await api.patch(`/bets/${bet.id}`, { action: 'set_cote', side, cote })
    setBets(prev => prev.map(b => b.id === bet.id ? { ...b, [coteField[side]]: cote } : b))
    setEditingCote(null)
  }

  const deleteBet = async (bet) => {
    setDeletingId(bet.id)
    try {
      await api.del(`/bets/${bet.id}`)
      setBets(prev => prev.filter(b => b.id !== bet.id))
    } finally { setDeletingId(null) }
  }

  const joinBet = async (bet) => {
    if (!currentUser || myParticipations[bet.id]) return
    if (currentUser.total_points < joinData.amount) { alert(`Tu n'as que ${currentUser.total_points} points`); return }
    try {
      await api.post(`/bets/${bet.id}/join`, { user_id: currentUser.id, side: joinData.side, amount: joinData.amount })
      await Promise.all([fetchAll(), refresh()])
      setJoiningBet(null)
    } catch { alert('Erreur en rejoignant le pari') }
  }

  const closeBet = async (bet) => {
    await api.patch(`/bets/${bet.id}`, { action: 'close' })
    setBets(prev => prev.map(b => b.id === bet.id ? { ...b, status: 'closed' } : b))
  }

  const resolveBet = async (bet, result) => {
    try {
      await api.patch(`/bets/${bet.id}`, { action: 'resolve', result })
      await Promise.all([fetchAll(), refresh()])
    } catch { alert('Erreur lors de la résolution') }
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await api.patch(`/bets/${id}`, { action: 'edit', title: editForm.title, description: editForm.description || null })
      setBets(prev => prev.map(b => b.id === id ? { ...b, ...editForm } : b))
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
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Je pécho ce soir..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Conditions, précisions..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A]" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-green-600 mb-1 block">Cote 1</label>
              <input type="number" min="1.1" step="0.1" value={form.cote_for} onChange={e => setForm({ ...form, cote_for: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-2 py-2.5 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-red-500 mb-1 block">Cote 2</label>
              <input type="number" min="1.1" step="0.1" value={form.cote_against} onChange={e => setForm({ ...form, cote_against: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-2 py-2.5 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1 block">Cote nul</label>
              <input type="number" min="1.1" step="0.1" value={form.cote_null} onChange={e => setForm({ ...form, cote_null: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-2 py-2.5 text-white text-sm focus:outline-none focus:border-[#CF101A]" />
            </div>
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
          const canJoin = (isOpen || isClosed) && !myPart && currentUser && isOpen
          const isEditing = editingId === bet.id

          const CoteBox = ({ side, label, pool, colorClasses, style }) => (
            <div className={`flex-1 rounded-xl p-2.5 text-center ${colorClasses || ''}`} style={style}>
              <p className="text-xs font-bold text-white mb-1">{label}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{pool} pts misés</p>
              {editingCote?.betId === bet.id && editingCote?.side === side ? (
                <div className="flex items-center justify-center gap-1">
                  <input type="number" min="1.1" step="0.1" value={coteValue} onChange={e => setCoteValue(e.target.value)} autoFocus
                    className="w-12 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-1 py-0.5 text-white text-xs focus:outline-none focus:border-[#CF101A]" />
                  <button onClick={() => saveCote(bet, side)} className="text-[10px] bg-[#CF101A] text-white px-1.5 py-0.5 rounded-md font-semibold">OK</button>
                  <button onClick={() => setEditingCote(null)} className="text-[10px] opacity-70 px-1">✕</button>
                </div>
              ) : (
                <button disabled={!isOpen}
                  onClick={() => { setEditingCote({ betId: bet.id, side }); setCoteValue(bet[coteField[side]] || 2) }}
                  className="text-sm font-bold disabled:opacity-90">
                  ×{bet[coteField[side]] || 2}{isOpen && <span className="text-[10px]"> ✏️</span>}
                </button>
              )}
            </div>
          )

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
                    <span className="text-neutral-600 text-xs">par {bet.users?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCreator && !isResolved && (
                      <>
                        <button onClick={() => { setEditingId(bet.id); setEditForm({ title: bet.title, description: bet.description || '' }) }}
                          className="text-neutral-600 hover:text-neutral-400 text-sm p-1 transition-colors">✏️</button>
                        <button onClick={() => deleteBet(bet)} disabled={deletingId === bet.id}
                          className="text-neutral-600 hover:text-red-400 text-sm p-1 transition-colors disabled:opacity-40">🗑️</button>
                      </>
                    )}
                    <span className={`text-xs font-semibold ${STATUS_COLOR[bet.status]}`}>{STATUS_LABEL[bet.status]}</span>
                  </div>
                </div>
              )}

              {/* Choix 1 / Choix 2 with their cotes */}
              <div className="flex gap-2 mb-2">
                <CoteBox side="for" label="Choix 1" pool={forPool}
                  colorClasses="bg-green-500/10 border border-green-500/20 text-green-400" />
                <CoteBox side="against" label="Choix 2" pool={againstPool}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(248,113,113)' }} />
              </div>

              {/* Cote nul */}
              <div className="mb-3">
                {editingCote?.betId === bet.id && editingCote?.side === 'null' ? (
                  <div className="flex items-center gap-1.5 bg-[#1a1a1a] rounded-xl px-2.5 py-1.5 w-fit">
                    <span className="text-xs text-neutral-400">Nul</span>
                    <input type="number" min="1.1" step="0.1" value={coteValue} onChange={e => setCoteValue(e.target.value)} autoFocus
                      className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#CF101A]" />
                    <button onClick={() => saveCote(bet, 'null')} className="text-[10px] bg-[#CF101A] text-white px-2 py-1 rounded-md font-semibold">OK</button>
                    <button onClick={() => setEditingCote(null)} className="text-[10px] text-neutral-500 px-1">✕</button>
                  </div>
                ) : (
                  <button disabled={!isOpen}
                    onClick={() => { setEditingCote({ betId: bet.id, side: 'null' }); setCoteValue(bet.cote_null || 2) }}
                    className="text-xs font-semibold text-neutral-400 bg-[#1a1a1a] px-2.5 py-1 rounded-lg disabled:opacity-70">
                    Nul ×{bet.cote_null || 2}{isOpen && ' ✏️'}
                  </button>
                )}
              </div>

              {/* Participants */}
              {participants.length > 0 && (
                <div className="mb-3 space-y-1">
                  {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{p.users?.name}</span>
                      <span className={p.side === 'for' ? 'text-green-400' : 'text-red-400'}>
                        {p.side === 'for' ? 'Choix 1' : 'Choix 2'} · {p.points_wagered} pts
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
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${joinData.side === 'for' ? 'bg-green-500 text-white' : 'bg-[#1a1a1a] text-neutral-400'}`}>Choix 1 ×{bet.cote_for || 2}</button>
                      <button onClick={() => setJoinData({ ...joinData, side: 'against' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${joinData.side === 'against' ? 'bg-red-500 text-white' : 'bg-[#1a1a1a] text-neutral-400'}`}>Choix 2 ×{bet.cote_against || 2}</button>
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
                  Tu as misé <span className={myPart.side === 'for' ? 'text-green-400' : 'text-red-400'}>{myPart.points_wagered} pts sur {myPart.side === 'for' ? 'Choix 1' : 'Choix 2'}</span>
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
                    <button onClick={() => resolveBet(bet, 'win')} className="flex-1 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-xl active:scale-95">Choix 1 a gagné</button>
                    <button onClick={() => resolveBet(bet, 'lose')} className="flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'rgb(248,113,113)'}}>Choix 2 a gagné</button>
                    <button onClick={() => resolveBet(bet, 'null')} className="py-2 px-3 bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-500 text-xs font-semibold rounded-xl active:scale-95">Nul</button>
                  </div>
                </div>
              )}

              {isResolved && (
                <div className="mt-2 text-center text-xs text-neutral-600">
                  Résultat : <span className={bet.result === 'win' ? 'text-green-400' : bet.result === 'lose' ? 'text-red-400' : 'text-neutral-400'}>
                    {bet.result === 'win' ? 'Choix 1 ✓' : bet.result === 'lose' ? 'Choix 2 ✓' : 'Nul'}
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
