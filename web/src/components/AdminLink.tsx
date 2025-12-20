'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield } from 'lucide-react'

export function AdminLink() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch('/api/admin/check')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        // 管理者チェック失敗時は表示しない
      }
    }

    checkAdmin()
  }, [])

  if (!isAdmin) {
    return null
  }

  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
    >
      <Shield className="w-5 h-5" />
      <span className="hidden sm:inline">管理者</span>
    </Link>
  )
}
