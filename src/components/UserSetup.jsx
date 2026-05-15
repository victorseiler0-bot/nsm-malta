import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'

export default function UserSetup() {
  const { register } = useUser()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loggingIn, setLoggingIn] = useState(null)

  useEffect(() => {
    supabase
      .from('users')
      .select('id, name, total_points')
      .order('total_points', { ascending: false })
      .then(({ data }) => {
        if (data) setUsers(data)
        setLoadingUsers(false)
      })
  }, [])

  const loginAs = async (user) => {
    setLoggingIn(user.id)
    localStorage.setItem('nsm_uid', user.id)
    window.location.reload()
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await register(name)
    } catch (err) {
      console.error('register error:', JSON.stringify(err), err.message, err.code)
      if (err.code === '23505') setError('Ce nom est déjà pris — clique dessus pour te connecter.')
      else setError(err.message || 'Erreur, réessaie.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="pt-14 pb-8 px-6 text-center">
        <div className="inline-flex items-center gap-1.5 mb-2">
          <span className="text-5xl font-black tracking-tight text-white">NSM</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#CF101A] mb-1"></span>
        </div>
        <p className="text-[#CF101A] text-xs font-semibold tracking-widest uppercase">made in Malta</p>
        <p className="text-neutral-500 text-sm mt-4">C'est toi qui ?</p>
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {/* Existing users */}
        {loadingUsers ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[#141414] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => loginAs(u)}
                disabled={loggingIn === u.id}
                className="w-full flex items-center justify-between bg-[#141414] border border-[#1e1e1e] rounded-2xl px-4 py-4 active:scale-98 transition-all active:bg-[#1e1e1e] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#CF101A]/15 border border-[#CF101A]/20 flex items-center justify-center">
                    <span className="text-[#CF101A] font-black text-base">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white font-semibold text-base">
                    {loggingIn === u.id ? 'Connexion...' : u.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-sm font-medium">{u.total_points} pts</span>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-700 group-active:text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create new */}
        {!showNew ? (
          <button
            onClick={() => setShowNew(true)}
            className="w-full py-4 border border-dashed border-[#2a2a2a] rounded-2xl text-neutral-500 text-sm font-medium hover:border-[#CF101A]/40 hover:text-neutral-400 transition-all active:scale-98"
          >
            + Nouveau compte
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-[#141414] border border-[#252525] rounded-2xl p-4 space-y-3">
            <p className="text-white font-semibold text-sm">Nouveau compte</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prénom..."
              maxLength={20}
              autoFocus
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-base placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A] transition-colors"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowNew(false); setError(''); setName('') }}
                className="flex-1 py-3 bg-[#1a1a1a] text-neutral-400 font-medium rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="flex-1 py-3 bg-[#CF101A] text-white font-semibold rounded-xl text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                {submitting ? '...' : 'Créer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
