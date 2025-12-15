'use client'

import { useState } from 'react'
import { Instagram, CheckCircle, XCircle, Loader2, Unlink, RefreshCw, Key, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isManualConnecting, setIsManualConnecting] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualAccountId, setManualAccountId] = useState('')
  const [manualAccessToken, setManualAccessToken] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
    setMessage(null)
    try {
      const response = await fetch('/api/instagram/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: '連携解除に失敗しました' })
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    setMessage(null)
    try {
      const response = await fetch('/api/instagram/refresh-token', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'トークンを更新しました' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setMessage({ type: 'error', text: data.error || 'トークン更新に失敗しました' })
      }
    } catch (error) {
      console.error('Refresh token error:', error)
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualAccountId || !manualAccessToken) {
      setMessage({ type: 'error', text: 'アカウントIDとアクセストークンを入力してください' })
      return
    }

    setIsManualConnecting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/auth/instagram/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ig_user_id: manualAccountId,
          ig_access_token: manualAccessToken,
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Instagram連携が完了しました' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setMessage({ type: 'error', text: data.error || '連携に失敗しました' })
      }
    } catch (error) {
      console.error('Manual connect error:', error)
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setIsManualConnecting(false)
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

        {/* メッセージ表示 */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-3 flex-wrap">
          {isTokenExpired ? (
            <button
              onClick={handleConnect}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
            >
              <Instagram className="w-5 h-5" />
              再連携する
            </button>
          ) : (
            <button
              onClick={handleRefreshToken}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              トークン更新
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

      {/* メッセージ表示 */}
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* 手動接続フォーム */}
      <div className="border border-gray-600 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-400" />
            <span className="text-white font-medium">手動で連携する（Graph API Explorer）</span>
          </div>
          {showManualForm ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showManualForm && (
          <div className="p-4 bg-gray-800/50 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400">
              <p className="font-medium mb-2">手順:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    Graph API Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                  を開く
                </li>
                <li>アプリを選択し、「ユーザートークンを取得」をクリック</li>
                <li>instagram_basic, instagram_content_publish を選択</li>
                <li>「Generate Access Token」をクリック</li>
                <li>アクセストークンをコピー</li>
                <li>InstagramビジネスアカウントIDを取得（APIで確認可能）</li>
              </ol>
            </div>

            <form onSubmit={handleManualConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Instagram Business Account ID
                </label>
                <input
                  type="text"
                  value={manualAccountId}
                  onChange={(e) => setManualAccountId(e.target.value)}
                  placeholder="例: 17841477678035837"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  アクセストークン
                </label>
                <textarea
                  value={manualAccessToken}
                  onChange={(e) => setManualAccessToken(e.target.value)}
                  placeholder="EAAMNHesdV24BQ..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isManualConnecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isManualConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Key className="w-5 h-5" />
                )}
                手動で連携する
              </button>
            </form>
          </div>
        )}
      </div>

      {/* OAuth連携（将来的に使用） */}
      <div className="text-center text-gray-500 text-sm">
        <p>OAuthによる自動連携は準備中です</p>
      </div>
    </div>
  )
}
