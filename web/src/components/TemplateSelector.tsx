'use client'

import { useState, useEffect } from 'react'
import { Loader2, Lock, Check, Palette } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  thumbnail_url: string | null
  category: string
  plan_required: string
  settings: {
    style: string
    aspect_ratio: string
    duration_seconds: number
    transitions: string
    text_animation: string
    music_style: string
    color_scheme: {
      primary: string
      secondary: string
      accent: string
    }
  }
  isAccessible: boolean
}

interface TemplateSelectorProps {
  selectedTemplateId: string | null
  onSelect: (templateId: string | null, settings: Template['settings'] | null) => void
}

const categoryLabels: Record<string, string> = {
  educational: '教育・解説',
  entertainment: 'エンタメ',
  marketing: 'マーケティング',
  lifestyle: 'ライフスタイル',
}

const planLabels: Record<string, string> = {
  free: '無料',
  pro: 'Pro',
  business: 'Business',
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates)
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const categories = Array.from(new Set(templates.map(t => t.category)))
  const filteredTemplates = selectedCategory
    ? templates.filter(t => t.category === selectedCategory)
    : templates

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-purple-400" />
        <span className="text-gray-400 text-sm">テンプレート選択（任意）</span>
      </div>

      {/* カテゴリフィルター */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-full text-xs transition-colors ${
            selectedCategory === null
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          すべて
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {categoryLabels[category] || category}
          </button>
        ))}
      </div>

      {/* テンプレートグリッド */}
      <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {/* デフォルト（テンプレートなし） */}
        <button
          onClick={() => onSelect(null, null)}
          className={`relative p-3 rounded-lg border-2 transition-all ${
            selectedTemplateId === null
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
          }`}
        >
          <div className="text-left">
            <p className="text-white text-sm font-medium">デフォルト</p>
            <p className="text-gray-400 text-xs mt-1">標準設定で生成</p>
          </div>
          {selectedTemplateId === null && (
            <div className="absolute top-2 right-2">
              <Check className="w-4 h-4 text-purple-400" />
            </div>
          )}
        </button>

        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => {
              if (template.isAccessible) {
                onSelect(template.id, template.settings)
              }
            }}
            disabled={!template.isAccessible}
            className={`relative p-3 rounded-lg border-2 transition-all ${
              !template.isAccessible
                ? 'border-gray-700 bg-gray-700/30 opacity-60 cursor-not-allowed'
                : selectedTemplateId === template.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
            }`}
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium">{template.name}</p>
                {!template.isAccessible && <Lock className="w-3 h-3 text-gray-500" />}
              </div>
              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{template.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 bg-gray-600 rounded text-gray-300">
                  {categoryLabels[template.category] || template.category}
                </span>
                {template.plan_required !== 'free' && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    template.plan_required === 'pro'
                      ? 'bg-purple-600/50 text-purple-300'
                      : 'bg-yellow-600/50 text-yellow-300'
                  }`}>
                    {planLabels[template.plan_required]}
                  </span>
                )}
              </div>
              {/* カラープレビュー */}
              <div className="flex gap-1 mt-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: template.settings.color_scheme.primary }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: template.settings.color_scheme.secondary }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: template.settings.color_scheme.accent }}
                />
              </div>
            </div>
            {selectedTemplateId === template.id && (
              <div className="absolute top-2 right-2">
                <Check className="w-4 h-4 text-purple-400" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
