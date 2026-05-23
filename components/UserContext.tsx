'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { User } from '@/lib/types'

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  loaded: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  loaded: false,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('rq_user')
    if (stored) {
      try {
        setUserState(JSON.parse(stored))
      } catch {
        localStorage.removeItem('rq_user')
      }
    }
    setLoaded(true)
  }, [])

  function setUser(u: User | null) {
    setUserState(u)
    if (u) localStorage.setItem('rq_user', JSON.stringify(u))
    else localStorage.removeItem('rq_user')
  }

  return (
    <UserContext.Provider value={{ user, setUser, loaded }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
