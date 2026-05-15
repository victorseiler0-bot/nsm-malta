import { useState } from 'react'
import { useUser } from '../contexts/UserContext'

export default function UserSetup() {
  const { register } = useUser()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await register(name)
    } catch (err) {
      if (err.code === '23505') setError('Ce nom est déjà pris, choisis-en un autre.')
      else setError('Erreur, réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1 mb-4">
            <span className="text-4xl font-black tracking-tight text-white">NSM</span>
            <span className="w-2 h-2 rounded-full bg-[#CF101A] mt-1"></span>
          </div>
          <p className="text-[#CF101A] text-sm font-medium tracking-widest uppercase">made in Malta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Ton prénom
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Victor..."
              maxLength={20}
              autoFocus
              className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-white text-lg font-medium placeholder:text-neutral-600 focus:outline-none focus:border-[#CF101A] transition-colors"
            />
          </div>

          {error && <p className="text-[#CF101A] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-[#CF101A] text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-40 active:scale-95 transition-all"
          >
            {loading ? 'Inscription...' : 'Rejoindre NSM'}
          </button>
        </form>

        <p className="text-center text-neutral-600 text-xs mt-6">
          Ton nom est permanent — choisis bien.
        </p>
      </div>
    </div>
  )
}
