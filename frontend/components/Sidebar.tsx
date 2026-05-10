'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, CheckSquare, Brain, BookOpen, Plug, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/agents', label: 'Agents', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/mcp', label: 'MCP Servers', icon: Plug },
  { href: '/metrics', label: 'Metrics', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-800 p-6 flex flex-col">
      <h1 className="text-2xl font-bold mb-8 text-white">AgenticOS</h1>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="text-sm text-gray-500">
        <p>Status: Ready</p>
      </div>
    </div>
  )
}
