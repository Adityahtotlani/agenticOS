'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getToken, getUser, clearAuth } from '@/lib/auth'
import Sidebar from './Sidebar'

const PUBLIC_PATHS = ['/login', '/register']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!PUBLIC_PATHS.includes(pathname) && !getToken()) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [pathname])

  if (!ready) return null

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  const user = getUser()

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-col w-64 bg-gray-950 border-r border-gray-800 shrink-0">
        <Sidebar />
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <p className="truncate">{user?.email}</p>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 mt-1">Logout</button>
        </div>
      </div>
      <main className="flex-1 overflow-auto bg-gray-900">
        {children}
      </main>
    </div>
  )
}
