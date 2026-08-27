import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UtilityHub — Team App',
  description: 'Internal team work management & automation platform',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}