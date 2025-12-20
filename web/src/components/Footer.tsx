'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-xl font-bold text-white">
              SNS Automation
            </Link>
            <p className="text-gray-400 text-sm mt-1">
              AIで動画制作を自動化
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              利用規約
            </Link>
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/pricing"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              料金プラン
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} SNS Automation. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
