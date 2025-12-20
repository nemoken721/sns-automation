import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { type, feedback } = await request.json()

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Store feedback in database
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id || null,
      type,
      content: feedback.trim(),
      user_email: user?.email || null,
    })

    if (error) {
      console.error('Failed to save feedback:', error)
      // Even if DB save fails, we don't want to show error to user
      // In production, you might want to send to Slack/Discord/Email instead
    }

    // Log feedback (useful for debugging and can be sent to external services)
    console.log('Feedback received:', {
      type,
      feedback: feedback.trim(),
      userId: user?.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
