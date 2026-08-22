import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = localStorage.getItem('nsm_uid')
    if (!uid) { setLoading(false); return }
    api.get(`/users/${uid}`)
      .then((data) => setCurrentUser(data))
      .catch(() => localStorage.removeItem('nsm_uid'))
      .finally(() => setLoading(false))
  }, [])

  const register = async (name) => {
    const data = await api.post('/users', { name: name.trim() })
    localStorage.setItem('nsm_uid', data.id)
    setCurrentUser(data)
    return data
  }

  const refresh = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.get(`/users/${currentUser.id}`)
      setCurrentUser(data)
    } catch { /* keep stale user on transient error */ }
  }, [currentUser])

  return (
    <UserContext.Provider value={{ currentUser, loading, register, refresh }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
