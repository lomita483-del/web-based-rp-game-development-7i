'use client'

import type { CSSProperties, PointerEvent } from 'react'
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Compass,
  Map,
  MapPin,
  Package,
  Radio,
  Sparkles,
  Utensils,
  UsersRound,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  CITY_CHARACTERS,
  WORLD_LOCATIONS,
  formatGameTime,
  formatNaira,
  getMissionDetails,
  type CharacterId,
  type GamePanel,
  type LocationId,
  type PlayerState,
} from './game-data'
import { OnlinePanel } from './online-panel'
import type { GameUser, OnlinePlayer, SaveStatus } from '@/lib/game/types'

type HudProps = {
  player: PlayerState
  isOnline: boolean
  gameMinutes: number
  playerPosition: { x: number; z: number }
  nearbyCharacter: (typeof CITY_CHARACTERS)[number] | null
  nearbyLocation: (typeof WORLD_LOCATIONS)[number] | null
  waypoint: LocationId | null
  activePanel: GamePanel
  toast: { id: number; text: string } | null
  onOpenPanel: (panel: Exclude<GamePanel, 'none'>) => void
  onInteract: () => void
  onMoveKey: (key: string, pressed: boolean) => void
}

const PANEL_ACTIONS: { id: Exclude<GamePanel, 'none'>; label: string; icon: LucideIcon; shortcut: string }[] = [
  { id: 'map', label: 'City map', icon: Map, shortcut: 'M' },
  { id: 'jobs', label: 'Work board', icon: BriefcaseBusiness, shortcut: 'J' },
  { id: 'inventory', label: 'Bag', icon: Package, shortcut: 'I' },
  { id: 'online', label: 'Online', icon: UsersRound, shortcut: 'O' },
]

function mapPoint(position: { x: number; z: number }) {
  return {
    left: `${50 + position.x * 0.68}%`,
    top: `${50 + position.z * 0.68}%`,
  }
}

