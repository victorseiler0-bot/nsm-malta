import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem('nsm_uid')
    if (!id) { setLoading(false); return }
    supabase.from('users').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) setCurrentUser(data)
        setLoading(false)
      })
  }, [])

  const register = async (name) => {
    const trimmed = name.trim()
    const { error } = await supabase.from('users').insert({ name: trimmed })
    if (error) throw error
    const { data, error: fetchError } = await supabase
      .from('users').select('*').eq('name', trimmed).single()
    if (fetchError) throw fetchError
    localStorage.setItem('nsm_uid', data.id)
    setCurrentUser(data)
    return data
  }

  const refresh = useCallback(async () => {
    if (!currentUser) return
    const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single()
    if (data) setCurrentUser(data)
  }, [currentUser])

  return (
    <UserContext.Provider value={{ currentUser, loading, register, refresh }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
