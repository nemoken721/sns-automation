import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/server'
import { PLANS, getPlanByPriceId } from '@/lib/stripe/config'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanByPriceId(priceId) || PLANS.FREE

  // メタデータからuser_idを取得
  const userId = subscription.metadata.user_id

  if (!userId) {
    // customerからuser_idを取得
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
    const userIdFromCustomer = customer.metadata?.user_id
    if (!userIdFromCustomer) {
      console.error('No user_id found in subscription or customer metadata')
      return
    }
  }

  // 現在の請求期間を取得
  const currentPeriodStart = subscription.items.data[0]?.current_period_start
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end

  const updateData: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_id: plan.id,
    status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    credits_limit: plan.limits.videosPerMonth,
    updated_at: new Date().toISOString(),
  }

  if (currentPeriodStart) {
    updateData.current_period_start = new Date(currentPeriodStart * 1000).toISOString()
  }
  if (currentPeriodEnd) {
    updateData.current_period_end = new Date(currentPeriodEnd * 1000).toISOString()
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Failed to update subscription:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // フリープランにダウングレード
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: null,
      stripe_price_id: null,
      plan_id: 'free',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      credits_limit: PLANS.FREE.limits.videosPerMonth,
      credits_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Failed to downgrade subscription:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const invoiceData = invoice as unknown as {
    subscription?: string
    payment_intent?: string
    amount_paid?: number
    lines?: { data: Array<{ description?: string }> }
  }

  // 支払い履歴を記録
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (subscription) {
    // クレジットをリセット（新しい請求期間開始）
    await supabaseAdmin
      .from('subscriptions')
      .update({
        credits_used: 0,
        credits_reset_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    // 支払い履歴追加
    await supabaseAdmin
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoiceData.payment_intent || null,
        amount: invoiceData.amount_paid || 0,
        currency: invoice.currency,
        status: 'succeeded',
        description: invoiceData.lines?.data[0]?.description || 'Subscription payment',
      })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const invoiceData = invoice as unknown as { amount_due?: number }

  // サブスクリプションステータスを更新
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  // 支払い履歴追加
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (subscription) {
    await supabaseAdmin
      .from('payment_history')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        stripe_invoice_id: invoice.id,
        amount: invoiceData.amount_due || 0,
        currency: invoice.currency,
        status: 'failed',
        description: 'Payment failed',
      })
  }
}
