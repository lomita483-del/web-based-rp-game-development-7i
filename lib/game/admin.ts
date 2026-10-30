import { pool } from '@/lib/db'

/** Admins are configured with ADMIN_EMAILS (comma separated). Nobody is an admin by default. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const configured = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return configured.includes(email.trim().toLowerCase())
}

let tablesReady: Promise<void> | null = null

/** Admin tables are created lazily (idempotent) so no separate migration step is required. */
export function ensureAdminTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await pool.query(`
        create table if not exists eko_admin_commands (
          id uuid primary key default gen_random_uuid(),
          "userId" text not null,
          type text not null,
          payload jsonb not null default '{}'::jsonb,
          "createdBy" text,
          "createdAt" timestamptz not null default now(),
          "consumedAt" timestamptz
        );
        create index if not exists eko_admin_commands_pending on eko_admin_commands ("userId") where "consumedAt" is null;
        create table if not exists eko_admin_flags (
          "userId" text primary key,
          "mutedUntil" timestamptz,
          "bannedUntil" timestamptz,
          note text,
          "updatedAt" timestamptz not null default now()
        );
        create table if not exists eko_admin_announcements (
          id uuid primary key default gen_random_uuid(),
          message text not null,
          "createdBy" text,
          "createdAt" timestamptz not null default now()
        );
        create table if not exists eko_admin_log (
          id uuid primary key default gen_random_uuid(),
          "adminId" text not null,
          action text not null,
          target text,
          detail jsonb,
          "createdAt" timestamptz not null default now()
        );
      `)
    })().catch((error) => {
      tablesReady = null
      throw error
    })
  }
  return tablesReady
}

export type PlayerFlags = { muted: boolean; banned: boolean; mutedUntil: string | null; bannedUntil: string | null }

export async function getPlayerFlags(userId: string): Promise<PlayerFlags> {
  await ensureAdminTables()
  const result = await pool.query<{ mutedUntil: Date | null; bannedUntil: Date | null }>(
    'select "mutedUntil", "bannedUntil" from eko_admin_flags where "userId" = $1',
    [userId],
  )
  const row = result.rows[0]
  const now = Date.now()
  const mutedUntil = row?.mutedUntil ?? null
  const bannedUntil = row?.bannedUntil ?? null
  return {
    muted: Boolean(mutedUntil && mutedUntil.getTime() > now),
    banned: Boolean(bannedUntil && bannedUntil.getTime() > now),
    mutedUntil: mutedUntil ? mutedUntil.toISOString() : null,
    bannedUntil: bannedUntil ? bannedUntil.toISOString() : null,
  }
}

export type AdminCommandType = 'give-cash' | 'heal' | 'teleport' | 'set-time' | 'notify' | 'kick'
