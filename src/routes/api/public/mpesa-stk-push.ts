// src/routes/api/public/mpesa-stk-push.ts
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getDarajaToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.token
  }

  const auth = btoa(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`)
  const res = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { method: 'GET', headers: { Authorization: `Basic ${auth}` } }
  )

  if (!res.ok) {
    throw new Error(`Daraja token request failed: ${res.status} ${await res.text()}`)
  }

  const data: { access_token: string; expires_in: string } = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (parseInt(data.expires_in, 10) - 60) * 1000,
  }
  return data.access_token
}

function getTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/\s+/g, '')
  if (phone.startsWith('+')) phone = phone.slice(1)
  if (phone.startsWith('0')) phone = '254' + phone.slice(1)
  if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone
  return phone
}

export const Route = createFileRoute('/api/public/mpesa-stk-push')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { phone: string; amount: number; orderRef: string }
        try {
          body = await request.json()
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
        }

        const { phone, amount, orderRef } = body
        if (!phone || !amount || !orderRef) {
          return new Response(
            JSON.stringify({ error: 'phone, amount, and orderRef are required' }),
            { status: 400 }
          )
        }

        const phoneFormatted = normalizePhone(phone)
        const timestamp = getTimestamp()
        const password = btoa(env.MPESA_SHORTCODE + env.MPESA_PASSKEY + timestamp)

        try {
          const token = await getDarajaToken()
          const callbackUrl = `${new URL(request.url).origin}/api/public/mpesa-callback`

          const stkRes = await fetch(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                BusinessShortCode: env.MPESA_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(amount),
                PartyA: phoneFormatted,
                PartyB: env.MPESA_SHORTCODE,
                PhoneNumber: phoneFormatted,
                CallBackURL: callbackUrl,
                AccountReference: orderRef,
                TransactionDesc: `Payment for ${orderRef}`,
              }),
            }
          )

          const stkData: any = await stkRes.json()

          if (stkData.ResponseCode !== '0') {
            return new Response(
              JSON.stringify({ error: stkData.ResponseDescription || 'STK push rejected', raw: stkData }),
              { status: 502 }
            )
          }

          await env.PAYMENTS.put(
            `payment:${orderRef}`,
            JSON.stringify({
              status: 'pending',
              checkoutRequestId: stkData.CheckoutRequestID,
              merchantRequestId: stkData.MerchantRequestID,
              phone: phoneFormatted,
              amount,
              updatedAt: new Date().toISOString(),
            }),
            { expirationTtl: 60 * 60 * 24 }
          )

          return new Response(
            JSON.stringify({
              message: 'STK push sent',
              checkoutRequestId: stkData.CheckoutRequestID,
              orderRef,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('STK push error:', err)
          return new Response(JSON.stringify({ error: 'Failed to initiate payment' }), { status: 500 })
        }
      },
    },
  },
})
