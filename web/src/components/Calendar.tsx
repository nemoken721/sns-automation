'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Video as VideoIcon, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Video } from '@/types/video'

interface CalendarProps {
  videos: Video[]
  onVideoClick: (video: Video) => void
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 border-green-500 text-green-400'
    case 'processing':
      return 'bg-blue-500/20 border-blue-500 text-blue-400'
    case 'failed':
      return 'bg-red-500/20 border-red-500 text-red-400'
    default:
      return 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3 h-3" />
    case 'processing':
      return <Loader2 className="w-3 h-3 animate-spin" />
    case 'failed':
      return <XCircle className="w-3 h-3" />
    default:
      return <Clock className="w-3 h-3" />
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return '完了'
    case 'processing':
      return '生成中'
    case 'failed':
      return '失敗'
    default:
      return '予定'
  }
}

export function Calendar({ videos, onVideoClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const { year, month, daysInMonth, firstDayOfMonth, calendarDays } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const firstDayOfMonth = firstDay.getDay()

    // カレンダーのグリッドを作成（前月・当月・翌月の日付を含む）
    const calendarDays: (Date | null)[] = []

    // 前月の日付
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null)
    }

    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(year, month, i))
    }

    return { year, month, daysInMonth, firstDayOfMonth, calendarDays }
  }, [currentDate])

  // 日付ごとに動画をグループ化
  const videosByDate = useMemo(() => {
    const grouped: Record<string, Video[]> = {}

    videos.forEach(video => {
      const date = video.scheduled_at
        ? new Date(video.scheduled_at)
        : new Date(video.created_at)
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(video)
    })

    return grouped
  }, [videos])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">
            {year}年 {MONTHS[month]}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            今日
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-gray-700">
        {DAYS_OF_WEEK.map((day, index) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-medium ${
              index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[120px] bg-gray-900/50 border-b border-r border-gray-700/50"
              />
            )
          }

          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const dayVideos = videosByDate[dateKey] || []
          const dayOfWeek = date.getDay()

          return (
            <div
              key={dateKey}
              className={`min-h-[120px] p-2 border-b border-r border-gray-700/50 ${
                isToday(date) ? 'bg-purple-900/20' : 'bg-gray-800/50'
              } hover:bg-gray-700/30 transition-colors`}
            >
              {/* 日付 */}
              <div
                className={`text-sm font-medium mb-2 ${
                  isToday(date)
                    ? 'w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center'
                    : dayOfWeek === 0
                    ? 'text-red-400'
                    : dayOfWeek === 6
                    ? 'text-blue-400'
                    : 'text-gray-300'
                }`}
              >
                {date.getDate()}
              </div>

              {/* 動画カード */}
              <div className="space-y-1">
                {dayVideos.slice(0, 3).map(video => (
                  <button
                    key={video.id}
                    onClick={() => onVideoClick(video)}
                    className={`w-full text-left p-1.5 rounded border text-xs truncate flex items-center gap-1 hover:opacity-80 transition-opacity ${getStatusColor(video.status)}`}
                  >
                    {getStatusIcon(video.status)}
                    <span className="truncate">{video.title}</span>
                  </button>
                ))}
                {dayVideos.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{dayVideos.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ステータス凡例 */}
      <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-700">
        {['completed', 'processing', 'pending', 'failed'].map(status => (
          <div key={status} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              status === 'completed' ? 'bg-green-500' :
              status === 'processing' ? 'bg-blue-500' :
              status === 'failed' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <span className="text-xs text-gray-400">{getStatusLabel(status)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
