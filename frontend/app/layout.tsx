import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'AgenticOS',
  description: 'Operating System for AI Agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-900">
          {children}
        </main>
      </body>
    </html>
  )
}
