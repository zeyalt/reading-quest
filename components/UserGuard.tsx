'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from './UserContext'

export default function UserGuard({ children }: { children: React.ReactNode }) {
  const { user, loaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loaded && !user && pathname !== '/users') {
      router.replace('/users')
    }
  }, [loaded, user, pathname, router])

  // Don't flash content before redirect
  if (!loaded) return null
  if (!user && pathname !== '/users') return null

  return <>{children}</>
}
