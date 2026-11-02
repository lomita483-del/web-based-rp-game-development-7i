'use client'

import { Gavel, Megaphone, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { gameFetcher } from '@/lib/game/client-api'
import type { AdminOverview, AdminPlayerRow } from '@/lib/game/types'
import { WORLD_LOCATIONS, formatNaira, getLocationEntrancePosition } from './game-data'
import type { AdminPowers } from './city-world'

type Tab = 'players' | 'world' | 'me' | 'log'

export type AdminPanelProps = {
  onClose: () => void
  playerPosition: { x: number; z: number }
  gameMinutes: number
  powers: AdminPowers
  godMode: boolean
  invisible: boolean
  onPowers: (next: Partial<AdminPowers>) => void
  onGodMode: (enabled: boolean) => void
  onInvisible: (enabled: boolean) => void
  onTeleport: (x: number, z: number) => void
  onGiveSelf: (cash: number) => void
  onRestoreSelf: () => void
  onSetOwnTime: (minutes: number) => void
  notify: (text: string) => void
}

const TIME_PRESETS = [
  { label: 'Sunrise', minutes: 6 * 60 },
  { label: 'Noon', minutes: 12 * 60 },
  { label: 'Sunset', minutes: 18 * 60 + 10 },
  { label: 'Night', minutes: 22 * 60 },
]

async function adminCall(body: Record<string, unknown>): Promise<string | null> {
  try {
    const response = await fetch('/api/game/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (response.ok) return null
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    return payload?.error ?? 'The action failed.'
  } catch {
    return 'Could not reach the server.'
  }
}

export function AdminPanel(props: AdminPanelProps) {
  const { onClose, notify } = props
  const [tab, setTab] = useState<Tab>('players')
  const { data, mutate, error } = useSWR<AdminOverview>('/api/game/admin', gameFetcher, { refreshInterval: tab === 'me' ? 0 : 5000 })

  const run = async (body: Record<string, unknown>, done: string) => {
    const problem = await adminCall(body)
    notify(problem ?? done)
    if (!problem) void mutate()
  }

  return (
    <div className="service-backdrop" onClick={onClose}>
      <section className="service-sheet admin-sheet" role="dialog" aria-modal="true" aria-label="Admin panel" onClick={(event) => event.stopPropagation()}>
        <header className="service-head">
          <div className="service-head-icon"><ShieldCheck aria-hidden="true" /></div>
          <div className="service-head-copy"><span>Game master</span><h2>Admin panel</h2></div>
          <button className="service-close" type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        </header>
        <nav className="admin-tabs" aria-label="Admin sections">
          {([['players', 'Players'], ['world', 'World'], ['me', 'Me'], ['log', 'Log']] as const).map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'is-active' : undefined} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <div className="service-body">
          {error && tab !== 'me' && <div className="service-card"><p>The admin server could not be reached. Check that you are signed in with an admin account and that ADMIN_EMAILS is set.</p></div>}
          {tab === 'players' && <PlayersTab {...props} players={data?.players ?? []} run={run} />}
          {tab === 'world' && <WorldTab {...props} overview={data} run={run} />}
          {tab === 'me' && <MeTab {...props} />}
          {tab === 'log' && (
            <div className="service-card">
              <div className="service-card-title"><Gavel aria-hidden="true" /> Recent admin actions</div>
              {(data?.log ?? []).length === 0 && <p>Nothing has been logged yet.</p>}
              <ul className="admin-list">
                {(data?.log ?? []).map((entry) => (
                  <li key={entry.id}><strong>{entry.action}</strong><span>{entry.target ? entry.target.slice(0, 8) : 'city'}</span><small>{new Date(entry.createdAt).toLocaleTimeString()}</small></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

type RunProps = { run: (body: Record<string, unknown>, done: string) => Promise<void> }

function PlayersTab({ players, run, playerPosition, onTeleport }: AdminPanelProps & RunProps & { players: AdminPlayerRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [cash, setCash] = useState('1000')
  const [message, setMessage] = useState('')
  if (players.length === 0) return <div className="service-card"><p>No players found yet.</p></div>
  return (
    <div className="admin-players">
      {players.map((player) => {
        const open = openId === player.userId
        return (
          <article key={player.userId} className={`service-card admin-player${open ? ' is-open' : ''}`}>
            <button type="button" className="admin-player-head" onClick={() => setOpenId(open ? null : player.userId)}>
              <i className={player.online ? 'is-online' : undefined} aria-hidden="true" />
              <strong>{player.name}</strong>
              <span>{player.cash === null ? '—' : formatNaira(player.cash)}</span>
              {player.muted && <em>MUTED</em>}
              {player.banned && <em>BANNED</em>}
            </button>
            {open && (
              <div className="admin-player-actions">
                <div className="service-chip-row">
                  <button type="button" disabled={player.x === null || player.z === null} onClick={() => { if (player.x !== null && player.z !== null) onTeleport(player.x, player.z + 2) }}>Go to</button>
                  <button type="button" onClick={() => void run({ action: 'teleport', userId: player.userId, x: playerPosition.x, z: playerPosition.z + 2 }, `${player.name} will be brought to you.`)}>Bring here</button>
                  <button type="button" onClick={() => void run({ action: 'heal', userId: player.userId }, `${player.name} restored.`)}>Heal</button>
                </div>
                <div className="service-chip-row">
                  <input className="admin-input" inputMode="numeric" value={cash} onChange={(event) => setCash(event.target.value.replace(/[^\d-]/g, ''))} aria-label="Cash amount" />
                  <button type="button" onClick={() => void run({ action: 'give-cash', userId: player.userId, amount: Number(cash) }, 'Cash sent.')}>Give / take cash</button>
                </div>
                <div className="service-chip-row">
                  <input className="admin-input admin-input-wide" value={message} maxLength={160} placeholder="Private message" onChange={(event) => setMessage(event.target.value)} aria-label="Private message" />
                  <button type="button" disabled={!message.trim()} onClick={() => { void run({ action: 'notify', userId: player.userId, message }, 'Message sent.'); setMessage('') }}>Send</button>
                </div>
                <div className="service-chip-row">
                  {player.muted
                    ? <button type="button" onClick={() => void run({ action: 'unmute', userId: player.userId }, 'Unmuted.')}>Unmute</button>
                    : <button type="button" onClick={() => void run({ action: 'mute', userId: player.userId, minutes: 10 }, 'Muted for 10 minutes.')}>Mute 10m</button>}
                  <button type="button" onClick={() => void run({ action: 'kick', userId: player.userId }, 'Player removed.')}>Kick</button>
                  {player.banned
                    ? <button type="button" onClick={() => void run({ action: 'unban', userId: player.userId }, 'Ban lifted.')}>Unban</button>
                    : <button type="button" onClick={() => void run({ action: 'ban', userId: player.userId, minutes: 60 * 24 }, 'Banned for 24 hours.')}>Ban 24h</button>}
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function WorldTab({ overview, run, onSetOwnTime }: AdminPanelProps & RunProps & { overview: AdminOverview | undefined }) {
  const [announcement, setAnnouncement] = useState('')
  return (
    <>
      <div className="service-card">
        <div className="service-card-title"><Megaphone aria-hidden="true" /> City announcement</div>
        <input className="admin-input admin-input-wide" value={announcement} maxLength={200} placeholder="Message every player will see" onChange={(event) => setAnnouncement(event.target.value)} aria-label="Announcement" />
        <button className="primary-action" type="button" disabled={!announcement.trim()} onClick={() => { void run({ action: 'announce', message: announcement }, 'Announcement sent.'); setAnnouncement('') }}>BROADCAST</button>
      </div>
      <div className="service-card">
        <div className="service-card-title"><Sparkles aria-hidden="true" /> Time of day</div>
        <div className="service-chip-row"><span>For me</span>{TIME_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => onSetOwnTime(preset.minutes)}>{preset.label}</button>)}</div>
        <div className="service-chip-row"><span>Everyone</span>{TIME_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => void run({ action: 'set-time', minutes: preset.minutes }, `City time set to ${preset.label}.`)}>{preset.label}</button>)}</div>
      </div>
      <div className="service-card">
        <div className="service-card-title"><Gavel aria-hidden="true" /> Chat moderation</div>
        <ul className="admin-list">
          {(overview?.chat ?? []).slice(-12).map((message) => (
            <li key={message.id}><strong>{message.displayName}</strong><span>{message.message}</span><button type="button" onClick={() => void run({ action: 'delete-message', id: message.id }, 'Message removed.')} aria-label="Delete message"><X aria-hidden="true" /></button></li>
          ))}
          {(overview?.chat ?? []).length === 0 && <li><span>No chat messages.</span></li>}
        </ul>
        <button className="secondary-action" type="button" onClick={() => void run({ action: 'clear-chat' }, 'Chat cleared.')}>CLEAR ALL CHAT</button>
      </div>
    </>
  )
}

function MeTab({ powers, godMode, invisible, onPowers, onGodMode, onInvisible, onTeleport, onGiveSelf, onRestoreSelf, playerPosition, gameMinutes }: AdminPanelProps) {
  const [x, setX] = useState('')
  const [z, setZ] = useState('')
  const hour = Math.floor(((gameMinutes / 60) % 24 + 24) % 24)
  return (
    <>
      <div className="service-card">
        <div className="service-card-title"><UserRound aria-hidden="true" /> Admin character</div>
        <div className="service-chip-row"><span>Speed</span>{[1, 2, 4].map((speed) => <button key={speed} type="button" className={powers.speed === speed ? 'is-on' : undefined} onClick={() => onPowers({ speed })}>{speed}×</button>)}</div>
        <div className="service-chip-row">
          <span>Powers</span>
          <button type="button" className={godMode ? 'is-on' : undefined} onClick={() => onGodMode(!godMode)}>God mode</button>
          <button type="button" className={powers.noclip ? 'is-on' : undefined} onClick={() => onPowers({ noclip: !powers.noclip })}>Noclip</button>
          <button type="button" className={powers.fly ? 'is-on' : undefined} onClick={() => onPowers({ fly: !powers.fly })}>Fly</button>
          <button type="button" className={invisible ? 'is-on' : undefined} onClick={() => onInvisible(!invisible)}>Hide from map</button>
        </div>
        <div className="service-chip-row"><span>Wallet</span>{[1000, 10000, 100000].map((amount) => <button key={amount} type="button" onClick={() => onGiveSelf(amount)}>+{formatNaira(amount)}</button>)}<button type="button" onClick={onRestoreSelf}>Restore vitals</button></div>
        <p>You are at {playerPosition.x.toFixed(0)}, {playerPosition.z.toFixed(0)} · city time {String(hour).padStart(2, '0')}:00</p>
      </div>
      <div className="service-card">
        <div className="service-card-title"><Sparkles aria-hidden="true" /> Teleport</div>
        <div className="service-chip-row">
          <input className="admin-input" inputMode="numeric" value={x} placeholder="X" onChange={(event) => setX(event.target.value.replace(/[^\d.-]/g, ''))} aria-label="X coordinate" />
          <input className="admin-input" inputMode="numeric" value={z} placeholder="Z" onChange={(event) => setZ(event.target.value.replace(/[^\d.-]/g, ''))} aria-label="Z coordinate" />
          <button type="button" disabled={x === '' || z === '' || Number.isNaN(Number(x)) || Number.isNaN(Number(z))} onClick={() => onTeleport(Number(x), Number(z))}>Go</button>
        </div>
        <div className="service-chip-row admin-places">
          {WORLD_LOCATIONS.map((location) => {
            const entrance = getLocationEntrancePosition(location.id) ?? location
            return <button key={location.id} type="button" onClick={() => onTeleport(entrance.x, entrance.z + 1.5)}>{location.name}</button>
          })}
        </div>
      </div>
    </>
  )
}
