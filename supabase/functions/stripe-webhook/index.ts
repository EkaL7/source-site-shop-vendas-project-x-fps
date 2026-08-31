import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@17?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getDiscordEnv } from '../_shared/discord.ts'
import { fulfillOrder } from '../_shared/fulfill-order.ts'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('Missing config')
    return new Response('Server misconfigured', { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const discordEnv = getDiscordEnv()

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      await fulfillOrder(supabase, discordEnv, { paymentIntentId: pi.id })
    } else if (event.type === 'payment_intent.processing') {
      // Boleto pendente / Pix em processamento.
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('orders')
        .update({
          payment_status: 'processing',
          status: 'aguardando_pagamento',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', pi.id)
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'falhou',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', pi.id)
    } else if (event.type === 'payment_intent.canceled') {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('orders')
        .update({
          payment_status: 'canceled',
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_payment_intent_id', pi.id)
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (piId) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            status: 'reembolsado',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', piId)
      }
    }
  } catch (err) {
    console.error('Webhook handler error', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
