/**
 * Instagram Graph APIエラーハンドリング
 * INSTAGRAM_INTEGRATION_SPEC.mdに基づく実装
 */

// エラーコードの分類
export enum InstagramErrorCode {
  // 認証エラー（リトライ不可）
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // レート制限（リトライ可能・待機必要）
  RATE_LIMIT = 'RATE_LIMIT',

  // メディアエラー（リトライ不可）
  INVALID_MEDIA = 'INVALID_MEDIA',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',

  // 一時的エラー（リトライ可能）
  TEMPORARY_ERROR = 'TEMPORARY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',

  // その他
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// エラーの詳細情報
export interface InstagramError {
  code: InstagramErrorCode
  message: string
  originalError?: unknown
  retryable: boolean
  retryAfterSeconds?: number
}

// Meta Graph APIエラーコード → 内部エラーコードのマッピング
const META_ERROR_CODE_MAP: Record<number, InstagramErrorCode> = {
  // OAuth関連
  190: InstagramErrorCode.TOKEN_EXPIRED,      // Invalid OAuth access token
  102: InstagramErrorCode.TOKEN_EXPIRED,      // Session has expired
  104: InstagramErrorCode.INVALID_TOKEN,      // Invalid parameter

  // 権限関連
  10: InstagramErrorCode.PERMISSION_DENIED,   // Permission denied
  200: InstagramErrorCode.PERMISSION_DENIED,  // Requires extended permission
  230: InstagramErrorCode.PERMISSION_DENIED,  // Requires extended permission

  // レート制限
  4: InstagramErrorCode.RATE_LIMIT,           // Application request limit reached
  17: InstagramErrorCode.RATE_LIMIT,          // User request limit reached
  32: InstagramErrorCode.RATE_LIMIT,          // Page request limit reached
  613: InstagramErrorCode.RATE_LIMIT,         // Calls to this API have exceeded the rate limit

  // メディア関連
  352: InstagramErrorCode.INVALID_MEDIA,      // Invalid video URL
  36003: InstagramErrorCode.INVALID_MEDIA,    // Invalid media
  36000: InstagramErrorCode.UNSUPPORTED_FORMAT, // Unsupported format

  // 一時的エラー
  1: InstagramErrorCode.TEMPORARY_ERROR,      // Unknown error
  2: InstagramErrorCode.TEMPORARY_ERROR,      // Temporary error
}

// エラーメッセージパターン → 内部エラーコードのマッピング
const ERROR_MESSAGE_PATTERNS: Array<{ pattern: RegExp; code: InstagramErrorCode }> = [
  { pattern: /expired/i, code: InstagramErrorCode.TOKEN_EXPIRED },
  { pattern: /invalid.*token/i, code: InstagramErrorCode.INVALID_TOKEN },
  { pattern: /permission/i, code: InstagramErrorCode.PERMISSION_DENIED },
  { pattern: /rate.*limit/i, code: InstagramErrorCode.RATE_LIMIT },
  { pattern: /too.*large/i, code: InstagramErrorCode.MEDIA_TOO_LARGE },
  { pattern: /unsupported/i, code: InstagramErrorCode.UNSUPPORTED_FORMAT },
  { pattern: /timeout/i, code: InstagramErrorCode.PROCESSING_TIMEOUT },
  { pattern: /network/i, code: InstagramErrorCode.NETWORK_ERROR },
]

/**
 * Meta Graph APIのエラーレスポンスを解析
 */
export function parseInstagramError(error: unknown): InstagramError {
  // Fetch/Network error
  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: InstagramErrorCode.NETWORK_ERROR,
        message: error.message,
        originalError: error,
        retryable: true,
        retryAfterSeconds: 5
      }
    }
  }

  // Meta API error response
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { error?: { code?: number; message?: string; error_subcode?: number } }

    if (apiError.error) {
      const { code, message, error_subcode } = apiError.error

      // エラーコードでマッピング
      let errorCode = InstagramErrorCode.UNKNOWN_ERROR
      if (code && META_ERROR_CODE_MAP[code]) {
        errorCode = META_ERROR_CODE_MAP[code]
      } else if (error_subcode && META_ERROR_CODE_MAP[error_subcode]) {
        errorCode = META_ERROR_CODE_MAP[error_subcode]
      } else if (message) {
        // メッセージパターンでマッピング
        for (const { pattern, code: patternCode } of ERROR_MESSAGE_PATTERNS) {
          if (pattern.test(message)) {
            errorCode = patternCode
            break
          }
        }
      }

      return {
        code: errorCode,
        message: message || 'Unknown Instagram API error',
        originalError: error,
        retryable: isRetryable(errorCode),
        retryAfterSeconds: getRetryDelay(errorCode)
      }
    }
  }

  // Unknown error
  return {
    code: InstagramErrorCode.UNKNOWN_ERROR,
    message: error instanceof Error ? error.message : 'Unknown error',
    originalError: error,
    retryable: false
  }
}