export function GameHud({
  player,
  isOnline,
  gameMinutes,
  playerPosition,
  nearbyCharacter,
  nearbyLocation,
  waypoint,
  activePanel,
  toast,
  onOpenPanel,
  onInteract,
  onMoveKey,
}: HudProps) {
  const mission = getMissionDetails(player.stage)
  const currentDistrict = nearbyLocation?.district ?? 'Lagos Mainland'
  const targetLocation = WORLD_LOCATIONS.find((location) => location.id === waypoint)
  const interactionLabel = nearbyCharacter
    ? `Talk to ${nearbyCharacter.name}`
    : nearbyLocation
      ? `Explore ${nearbyLocation.name}`
      : 'Wander the city'

  return (
    <div className="game-hud">
      <header className="game-topbar">
        <div className="brand-lockup" aria-label="Eko After Hours">
          <div className="brand-emblem">EA</div>
          <div className="brand-copy">
            <span className="brand-title">EKÓ</span>
            <span className="brand-subtitle">AFTER HOURS</span>
          </div>
        </div>

        <div className="world-status">
          <span className="status-live-dot" />
          <span>{isOnline ? 'LIVE CITY' : 'SOLO SESSION'}</span>
          <span className="status-separator">/</span>
          <span className="world-district">{currentDistrict}</span>
        </div>

        <div className="topbar-right">
          <div className="world-clock">
            <Clock3 aria-hidden="true" />
            <span>{formatGameTime(gameMinutes)}</span>
          </div>
          <div className="wallet-pill">
            <Wallet aria-hidden="true" />
            <span>{formatNaira(player.cash)}</span>
          </div>
          <button
            className="player-chip"
            type="button"
            onClick={() => onOpenPanel('inventory')}
            aria-label={`Open ${player.name}'s player bag, level ${player.level}`}
          >
            <span className="player-avatar">{player.name.slice(0, 1)}</span>
            <span className="player-chip-copy">
              <span>{player.name}</span>
              <small>LVL {player.level}</small>
            </span>
          </button>
        </div>
      </header>

      <aside className="mission-card" aria-label="Current story objective">
        <div className="mission-card-topline">
          <span className="mission-eyebrow"><Sparkles aria-hidden="true" />{mission.eyebrow}</span>
          <span className="mission-index">01 / 03</span>
        </div>
        <h1>{mission.title}</h1>
        <p>{mission.objective}</p>
        <div className="mission-progress-track" aria-label={`Mission progress ${Math.round(mission.progress * 100)} percent`}>
          <span style={{ width: `${mission.progress * 100}%` }} />
        </div>
        <div className="mission-card-footer">
          <span className="mission-reward">{mission.reward}</span>
          <button type="button" onClick={() => onOpenPanel('jobs')}>
            Details <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="quick-dock" role="group" aria-label="Game tools">
        {PANEL_ACTIONS.map(({ id, label, icon: Icon, shortcut }) => (
          <button
            className={`quick-action${activePanel === id ? ' is-active' : ''}`}
            type="button"
            key={id}
            onClick={() => onOpenPanel(id)}
            aria-label={`${label}, shortcut ${shortcut}`}
            aria-pressed={activePanel === id}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <kbd>{shortcut}</kbd>
          </button>
        ))}
      </div>

      <div className="minimap-card" aria-label="Mini map">
        <div className="minimap-heading">
          <span><Compass aria-hidden="true" /> EKO DISTRICT</span>
          <span className="minimap-scale">N ↑</span>
        </div>
        <div className="minimap">
          <span className="minimap-road minimap-road-horizontal" />
          <span className="minimap-road minimap-road-vertical" />
          <span className="minimap-road minimap-road-horizontal minimap-road-offset" />
          <span className="minimap-road minimap-road-vertical minimap-road-offset" />
          {WORLD_LOCATIONS.map((location) => (
            <span
              className={`minimap-location${location.id === waypoint ? ' is-target' : ''}`}
              key={location.id}
              title={location.name}
              style={mapPoint(location)}
            />
          ))}
          <span className="minimap-player" style={mapPoint(playerPosition)} />
        </div>
        <div className="minimap-footer">
          <span>{targetLocation ? `ROUTE · ${targetLocation.name}` : 'FREE ROAM'}</span>
          <button type="button" onClick={() => onOpenPanel('map')} aria-label="Open full city map">
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="bottom-status">
        <span><Radio aria-hidden="true" /> CITY RADIO</span>
        <span className="radio-track">Lagos After Dark <i>—</i> 02:14</span>
        <span className="radio-eq" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </div>

      <div className="interaction-wrap">
        <button
          className="interaction-button"
          type="button"
          onClick={onInteract}
          disabled={!nearbyCharacter && !nearbyLocation}
        >
          <span className="interaction-key">E</span>
          <span className="interaction-copy">
            <small>{nearbyCharacter ? 'ROLEPLAY' : nearbyLocation ? 'LOCATION' : 'EXPLORE'}</small>
            <strong>{interactionLabel}</strong>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      </div>

      <div className="keyboard-hints" aria-label="Keyboard controls">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span>
        <span><kbd>E</kbd> INTERACT</span>
        <span><kbd>TAB</kbd> PHONE</span>
      </div>

      <div className="touch-controls" role="group" aria-label="Touch movement controls">
        <button type="button" aria-label="Move forward" onPointerDown={(event) => pressMove(event, 'w', onMoveKey)} onPointerUp={(event) => releaseMove(event, 'w', onMoveKey)} onPointerCancel={(event) => releaseMove(event, 'w', onMoveKey)}><ChevronUp aria-hidden="true" /></button>
        <button type="button" aria-label="Move left" onPointerDown={(event) => pressMove(event, 'a', onMoveKey)} onPointerUp={(event) => releaseMove(event, 'a', onMoveKey)} onPointerCancel={(event) => releaseMove(event, 'a', onMoveKey)}><ChevronLeft aria-hidden="true" /></button>
        <button type="button" aria-label="Move backward" onPointerDown={(event) => pressMove(event, 's', onMoveKey)} onPointerUp={(event) => releaseMove(event, 's', onMoveKey)} onPointerCancel={(event) => releaseMove(event, 's', onMoveKey)}><ChevronDown aria-hidden="true" /></button>
        <button type="button" aria-label="Move right" onPointerDown={(event) => pressMove(event, 'd', onMoveKey)} onPointerUp={(event) => releaseMove(event, 'd', onMoveKey)} onPointerCancel={(event) => releaseMove(event, 'd', onMoveKey)}><ChevronRight aria-hidden="true" /></button>
      </div>

      <div className="vitals-card" aria-label="Player condition">
        <div className="vital-row"><Zap aria-hidden="true" /><span>ENERGY</span><div><i style={{ width: `${player.energy}%` }} /></div><b>{player.energy}%</b></div>
        <div className="vital-row"><Activity aria-hidden="true" /><span>HUNGER</span><div><i style={{ width: `${player.hunger}%` }} /></div><b>{player.hunger}%</b></div>
      </div>

      {toast && <div className="game-toast" role="status" aria-live="polite" key={toast.id}><Check aria-hidden="true" />{toast.text}</div>}
    </div>
  )
}

