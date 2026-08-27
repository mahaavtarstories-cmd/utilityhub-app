'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { UserRole } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  icon: string
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/app', icon: '📊', roles: ['admin', 'manager', 'researcher', 'qa', 'viewer'] },
  { label: 'Projects', href: '/app/projects', icon: '📁', roles: ['admin', 'manager', 'researcher', 'qa', 'viewer'] },
  { label: 'Tasks', href: '/app/tasks', icon: '✅', roles: ['admin', 'manager', 'researcher', 'qa'] },
  { label: 'Products', href: '/app/products', icon: '📦', roles: ['admin', 'manager', 'researcher', 'qa'] },
  { label: 'Rulebooks', href: '/app/rulebooks', icon: '📖', roles: ['admin', 'manager', 'researcher', 'qa'] },
  { label: 'Approved Sources', href: '/app/sources', icon: '🌐', roles: ['admin', 'manager', 'researcher', 'qa'] },
  { label: 'QA', href: '/app/qa', icon: '🔍', roles: ['admin', 'manager', 'qa'] },
  { label: 'Reports', href: '/app/reports', icon: '📈', roles: ['admin', 'manager'] },
  { label: 'Employees', href: '/app/employees', icon: '👥', roles: ['admin'] },
  { label: 'Audit Logs', href: '/app/audit', icon: '📜', roles: ['admin'] },
  { label: 'Settings', href: '/app/settings', icon: '⚙️', roles: ['admin'] },
]

export function Sidebar({ userRole, userEmail, userName }: { userRole: UserRole; userEmail: string; userName: string | null }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(userRole))

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">U</div>
        <span className="font-bold text-lg text-white">UtilityHub</span>
      </div>

      {/* User info */}
      <div className="px-6 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold">
            {(userName || userEmail)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName || userEmail}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded border ${ROLE_COLORS[userRole]}`}>
              {ROLE_LABELS[userRole]}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {visibleItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-slate-700">
        <form action="/app/login?action=logout" method="POST">
          <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="text-base">🚪</span>
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex w-64 flex-shrink-0 h-screen sticky top-0">
        {sidebar}
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white border border-slate-700"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64">
          {sidebar}
        </div>
      )}
    </>
  )
}