/**
 * エラーコードがリトライ可能か判定
 */
export function isRetryable(code: InstagramErrorCode): boolean {
  const retryableCodes = [
    InstagramErrorCode.RATE_LIMIT,
    InstagramErrorCode.TEMPORARY_ERROR,
    InstagramErrorCode.NETWORK_ERROR,
    InstagramErrorCode.PROCESSING_TIMEOUT
  ]
  return retryableCodes.includes(code)
}

/**
 * リトライ待機時間を取得（秒）
 */
export function getRetryDelay(code: InstagramErrorCode, retryCount: number = 0): number {
  const baseDelays: Record<InstagramErrorCode, number> = {
    [InstagramErrorCode.RATE_LIMIT]: 300,          // 5分
    [InstagramErrorCode.TEMPORARY_ERROR]: 60,     // 1分
    [InstagramErrorCode.NETWORK_ERROR]: 10,       // 10秒
    [InstagramErrorCode.PROCESSING_TIMEOUT]: 120, // 2分

    // リトライ不可のエラーは0
    [InstagramErrorCode.TOKEN_EXPIRED]: 0,
    [InstagramErrorCode.INVALID_TOKEN]: 0,
    [InstagramErrorCode.PERMISSION_DENIED]: 0,
    [InstagramErrorCode.INVALID_MEDIA]: 0,
    [InstagramErrorCode.MEDIA_TOO_LARGE]: 0,
    [InstagramErrorCode.UNSUPPORTED_FORMAT]: 0,
    [InstagramErrorCode.UNKNOWN_ERROR]: 0
  }

  const baseDelay = baseDelays[code] || 0

  // 指数バックオフ（最大30分）
  const exponentialDelay = baseDelay * Math.pow(2, retryCount)
  return Math.min(exponentialDelay, 1800)
}

/**
 * エラーに対するユーザー向けメッセージを生成
 */
export function getUserFriendlyMessage(code: InstagramErrorCode): string {
  const messages: Record<InstagramErrorCode, string> = {
    [InstagramErrorCode.TOKEN_EXPIRED]: 'Instagramの認証が期限切れです。設定から再連携してください。',
    [InstagramErrorCode.INVALID_TOKEN]: 'Instagramの認証情報が無効です。設定から再連携してください。',
    [InstagramErrorCode.PERMISSION_DENIED]: 'Instagramへの投稿権限がありません。アカウントの権限を確認してください。',
    [InstagramErrorCode.RATE_LIMIT]: 'Instagramの投稿制限に達しました。しばらく時間をおいて再試行されます。',
    [InstagramErrorCode.INVALID_MEDIA]: '動画形式がInstagramに対応していません。',
    [InstagramErrorCode.MEDIA_TOO_LARGE]: '動画ファイルが大きすぎます。',
    [InstagramErrorCode.UNSUPPORTED_FORMAT]: '動画形式がサポートされていません。',
    [InstagramErrorCode.TEMPORARY_ERROR]: '一時的なエラーが発生しました。自動的に再試行されます。',
    [InstagramErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました。自動的に再試行されます。',
    [InstagramErrorCode.PROCESSING_TIMEOUT]: '動画の処理がタイムアウトしました。自動的に再試行されます。',
    [InstagramErrorCode.UNKNOWN_ERROR]: '予期せぬエラーが発生しました。'
  }
  return messages[code]
}

/**
 * リトライすべきかどうかを判定
 */
export function shouldRetry(error: InstagramError, currentRetryCount: number, maxRetries: number): boolean {
  if (!error.retryable) return false
  if (currentRetryCount >= maxRetries) return false
  return true
}
