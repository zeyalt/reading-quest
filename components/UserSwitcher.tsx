'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useUser } from './UserContext'
import { usePathname } from 'next/navigation'

export default function UserSwitcher() {
  const { user } = useUser()
  const pathname = usePathname()

  if (!user || pathname === '/users') return null

  return (
    <Link
      href="/users"
      className="fixed top-3 right-3 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-bold text-sm shadow-md"
      style={{ background: user.avatar_color, color: '#FFFFFF' }}
    >
      <span className="text-base leading-none">{user.avatar_emoji}</span>
      <span>{user.name}</span>
      <ChevronDown size={13} />
    </Link>
  )
}
