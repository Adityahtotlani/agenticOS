import type { Metadata } from 'next'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'

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
      <body className="bg-gray-950 text-white">
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  )
}