function pressMove(
  event: PointerEvent<HTMLButtonElement>,
  key: string,
  onMoveKey: (key: string, pressed: boolean) => void,
) {
  event.preventDefault()
  event.currentTarget.setPointerCapture(event.pointerId)
  onMoveKey(key, true)
}

function releaseMove(
  event: PointerEvent<HTMLButtonElement>,
  key: string,
  onMoveKey: (key: string, pressed: boolean) => void,
) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  onMoveKey(key, false)
}

type GamePanelsProps = {
  panel: Exclude<GamePanel, 'none'>
  player: PlayerState
  waypoint: LocationId | null
  playerPosition: { x: number; z: number }
  onClose: () => void
  onChangePanel: (panel: Exclude<GamePanel, 'none'>) => void
  onAcceptDelivery: () => void
  onBuyFood: () => void
  onEatFood: () => void
  onSetWaypoint: (locationId: LocationId) => void
  user: GameUser | null
  sessionLoading: boolean
  players: OnlinePlayer[]
  presenceError: boolean
  saveStatus: SaveStatus
  onAuthenticated: () => Promise<void>
  onSignOut: () => Promise<void>
}

const PANEL_META: Record<Exclude<GamePanel, 'none'>, { title: string; eyebrow: string; icon: LucideIcon }> = {
  map: { title: 'City map', eyebrow: 'EKO / WAYFINDING', icon: Map },
  jobs: { title: 'Work board', eyebrow: 'NIGHT SHIFT / AVAILABLE', icon: BriefcaseBusiness },
  inventory: { title: 'Your bag', eyebrow: 'PLAYER / LOADOUT', icon: Package },
  online: { title: 'Shared world', eyebrow: 'LIVE ROOM / EKO MAINLAND', icon: UsersRound },
}

