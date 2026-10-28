'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { ArrowRight, Check, LogOut, Radio, Send, ShieldCheck, UsersRound } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { gameFetcher, gameMutation } from '@/lib/game/client-api'
import type {
  ChatPostPayload,
  ChatPostResponse,
  ChatResponse,
  GameUser,
  OnlinePlayer,
  SaveStatus,
} from '@/lib/game/types'

type OnlinePanelProps = {
  user: GameUser | null
  sessionLoading: boolean
  players: OnlinePlayer[]
  presenceError: boolean
  saveStatus: SaveStatus
  onAuthenticated: () => Promise<void>
  onSignOut: () => Promise<void>
}

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  local: 'GUEST RUN · NOT SAVED',
  loading: 'LOADING CLOUD SAVE',
  saving: 'SYNCING CLOUD SAVE',
  saved: 'CLOUD SAVE SYNCED',
  error: 'SAVE SYNC ISSUE',
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function OnlinePanel({
  user,
  sessionLoading,
  players,
  presenceError,
  saveStatus,
  onAuthenticated,
  onSignOut,
}: OnlinePanelProps) {
  const [authMode, setAuthMode] = useState<'sign-up' | 'sign-in'>('sign-up')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authPending, setAuthPending] = useState(false)
  const [authError, setAuthError] = useState('')
  const [chatDraft, setChatDraft] = useState('')
  const [chatError, setChatError] = useState('')

  const chatKey = user ? (['/api/game/chat', user.id] as const) : null
  const chatFetcher = ([url]: readonly [string, string]) => gameFetcher<ChatResponse>(url)
  const {
    data: chatData,
    error: chatLoadError,
    isLoading: chatLoading,
    mutate: refreshChat,
  } = useSWR(chatKey, chatFetcher, {
    refreshInterval: 3_000,
    revalidateOnFocus: true,
    dedupingInterval: 1_000,
  })
  const { trigger: sendChat, isMutating: chatSending } = useSWRMutation<
    ChatPostResponse,
    Error,
    string,
    ChatPostPayload
  >('/api/game/chat', gameMutation)

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (authPending) return

    setAuthPending(true)
    setAuthError('')

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = authMode === 'sign-up'
        ? await authClient.signUp.email({
            name: displayName.trim(),
            email: normalizedEmail,
            password,
          })
        : await authClient.signIn.email({ email: normalizedEmail, password })

      if (result.error) {
        setAuthError('We couldn’t complete sign-in. Check your details and try again.')
        return
      }

      setPassword('')
      await onAuthenticated()
    } catch {
      setAuthError('We couldn’t complete sign-in. Check your details and try again.')
    } finally {
      setAuthPending(false)
    }
  }

  const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = chatDraft.trim()
    if (!message || chatSending) return

    setChatError('')
    try {
      await sendChat({ message })
      setChatDraft('')
      await refreshChat()
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Unable to send your message right now.')
    }
  }

  const handleSignOut = async () => {
    setAuthError('')
    try {
      await onSignOut()
    } catch {
      setAuthError('Unable to sign out right now. Please try again.')
    }
  }

  if (sessionLoading) {
    return (
      <div className="online-panel-content">
        <section className="online-status-card">
          <div className="online-orbit"><Radio aria-hidden="true" /></div>
          <span className="online-status-label">CHECKING SESSION</span>
          <h3>Warming up the city.</h3>
          <p>Your player account and shared-city connection are being checked.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="online-panel-content">
      <section className="online-status-card online-room-hero">
        <div className="online-orbit"><UsersRound aria-hidden="true" /></div>
        <span className="online-status-label">
          {user ? (presenceError ? 'CITY CONNECTION INTERRUPTED' : 'LIVE ROOM · EKO MAINLAND') : 'GUEST MODE · SOLO PLAY'}
        </span>
        <h3>{user ? `Good evening, ${user.name}.` : authMode === 'sign-up' ? 'Make a life after dark.' : 'Welcome back to Ekó.'}</h3>
        <p>
          {user
            ? 'Your account is in the shared city. Cloud saves and player-to-player roleplay are ready.'
            : 'Create an account to save your progress and meet other players. The solo city stays open either way.'}
        </p>

        {user ? (
          <div className="online-account-row">
            <span className={`online-save-status is-${saveStatus}`}>
              {saveStatus === 'saved' ? <Check aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {SAVE_STATUS_LABELS[saveStatus]}
            </span>
            <button className="online-sign-out" type="button" onClick={() => void handleSignOut()}>
              <LogOut aria-hidden="true" /> Sign out
            </button>
          </div>
        ) : (
          <form className="online-auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'sign-up' && (
              <label className="online-field">
                <span>PLAYER NAME</span>
                <input
                  autoComplete="nickname"
                  maxLength={32}
                  minLength={2}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="How the city knows you"
                  required
                  value={displayName}
                />
              </label>
            )}
            <label className="online-field">
              <span>EMAIL</span>
              <input
                autoComplete="email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="online-field">
              <span>PASSWORD</span>
              <input
                autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'}
                maxLength={128}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type="password"
                value={password}
              />
            </label>
            {authError && <p className="online-form-error" role="alert">{authError}</p>}
            <button className="primary-action online-auth-submit" type="submit" disabled={authPending}>
              {authPending ? 'CONNECTING…' : authMode === 'sign-up' ? 'CREATE PLAYER ACCOUNT' : 'SIGN IN'}
              <ArrowRight aria-hidden="true" />
            </button>
            <button
              className="online-auth-toggle"
              type="button"
              onClick={() => {
                setAuthMode((mode) => mode === 'sign-up' ? 'sign-in' : 'sign-up')
                setAuthError('')
              }}
            >
              {authMode === 'sign-up' ? 'Already have a player account? Sign in' : 'New to Ekó? Create an account'}
            </button>
          </form>
        )}
      </section>

      {user ? (
        <>
          <section className="online-section" aria-labelledby="online-roster-title">
            <header className="online-section-heading">
              <div>
                <span>PUBLIC ROLEPLAY ROOM</span>
                <h3 id="online-roster-title">In the city</h3>
              </div>
              <span className="online-count">{players.length}</span>
            </header>
            {presenceError ? (
              <p className="online-inline-note">The shared city is reconnecting. Solo play and your cloud save remain available.</p>
            ) : players.length === 0 ? (
              <p className="online-inline-note">The streets are quiet right now. Your character will be the first one in.</p>
            ) : (
              <ul className="online-roster">
                {players.map((player) => (
                  <li className="online-roster-player" key={player.userId}>
                    <span className="online-roster-avatar" aria-hidden="true">{player.displayName.slice(0, 1).toUpperCase()}</span>
                    <span className="online-roster-copy">
                      <strong>{player.displayName}{player.userId === user.id ? ' · YOU' : ''}</strong>
                      <small>{player.inVehicle ? 'Riding through the city' : 'Exploring on foot'}</small>
                    </span>
                    <span className="status-live-dot" aria-label="Online" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="online-section online-chat-section" aria-labelledby="online-chat-title">
            <header className="online-section-heading">
              <div>
                <span>PLAYER-TO-PLAYER</span>
                <h3 id="online-chat-title">City radio</h3>
              </div>
              <Radio aria-hidden="true" />
            </header>
            <div className="online-chat-transcript" role="log" aria-live="polite" aria-label="Public roleplay chat">
              {chatLoading && !chatData ? (
                <p className="online-chat-empty">Tuning into the room…</p>
              ) : chatLoadError && !chatData ? (
                <p className="online-chat-empty">City radio is temporarily unavailable.</p>
              ) : chatData?.messages.length ? (
                chatData.messages.map((entry) => (
                  <article className="online-chat-message" key={entry.id}>
                    <div className="online-chat-message-meta">
                      <strong>{entry.displayName}</strong>
                      <time dateTime={entry.createdAt}>{formatMessageTime(entry.createdAt)}</time>
                    </div>
                    <p>{entry.message}</p>
                  </article>
                ))
              ) : (
                <p className="online-chat-empty">No one has keyed in yet. Start the conversation.</p>
              )}
            </div>
            <form className="online-chat-form" onSubmit={handleChatSubmit}>
              <label className="sr-only" htmlFor="city-radio-message">Write a roleplay message</label>
              <input
                id="city-radio-message"
                maxLength={240}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Say something to the city…"
                value={chatDraft}
              />
              <button type="submit" disabled={!chatDraft.trim() || chatSending} aria-label="Send message">
                <Send aria-hidden="true" />
              </button>
            </form>
            <div className="online-chat-footer">
              <span>{chatDraft.length}/240 · Keep it kind and in character.</span>
              {chatError && <span role="alert">{chatError}</span>}
            </div>
          </section>
        </>
      ) : (
        <div className="online-footnote">
          <Radio aria-hidden="true" />
          <span>Solo play is available without an account. Guest progress lasts for this session; sign in to keep your story across visits.</span>
        </div>
      )}
    </div>
  )
}
