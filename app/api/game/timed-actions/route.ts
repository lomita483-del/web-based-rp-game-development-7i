import { NextResponse } from 'next/server'
import { getAuthenticatedGameUser } from '@/lib/game/auth'

export const runtime = 'nodejs'

const HOME_ACTIONS = new Set(['sleep', 'nap', 'tech_shift', 'watch_tv'])
const WORK_JOBS = new Set([
  'tech_shift',
  'frontend_dev',
  'tech_lead',
  'market_shift',
  'wholesale',
  'import_export',
  'management',
  'bank_manager',
  'md',
  'creator',
  'brand_deal',
])

function supabaseRpcUrl(name: string) {
  const baseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baseUrl || !serviceRoleKey) throw new Error('Supabase server configuration is missing')
  return { url: `${baseUrl}/rest/v1/rpc/${name}`, key: serviceRoleKey }
}

async function callRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, key } = supabaseRpcUrl(name)
  const response = await fetch(url, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : 'Timed action failed')
  return payload as T
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
    const body = await request.json() as { operation?: string; action?: string; jobId?: string; payoutNgn?: number }

    if (body.operation === 'begin_home') {
      if (!body.action || !HOME_ACTIONS.has(body.action)) return NextResponse.json({ error: 'Invalid home action.' }, { status: 400 })
      const result = await callRpc('lagos_hustle_begin_home_action', { p_player_id: user.id, p_action: body.action })
      return NextResponse.json({ result })
    }
    if (body.operation === 'cancel_home') {
      await callRpc('lagos_hustle_cancel_home_action', { p_player_id: user.id })
      return NextResponse.json({ ok: true })
    }
    if (body.operation === 'complete_home') {
      if (!body.action || !HOME_ACTIONS.has(body.action)) return NextResponse.json({ error: 'Invalid home action.' }, { status: 400 })
      const result = await callRpc('lagos_hustle_action', { p_player_id: user.id, p_action: body.action })
      return NextResponse.json({ result })
    }
    if (body.operation === 'begin_work') {
      if (!body.jobId || !WORK_JOBS.has(body.jobId)) return NextResponse.json({ error: 'Invalid work shift.' }, { status: 400 })
      const payoutNgn = Number.isInteger(body.payoutNgn) ? Math.max(1, Math.floor(body.payoutNgn as number / 7)) : 1
      const result = await callRpc('begin_work_shift', { p_player_id: user.id, p_job_id: body.jobId, p_payout_ngn: payoutNgn })
      return NextResponse.json({ result })
    }
    if (body.operation === 'complete_work') {
      const result = await callRpc('finish_work_shift', { p_player_id: user.id })
      return NextResponse.json({ result })
    }
    return NextResponse.json({ error: 'Unknown timed action.' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Timed action failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
