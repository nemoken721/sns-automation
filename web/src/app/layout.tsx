import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { FeedbackButton } from '@/components/FeedbackButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SNS Automation - 動画自動生成ツール',
  description: 'AIを活用してInstagram Reels用の動画を自動生成',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        <FeedbackButton />
      </body>
    </html>
  )
}
