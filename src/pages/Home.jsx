import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Home() {
  const { currentUser } = useUser()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchLeaderboard)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('total_points', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-2xl font-bold text-white mb-1">Classement</h1>
      <p className="text-neutral-500 text-sm mb-6">{users.length} joueur{users.length !== 1 ? 's' : ''}</p>

      <div className="space-y-2">
        {users.map((user, i) => {
          const isMe = user.id === currentUser?.id
          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${
                isMe
                  ? 'bg-[#1e0a0b] border border-[#CF101A]/30'
                  : 'bg-[#141414] border border-[#1e1e1e]'
              }`}
            >
              <span className="text-2xl w-8 text-center">
                {i < 3 ? MEDALS[i] : <span className="text-neutral-600 text-base font-bold">{i + 1}</span>}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${isMe ? 'text-white' : 'text-neutral-200'}`}>
                    {user.name}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF101A] bg-[#CF101A]/10 px-1.5 py-0.5 rounded">
                      toi
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className={`text-lg font-bold ${isMe ? 'text-[#CF101A]' : 'text-white'}`}>
                  {user.total_points}
                </span>
                <span className="text-neutral-500 text-xs ml-1">pts</span>
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
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="px-4 pt-5 space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-[#141414] rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}