export function GamePanels({
  panel,
  player,
  waypoint,
  playerPosition,
  onClose,
  onChangePanel,
  onAcceptDelivery,
  onBuyFood,
  onEatFood,
  onSetWaypoint,
  user,
  sessionLoading,
  players,
  presenceError,
  saveStatus,
  onAuthenticated,
  onSignOut,
}: GamePanelsProps) {
  const meta = PANEL_META[panel]
  const Icon = meta.icon

  return (
    <div className="panel-overlay" onClick={onClose}>
      <section
        className="game-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="panel-header">
          <div className="panel-heading-icon"><Icon aria-hidden="true" /></div>
          <div>
            <span>{meta.eyebrow}</span>
            <h2 id="game-panel-title">{meta.title}</h2>
          </div>
          <button className="panel-close" type="button" onClick={onClose} aria-label="Close panel"><X aria-hidden="true" /></button>
        </header>

        <nav className="panel-tabs" aria-label="Game menu">
          {PANEL_ACTIONS.map(({ id, label, icon: TabIcon }) => (
            <button
              type="button"
              key={id}
              className={panel === id ? 'is-active' : ''}
              aria-current={panel === id ? 'page' : undefined}
              onClick={() => onChangePanel(id)}
            >
              <TabIcon aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        <div className="panel-scroll">
          {panel === 'map' && <MapPanel waypoint={waypoint} playerPosition={playerPosition} onSetWaypoint={onSetWaypoint} />}
          {panel === 'jobs' && <JobsPanel player={player} onAcceptDelivery={onAcceptDelivery} onSetWaypoint={onSetWaypoint} />}
          {panel === 'inventory' && <InventoryPanel player={player} onBuyFood={onBuyFood} onEatFood={onEatFood} />}
          {panel === 'online' && (
            <OnlinePanel
              user={user}
              sessionLoading={sessionLoading}
              players={players}
              presenceError={presenceError}
              saveStatus={saveStatus}
              onAuthenticated={onAuthenticated}
              onSignOut={onSignOut}
            />
          )}
        </div>
      </section>
    </div>
  )
}

function MapPanel({
  waypoint,
  playerPosition,
  onSetWaypoint,
}: Pick<GamePanelsProps, 'waypoint' | 'playerPosition' | 'onSetWaypoint'>) {
  return (
    <div className="map-panel-content">
      <div className="full-map" aria-label="Eko neighborhood map">
        <span className="full-map-road full-map-road-horizontal" />
        <span className="full-map-road full-map-road-horizontal full-map-road-lower" />
        <span className="full-map-road full-map-road-vertical" />
        <span className="full-map-road full-map-road-vertical full-map-road-right" />
        {WORLD_LOCATIONS.map((location) => (
          <button
            key={location.id}
            className={`map-pin${waypoint === location.id ? ' is-target' : ''}`}
            type="button"
            style={mapPoint(location)}
            onClick={() => onSetWaypoint(location.id)}
            aria-label={`Set route to ${location.name}`}
            title={location.name}
          >
            <MapPin aria-hidden="true" />
          </button>
        ))}
        <span className="map-player" style={mapPoint(playerPosition)} aria-label="Your position" />
        <div className="map-north">N ↑</div>
        <div className="map-label map-label-market">ISLAND</div>
        <div className="map-label map-label-mainland">MAINLAND</div>
      </div>
      <div className="map-section-heading">
        <div><span>YOUR DISTRICTS</span><small>Tap a pin to set a route</small></div>
        <Compass aria-hidden="true" />
      </div>
      <div className="location-list">
        {WORLD_LOCATIONS.map((location) => (
          <button className="location-row" type="button" key={location.id} onClick={() => onSetWaypoint(location.id)}>
            <span className={`location-marker location-marker-${location.kind}`}><MapPin aria-hidden="true" /></span>
            <span className="location-row-copy"><strong>{location.name}</strong><small>{location.district} · {location.description}</small></span>
            <span className="location-distance">{Math.round(Math.hypot(playerPosition.x - location.x, playerPosition.z - location.z))}m</span>
          </button>
        ))}
      </div>
      <p className="panel-footnote">The gold beacon marks your current route. Use WASD or the touch pad to explore.</p>
    </div>
  )
}

function JobsPanel({
  player,
  onAcceptDelivery,
  onSetWaypoint,
}: Pick<GamePanelsProps, 'player' | 'onAcceptDelivery' | 'onSetWaypoint'>) {
  const isDeliveryActive = player.stage === 'delivery'
  const canStart = player.stage === 'find-tunde' || player.stage === 'free-roam'
  const introComplete = player.stage !== 'meet-bisi'

  return (
    <div className="jobs-panel-content">
      <div className="shift-summary">
        <div className="shift-summary-icon"><BriefcaseBusiness aria-hidden="true" /></div>
        <div><span>TONIGHT'S REP</span><strong>{player.completedRuns} completed {player.completedRuns === 1 ? 'run' : 'runs'}</strong></div>
        <span className="rep-pill">{player.reputation} REP</span>
      </div>
      {!introComplete && (
        <div className="job-unlock-note"><Sparkles aria-hidden="true" /><span>Meet Bisi at Eko Civic Square to unlock the first courier route.</span></div>
      )}
      <article className="job-card job-card-featured">
        <div className="job-card-meta"><span className="job-category">COURIER / LOCAL</span><span className="job-duration">6–8 MIN</span></div>
        <h3>Last-mile delivery</h3>
        <p>Carry a sealed parcel from Balogun Night Market to Ada at Afterglow. No shortcuts required — just a good story.</p>
        <div className="job-reward-row"><span><Wallet aria-hidden="true" /> ₦480</span><span><Sparkles aria-hidden="true" /> +25 rep</span><span><MapPin aria-hidden="true" /> 2 districts</span></div>
        <button className="primary-action" type="button" onClick={isDeliveryActive ? () => onSetWaypoint('club') : onAcceptDelivery} disabled={!canStart && !isDeliveryActive}>
          {isDeliveryActive ? 'ROUTE TO AFTERGLOW' : canStart ? 'ACCEPT COURIER RUN' : 'MEET BISI FIRST'}
          <ArrowRight aria-hidden="true" />
        </button>
        {isDeliveryActive && <small className="job-active-note"><span className="status-live-dot" /> IN PROGRESS · PACKAGE IN YOUR BAG</small>}
      </article>
      <article className="job-card job-card-secondary">
        <div className="job-card-meta"><span className="job-category">RIDE / RENTAL</span><span className="job-duration">OPEN SHIFT</span></div>
        <h3>Get a scooter</h3>
        <p>Rent a nimble city scooter from Kunle at Mainland Motors for ₦350.</p>
        <button className="secondary-action" type="button" onClick={() => onSetWaypoint('garage')}>MARK MAINLAND MOTORS <ArrowRight aria-hidden="true" /></button>
      </article>
    </div>
  )
}

function InventoryPanel({
  player,
  onBuyFood,
  onEatFood,
}: Pick<GamePanelsProps, 'player' | 'onBuyFood' | 'onEatFood'>) {
  const hasSuya = player.inventory.some((item) => item.id === 'suya' && item.quantity > 0)
  return (
    <div className="inventory-panel-content">
      <div className="bag-stats">
        <div><span>CAPACITY</span><strong>{player.inventory.reduce((total, item) => total + item.quantity, 0)} / 12</strong></div>
        <div><span>ON HAND</span><strong>{formatNaira(player.cash)}</strong></div>
      </div>
      <div className="inventory-list">
        {player.inventory.map((item) => (
          <article className="inventory-item" key={item.id}>
            <div className={`inventory-item-icon inventory-item-${item.id}`}>
              {item.id === 'suya' ? <Utensils aria-hidden="true" /> : item.id === 'parcel' ? <Package aria-hidden="true" /> : <Compass aria-hidden="true" />}
            </div>
            <div className="inventory-item-copy"><strong>{item.name}</strong><small>{item.detail}</small></div>
            <span className="inventory-quantity">×{item.quantity}</span>
            {item.id === 'suya' && <button type="button" className="use-item-button" onClick={onEatFood} disabled={!hasSuya}>USE</button>}
          </article>
        ))}
        {player.inventory.length === 0 && <div className="inventory-empty"><Package aria-hidden="true" /><span>Your bag is empty.</span></div>}
      </div>
      <div className="vendor-card">
        <div className="vendor-card-icon"><Utensils aria-hidden="true" /></div>
        <div><span>PALM & PEPPER</span><strong>Suya wrap · ₦90</strong><small>Small bite, useful boost.</small></div>
        <button type="button" onClick={onBuyFood}>BUY</button>
      </div>
    </div>
  )
}

export function NpcDialogue({
  characterId,
  player,
  onClose,
  onAction,
}: {
  characterId: CharacterId
  player: PlayerState
  onClose: () => void
  onAction: () => void
}) {
  const character = CITY_CHARACTERS.find((entry) => entry.id === characterId)
  if (!character) return null

  const actionLabel = getCharacterActionLabel(characterId, player)
  return (
    <section className="npc-dialogue" role="dialog" aria-modal="true" aria-labelledby="npc-dialogue-title">
      <button className="npc-dialogue-close" type="button" onClick={onClose} aria-label="Close conversation"><X aria-hidden="true" /></button>
      <div className="npc-dialogue-topline"><span className="roleplay-mark"><UsersRound aria-hidden="true" /> NEARBY / ROLEPLAY</span><span className="npc-distance"><span /> IN RANGE</span></div>
      <div className="npc-dialogue-main">
        <div className="npc-portrait" style={{ '--npc-color': character.color } as CSSProperties}>{character.name.slice(0, 1)}</div>
        <div className="npc-copy">
          <span className="npc-role">{character.role}</span>
          <h2 id="npc-dialogue-title">{character.name}</h2>
          <p>“{getCharacterLine(characterId, player)}”</p>
        </div>
      </div>
      <div className="npc-dialogue-actions">
        <button className="primary-action" type="button" onClick={onAction}>{actionLabel}<ArrowRight aria-hidden="true" /></button>
        <button className="conversation-close" type="button" onClick={onClose}>Not now</button>
      </div>
    </section>
  )
}

function getCharacterActionLabel(id: CharacterId, player: PlayerState) {
  switch (id) {
    case 'bisi':
      return player.stage === 'meet-bisi' ? 'Get the city rundown' : 'Ask about the neighborhood'
    case 'tunde':
      return player.stage === 'delivery' ? 'Keep the parcel moving' : 'Take a courier run'
    case 'ada':
      return player.stage === 'delivery' ? 'Hand over the parcel' : 'Ask about the club'
    case 'kunle':
      return player.ownsScooter ? (player.inVehicle ? 'Park the scooter' : 'Take your scooter') : 'Rent scooter · ₦350'
    case 'sade':
      return 'Buy suya · ₦90'
  }
}

function getCharacterLine(id: CharacterId, player: PlayerState) {
  if (id === 'bisi' && player.stage !== 'meet-bisi') return 'You are finding your feet. Tunde has a delivery if you want to make a little money.'
  if (id === 'tunde' && player.stage === 'delivery') return 'The parcel is in your bag. Ada is waiting at Afterglow — follow the gold beacon.'
  if (id === 'ada' && player.stage === 'delivery') return 'You made it. Hand it over and I will make sure the night remembers you.'
  if (id === 'kunle' && player.ownsScooter) return 'Your scooter is ready. Take it for a spin, then bring it back in one piece.'
  return CITY_CHARACTERS.find((character) => character.id === id)?.intro ?? ''
}
