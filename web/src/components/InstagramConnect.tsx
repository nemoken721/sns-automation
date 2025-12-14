'use client'

import { useState } from 'react'
import { Instagram, CheckCircle, XCircle, Loader2, Unlink } from 'lucide-react'

interface Profile {
  id: string
  ig_user_id: string | null
  ig_username: string | null
  ig_access_token: string | null
  ig_token_expires_at: string | null
  ig_profile_picture: string | null
}

interface InstagramConnectProps {
  profile: Profile | null
}

export function InstagramConnect({ profile }: InstagramConnectProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const isConnected = profile?.ig_user_id && profile?.ig_access_token
  const tokenExpiresAt = profile?.ig_token_expires_at
    ? new Date(profile.ig_token_expires_at)
    : null
  const isTokenExpired = tokenExpiresAt && tokenExpiresAt < new Date()
  const daysUntilExpiry = tokenExpiresAt
    ? Math.ceil((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleConnect = () => {
    window.location.href = '/api/auth/instagram'
  }

  const handleDisconnect = async () => {
    if (!confirm('Instagram連携を解除しますか？')) return

    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/auth/instagram/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('連携解除に失敗しました')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isConnected) {
    return (
      <div className="space-y-4">
        {/* 連携済み状態 */}
        <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex-shrink-0">
            {profile.ig_profile_picture ? (
              <img
                src={profile.ig_profile_picture}
                alt={profile.ig_username || 'Instagram'}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">連携済み</span>
            </div>
            <p className="text-white font-medium">@{profile.ig_username}</p>
          </div>
        </div>

        {/* トークン有効期限 */}
        {tokenExpiresAt && (
          <div className={`p-3 rounded-lg ${
            isTokenExpired
              ? 'bg-red-500/10 border border-red-500/30'
              : daysUntilExpiry && daysUntilExpiry <= 7
              ? 'bg-yellow-500/10 border border-yellow-500/30'
              : 'bg-gray-700/50'
          }`}>
            <p className={`text-sm ${
              isTokenExpired
                ? 'text-red-400'
                : daysUntilExpiry && daysUntilExpiry <= 7
                ? 'text-yellow-400'
                : 'text-gray-400'
            }`}>
              {isTokenExpired ? (
                <>トークンが期限切れです。再連携してください。</>
              ) : (
                <>トークン有効期限: {tokenExpiresAt.toLocaleDateString('ja-JP')} （残り{daysUntilExpiry}日）</>
              )}
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-3">
          {isTokenExpired && (
            <button
              onClick={handleConnect}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
            >
              <Instagram className="w-5 h-5" />
              再連携する
            </button>
          )}
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDisconnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Unlink className="w-5 h-5" />
            )}
            連携解除
          </button>
        </div>
      </div>
    )
  }

  // 未連携状態
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
        <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
          <Instagram className="w-6 h-6 text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-500" />
            <span className="text-gray-400">未連携</span>
          </div>
          <p className="text-gray-500 text-sm">
            Instagramビジネスアカウントを連携してください
          </p>
        </div>
      </div>

      <div className="bg-gray-700/30 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">連携の前提条件</h3>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Facebookページを持っていること</li>
          <li>Instagramビジネス/クリエイターアカウントがFacebookページに連携されていること</li>
          <li>Meta for Developersでアプリが作成されていること</li>
        </ul>
      </div>

      <button
        onClick={handleConnect}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors font-medium"
      >
        <Instagram className="w-5 h-5" />
        Instagramと連携する
      </button>
    </div>
  )
}
