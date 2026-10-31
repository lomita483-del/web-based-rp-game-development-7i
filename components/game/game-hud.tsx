'use client'

import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent } from 'react'
import {
  Activity,
  ArrowRight,
  Droplets,
  Smile,
  UserRound,
  Home,
  ShoppingBag,
  Smartphone,
  Bike,
  BriefcaseBusiness,
  Building2,
  BusFront,
  CarFront,
  Footprints,
  KeyRound,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Compass,
  Landmark,
  Map,
  MapPin,
  Package,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  UsersRound,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  CITY_BUILDINGS,
  CITY_CHARACTERS,
  CITY_JOBS,
  WORLD_LOCATIONS,
  distanceBetween,
  estimateRideFare,
  formatGameTime,
  formatNaira,
  getMissionDetails,
  type CharacterId,
  type FactionId,
  type GamePanel,
  type HomeId,
  type JobId,
  type LocationId,
  type PlayerState,
  type InteriorDefinition,
  type RideBooking,
  type RideBookingStatus,
  type RideVehicleType,
} from './game-data'
import { CAMPUS_BOUNDS, GRID_LINES, worldToMapPercent } from '@/lib/game/world'
import { LifePanel } from './life-panel'
import { OnlinePanel } from './online-panel'
import type { GameUser, OnlinePlayer, SaveStatus } from '@/lib/game/types'

export type TravelMode = RideVehicleType | 'drive' | 'walk'

type HudProps = {
  player: PlayerState
  isOnline: boolean
  gameMinutes: number
  playerPosition: { x: number; z: number }
  nearbyCharacter: (typeof CITY_CHARACTERS)[number] | null
  nearbyLocation: (typeof WORLD_LOCATIONS)[number] | null
  nearbyInterior: InteriorDefinition | null
  prioritizeInterior: boolean
  activeInterior: InteriorDefinition | null
  nearInteriorAction: boolean
  canExitInterior: boolean
  rideBooking: RideBooking | null
  waypoint: LocationId | null
  activePanel: GamePanel
  toast: { id: number; text: string } | null
  onOpenPanel: (panel: Exclude<GamePanel, 'none'>) => void
  onInteract: () => void
  onMoveKey: (key: string, pressed: boolean) => void
  joystickRef: MutableRefObject<{ x: number; y: number }>
  isAdmin: boolean
  onOpenSettings: () => void
  rideStatus: string | null
  canCancelRide: boolean
  onCancelRide: () => void
  nearWaitingRide: boolean
}

const PANEL_ACTIONS: { id: Exclude<GamePanel, 'none'>; label: string; icon: LucideIcon; shortcut: string }[] = [
  { id: 'map', label: 'City map', icon: Map, shortcut: 'M' },
  { id: 'jobs', label: 'Work board', icon: BriefcaseBusiness, shortcut: 'J' },
  { id: 'life', label: 'City life', icon: Landmark, shortcut: 'P' },
  { id: 'inventory', label: 'Bag', icon: Package, shortcut: 'I' },
  { id: 'online', label: 'Online', icon: UsersRound, shortcut: 'O' },
]

const RIDE_STATUS_LABELS: Record<RideBookingStatus, string> = {
  dispatching: 'Finding a nearby driver',
  approaching: 'Driver is on the way',
  boarding: 'Your ride has arrived',
  'en-route': 'Riding across town',
  arrived: 'You have arrived',
}

const RIDE_MODE_LABELS: Record<RideVehicleType, string> = {
  cab: 'City cab',
  bike: 'Okada',
  danfo: 'Danfo',
  driver: 'Private driver',
}

function mapCoordinates(position: { x: number; z: number }) {
  return worldToMapPercent(position)
}

function campusMapStyle(): CSSProperties {
  const topLeft = worldToMapPercent({ x: CAMPUS_BOUNDS.minX, z: CAMPUS_BOUNDS.minZ })
  const bottomRight = worldToMapPercent({ x: CAMPUS_BOUNDS.maxX, z: CAMPUS_BOUNDS.maxZ })
  return { left: `${topLeft.x}%`, top: `${topLeft.y}%`, width: `${bottomRight.x - topLeft.x}%`, height: `${bottomRight.y - topLeft.y}%` }
}

function mapPoint(position: { x: number; z: number }) {
  const point = mapCoordinates(position)
  return { left: `${point.x}%`, top: `${point.y}%` }
}

export function GameHud({
  player,
  isOnline,
  gameMinutes,
  playerPosition,
  nearbyCharacter,
  nearbyLocation,
  nearbyInterior,
  prioritizeInterior,
  activeInterior,
  nearInteriorAction,
  canExitInterior,
  rideBooking,
  waypoint,
  activePanel,
  toast,
  onOpenPanel,
  onInteract,
  onMoveKey,
  joystickRef,
  isAdmin,
  onOpenSettings,
  rideStatus,
  canCancelRide,
  onCancelRide,
  nearWaitingRide,
}: HudProps) {
  useEffect(() => () => { joystickRef.current.x = 0; joystickRef.current.y = 0 }, [joystickRef])
  const mission = getMissionDetails(player.stage)
  const currentDistrict = activeInterior?.district ?? nearbyLocation?.district ?? 'Lagos Mainland'
  const streets = GRID_LINES
  const targetLocation = WORLD_LOCATIONS.find((location) => location.id === waypoint)
  const rideDestination = rideBooking && WORLD_LOCATIONS.find((location) => location.id === rideBooking.destinationId)
  const RideIcon = rideBooking?.mode === 'bike' ? Bike : rideBooking?.mode === 'danfo' ? BusFront : CarFront
  const knobRef = useRef<HTMLSpanElement>(null)
  const [radioOn, setRadioOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const interactionLabel = activeInterior
    ? nearInteriorAction ? activeInterior.actionLabel : canExitInterior ? `Exit ${activeInterior.name}` : `Inside ${activeInterior.name}`
    : nearbyInterior && prioritizeInterior
      ? `Enter ${nearbyInterior.name}`
      : nearbyCharacter
        ? `Talk to ${nearbyCharacter.name}`
        : nearbyInterior
          ? `Enter ${nearbyInterior.name}`
          : nearbyLocation
            ? `Explore ${nearbyLocation.name}`
            : 'Wander the city'
  const interactionEyebrow = activeInterior
    ? nearInteriorAction ? 'SERVICE' : canExitInterior ? 'EXIT' : 'INSIDE'
    : nearbyInterior ? 'BUILDING ENTRY' : nearbyCharacter ? 'ROLEPLAY' : nearbyLocation ? 'LOCATION' : 'EXPLORE'
  const interactionEnabled = activeInterior
    ? nearInteriorAction || canExitInterior
    : Boolean(nearbyCharacter || nearbyInterior || nearbyLocation)

  return (
    <div className="game-hud">
      <header className="game-topbar">
        <div className="brand-lockup" aria-label="Lagos Life">
          <div className="brand-emblem">LL</div>
          <div className="brand-copy">
            <span className="brand-title">LAGOS</span>
            <span className="brand-subtitle">LIFE SIMULATOR</span>
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

      {activeInterior && (
        <section className="apartment-overlay" aria-label="Apartment controls">
          <div className="apartment-title-row">
            <div>
              <span className="apartment-kicker">PRIVATE INSTANCE · 3-ROOM FLAT</span>
              <strong>{activeInterior.name}</strong>
            </div>
            <span className="apartment-mood" aria-label="Mood: content">● CONTENT</span>
          </div>
          <div className="need-strip" aria-label="Player needs">
            {[
              ['HUNGER', player.hunger, 'need-hunger'],
              ['ENERGY', player.energy, 'need-energy'],
              ['FUN', player.fun, 'need-fun'],
              ['HYGIENE', player.hygiene, 'need-hygiene'],
            ].map(([label, value, tone]) => (
              <div className="need-meter" key={label}>
                <div><span>{label}</span><b>{Math.round(Number(value))}</b></div>
                <span className={`need-meter-track ${tone}`}><i style={{ width: `${Number(value)}%` }} /></span>
              </div>
            ))}
          </div>
          <div className="apartment-actions" role="group" aria-label="Apartment actions">
            <button type="button" className={micOn ? 'is-active' : ''} onClick={() => setMicOn((value) => !value)} aria-pressed={micOn}>
              <span>MIC</span><small>{micOn ? 'ON' : 'OFF'}</small>
            </button>
            <button type="button" className={radioOn ? 'is-active' : ''} onClick={() => setRadioOn((value) => !value)} aria-pressed={radioOn}>
              <Radio aria-hidden="true" /><span>RADIO</span><small>{radioOn ? 'PLAYING' : 'OFF'}</small>
            </button>
            <button type="button" onClick={onInteract} disabled={!nearInteriorAction}>
              <Sparkles aria-hidden="true" /><span>INTERACT</span><small>{nearInteriorAction ? activeInterior.actionLabel : 'WALK TO ITEM'}</small>
            </button>
            <button type="button" className="go-outside-action" onClick={onInteract} disabled={!canExitInterior}>
              <ArrowRight aria-hidden="true" /><span>GO OUTSIDE</span><small>{canExitInterior ? 'CITY MAP' : 'AT FRONT DOOR'}</small>
            </button>
          </div>
        </section>
      )}

      {rideBooking && (
        <div className="ride-status-card" role="status" aria-live="polite">
          <span className="ride-status-icon"><RideIcon aria-hidden="true" /></span>
          <span className="ride-status-copy">
            <small>{RIDE_MODE_LABELS[rideBooking.mode]} · {RIDE_STATUS_LABELS[rideBooking.status]}</small>
            <strong>{rideDestination?.name ?? 'Your destination'}</strong>
          </span>
          <span className="ride-status-fare">{formatNaira(rideBooking.fare)}</span>
        </div>
      )}

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
        <button className="quick-action" type="button" onClick={onOpenSettings} aria-label={isAdmin ? 'Settings and admin tools' : 'Settings'}>
          {isAdmin ? <ShieldCheck aria-hidden="true" /> : <SlidersHorizontal aria-hidden="true" />}
          <span>{isAdmin ? 'Admin' : 'Settings'}</span>
        </button>
      </div>

      <div className="minimap-card" aria-label="Mini map">
        <div className="minimap-heading">
          <span><Compass aria-hidden="true" /> EKO DISTRICT</span>
          <span className="minimap-scale">N ↑</span>
        </div>
        <div className="minimap" role="button" tabIndex={0} onClick={() => onOpenPanel('map')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenPanel('map') } }} aria-label="Open detailed city map">
          <span className="minimap-water" aria-hidden="true" />
          {streets.map((street) => <span className="minimap-road minimap-road-horizontal" key={`h-${street}`} style={{ top: `${worldToMapPercent({ x: 0, z: street }).y}%` }} />)}
          {streets.map((street) => <span className="minimap-road minimap-road-vertical" key={`v-${street}`} style={{ left: `${worldToMapPercent({ x: street, z: 0 }).x}%` }} />)}
          <span className="minimap-campus" style={campusMapStyle()} aria-hidden="true" />
          <span className="minimap-flyover" aria-hidden="true" />
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

      {rideStatus && (
        <div className="ride-banner" role="status">
          <span className="status-live-dot" />
          <strong>{rideStatus}</strong>
          {canCancelRide && <button type="button" onClick={onCancelRide}>CANCEL</button>}
        </div>
      )}
      <nav className="immersive-game-nav" aria-label="Main game navigation">
        <button type="button" onClick={() => onOpenPanel('life')} aria-label="Home and city life">
          <Home aria-hidden="true" /><span>HOME</span>
        </button>
        <button type="button" onClick={() => onOpenPanel('inventory')} aria-label="Buy and inventory">
          <ShoppingBag aria-hidden="true" /><span>BUY</span>
        </button>
        <button type="button" onClick={() => onOpenPanel('map')} aria-label="Open city map" aria-pressed={activePanel === 'map'}>
          <Map aria-hidden="true" /><span>MAP</span>
        </button>
        <button type="button" onClick={() => onOpenPanel('phone')} aria-label="Open smartphone">
          <Smartphone aria-hidden="true" /><span>PHONE</span>
        </button>
      </nav>

      <div className="interaction-wrap">
        <button
          className="interaction-button"
          type="button"
          onClick={onInteract}
          disabled={!interactionEnabled}
        >
          <span className="interaction-key">E</span>
          <span className="interaction-copy">
            <small>{interactionEyebrow}</small>
            <strong>{interactionLabel}</strong>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      </div>

      <div className="keyboard-hints" aria-label="Keyboard controls">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span>
        <span><kbd>E</kbd> INTERACT</span>
        <span><kbd>M</kbd> MAP</span>
        <span><kbd>J</kbd> WORK</span>
        <span><kbd>P</kbd> CITY LIFE</span>
      </div>

      <div
        className="movement-joystick"
        role="group"
        aria-label="Circular movement joystick"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (event.pointerType !== 'mouse') event.currentTarget.setPointerCapture(event.pointerId)
          updateJoystick(event, onMoveKey)
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType === 'mouse') return
          if (event.currentTarget.hasPointerCapture(event.pointerId) || event.pointerType === 'mouse') {
            event.preventDefault()
            event.stopPropagation()
            updateJoystick(event, onMoveKey)
          }
        }}
        onPointerUp={(event) => {
          event.preventDefault()
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
          clearJoystick(onMoveKey)
        }}
        onPointerCancel={() => clearJoystick(onMoveKey)}
        onLostPointerCapture={() => clearJoystick(onMoveKey)}
      >
        <span className="movement-joystick-ring" aria-hidden="true" />
        <span className="movement-joystick-knob" ref={knobRef} aria-hidden="true" />
      </div>
      <button className="run-button" type="button" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onMoveKey('shift', true) }} onPointerUp={() => onMoveKey('shift', false)} onPointerCancel={() => onMoveKey('shift', false)} onLostPointerCapture={() => onMoveKey('shift', false)} aria-label="Run while moving">RUN</button>

      <div className="vitals-card" aria-label="Player condition">
        <div className="vital-row"><Zap aria-hidden="true" /><span>ENERGY</span><div><i style={{ width: `${player.energy}%` }} /></div><b>{Math.round(player.energy)}%</b></div>
        <div className="vital-row"><Activity aria-hidden="true" /><span>HUNGER</span><div><i style={{ width: `${player.hunger}%` }} /></div><b>{Math.round(player.hunger)}%</b></div>
        <div className="vital-row"><Smile aria-hidden="true" /><span>FUN</span><div><i style={{ width: `${player.fun}%` }} /></div><b>{Math.round(player.fun)}%</b></div>
        <div className="vital-row"><Sparkles aria-hidden="true" /><span>HYGIENE</span><div><i style={{ width: `${player.hygiene}%` }} /></div><b>{Math.round(player.hygiene)}%</b></div>
        <div className="vital-row"><Droplets aria-hidden="true" /><span>BLADDER</span><div><i style={{ width: `${player.bladder}%` }} /></div><b>{Math.round(player.bladder)}%</b></div>
      </div>

      {toast && <div className="game-toast" role="status" aria-live="polite" key={toast.id}><Check aria-hidden="true" />{toast.text}</div>}
    </div>
  )
}

function updateJoystick(event: PointerEvent<HTMLDivElement>, onMoveKey: (key: string, pressed: boolean) => void) {
  const rect = event.currentTarget.getBoundingClientRect()
  const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
  const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
  const threshold = 0.2
  onMoveKey('a', dx < -threshold); onMoveKey('d', dx > threshold)
  onMoveKey('w', dy < -threshold); onMoveKey('s', dy > threshold)
}
function clearJoystick(onMoveKey: (key: string, pressed: boolean) => void) {
  for (const key of ['w', 'a', 's', 'd']) onMoveKey(key, false)
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
  panel: Exclude<GamePanel, 'none' | 'admin'>
  player: PlayerState
  waypoint: LocationId | null
  playerPosition: { x: number; z: number }
  onClose: () => void
  onChangePanel: (panel: Exclude<GamePanel, 'none' | 'admin'>) => void
  onAcceptDelivery: () => void
  onBuyFood: () => void
  onEatFood: () => void
  onSetWaypoint: (locationId: LocationId) => void
  onTravel: (locationId: LocationId, mode: TravelMode) => void
  onApplyJob: (jobId: JobId) => void
  onCompleteShift: (jobId: JobId) => void
  onJoinFaction: (factionId: FactionId | null) => void
  onLeaseHome: (homeId: HomeId) => void
  onRegisterVoter: () => void
  onResolveCourt: () => void
  user: GameUser | null
  sessionLoading: boolean
  players: OnlinePlayer[]
  presenceError: boolean
  saveStatus: SaveStatus
  onAuthenticated: () => Promise<void>
  onSignOut: () => Promise<void>
}

const PANEL_META: Record<Exclude<GamePanel, 'none' | 'admin'>, { title: string; eyebrow: string; icon: LucideIcon }> = {
  map: { title: 'City map', eyebrow: 'LAGOS / WAYFINDING', icon: Map },
  jobs: { title: 'Work board', eyebrow: 'CAREERS / AVAILABLE SHIFTS', icon: BriefcaseBusiness },
  life: { title: 'City life', eyebrow: 'CITIZEN / COMMUNITY / HOME', icon: Landmark },
  inventory: { title: 'Your bag', eyebrow: 'PLAYER / LOADOUT', icon: Package },
  online: { title: 'Shared world', eyebrow: 'LIVE ROOM / EKO MAINLAND', icon: UsersRound },
  phone: { title: 'VibeOS', eyebrow: 'PERSONAL SMARTPHONE', icon: Smartphone },
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
  onTravel,
  onApplyJob,
  onCompleteShift,
  onJoinFaction,
  onLeaseHome,
  onRegisterVoter,
  onResolveCourt,
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
              onClick={() => onChangePanel(id as Exclude<GamePanel, 'none' | 'admin'>)}
            >
              <TabIcon aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        <div className="panel-scroll">
          {panel === 'map' && <MapPanel waypoint={waypoint} playerPosition={playerPosition} playerCash={player.cash} ownsScooter={player.ownsScooter} onSetWaypoint={onSetWaypoint} onTravel={onTravel} />}
          {panel === 'jobs' && <JobsPanel player={player} playerPosition={playerPosition} onAcceptDelivery={onAcceptDelivery} onSetWaypoint={onSetWaypoint} onApplyJob={onApplyJob} onCompleteShift={onCompleteShift} />}
          {panel === 'life' && <LifePanel player={player} onJoinFaction={onJoinFaction} onLeaseHome={onLeaseHome} onSetWaypoint={onSetWaypoint} onRegisterVoter={onRegisterVoter} onResolveCourt={onResolveCourt} />}
          {panel === 'inventory' && <InventoryPanel player={player} onBuyFood={onBuyFood} onEatFood={onEatFood} />}
          {panel === 'phone' && <PhoneHome player={player} onOpenApp={onChangePanel} />}
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


function PhoneHome({
  player,
  onOpenApp,
}: {
  player: PlayerState
  onOpenApp: (panel: Exclude<GamePanel, 'none' | 'admin'>) => void
}) {
  const apps = [
    { label: 'LIFE', detail: 'Needs, home & civic', icon: UserRound, panel: 'life' as const, tone: 'gold' },
    { label: 'WORK', detail: 'Jobs and shifts', icon: BriefcaseBusiness, panel: 'jobs' as const, tone: 'blue' },
    { label: 'HOUSES', detail: 'Rent across Lagos', icon: Home, panel: 'life' as const, tone: 'green' },
    { label: 'CHOWDECK', detail: 'Food for your needs', icon: Utensils, panel: 'inventory' as const, tone: 'amber' },
    { label: 'BANK', detail: 'Wallet and net worth', icon: Wallet, panel: 'life' as const, tone: 'gold' },
    { label: 'TRANSPORT', detail: 'Danfo, okada & rides', icon: BusFront, panel: 'map' as const, tone: 'blue' },
    { label: 'CITY MAP', detail: 'Districts and routes', icon: Map, panel: 'map' as const, tone: 'green' },
    { label: 'CIVIC', detail: 'Polling and records', icon: Landmark, panel: 'life' as const, tone: 'violet' },
    { label: 'BAG', detail: 'Items and purchases', icon: Package, panel: 'inventory' as const, tone: 'amber' },
    { label: 'SOCIAL', detail: 'Players and account', icon: UsersRound, panel: 'online' as const, tone: 'violet' },
  ]
  return (
    <div className="phone-home">
      <div className="phone-status"><span>VIBEOS</span><span>● LAGOS LIFE NETWORK · ONLINE</span></div>
      <div className="phone-greeting">
        <span>WELCOME BACK</span>
        <strong>{player.name}</strong>
        <small>Level {player.level} · {formatNaira(player.cash)} cash</small>
      </div>
      <div className="phone-app-grid">
        {apps.map(({ label, detail, icon: AppIcon, panel: targetPanel, tone }) => (
          <button className={`phone-app phone-app-${tone}`} type="button" key={label} onClick={() => onOpenApp(targetPanel)}>
            <span className="phone-app-icon"><AppIcon aria-hidden="true" /></span>
            <strong>{label}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </div>
      <div className="phone-home-footer"><span>LIVE THE CITY</span><span>YOUR LIFE. YOUR LAGOS.</span></div>
    </div>
  )
}

function MapPanel({
  waypoint,
  playerPosition,
  playerCash,
  ownsScooter,
  onSetWaypoint,
  onTravel,
}: Pick<GamePanelsProps, 'waypoint' | 'playerPosition' | 'onSetWaypoint' | 'onTravel'> & { playerCash: number; ownsScooter: boolean }) {
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(waypoint)
  const [mapView, setMapView] = useState({ x: 0, y: 0, zoom: 1 })
  const mapDrag = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null)
  useEffect(() => { if (waypoint) setSelectedLocationId(waypoint) }, [waypoint])
  const beginMapPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    mapDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: mapView.x, startY: mapView.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }
  const moveMapPan = (event: PointerEvent<HTMLDivElement>) => {
    const drag = mapDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setMapView(view => ({ ...view, x: Math.max(-220, Math.min(220, drag.startX + event.clientX - drag.x)), y: Math.max(-180, Math.min(180, drag.startY + event.clientY - drag.y)) }))
    event.preventDefault()
    event.stopPropagation()
  }
  const endMapPan = (event: PointerEvent<HTMLDivElement>) => {
    if (mapDrag.current?.pointerId !== event.pointerId) return
    mapDrag.current = null
    event.stopPropagation()
  }
  const selectedLocation = WORLD_LOCATIONS.find((location) => location.id === selectedLocationId) ?? null
  const target = WORLD_LOCATIONS.find((location) => location.id === waypoint)
  const playerPoint = mapCoordinates(playerPosition)
  const targetPoint = target ? mapCoordinates(target) : null
  const travelDistance = selectedLocation ? distanceBetween(playerPosition, selectedLocation) : 0
  const streets = GRID_LINES

  return (
    <div className="map-panel-content">
      <div className="map-world-summary"><span>METROPOLITAN DISTRICT</span><strong>{WORLD_LOCATIONS.length} places · island, mainland & beyond</strong></div>
      <div className="full-map" aria-label="Lagos metropolitan district map" onPointerDown={beginMapPan} onPointerMove={moveMapPan} onPointerUp={endMapPan} onPointerCancel={endMapPan} onWheel={(event) => { event.stopPropagation(); setMapView(view => ({ ...view, zoom: Math.max(0.85, Math.min(1.8, view.zoom + (event.deltaY < 0 ? 0.08 : -0.08))) })) }}>
        <div className="full-map-layer" style={{ transform: `translate(${mapView.x}px, ${mapView.y}px) scale(${mapView.zoom})` }}>
        <span className="full-map-water" aria-hidden="true" />
        {streets.map((street) => (
          <span className="full-map-road full-map-road-horizontal" key={`h-${street}`} style={{ top: `${worldToMapPercent({ x: 0, z: street }).y}%` }} />
        ))}
        {streets.map((street) => (
          <span className="full-map-road full-map-road-vertical" key={`v-${street}`} style={{ left: `${worldToMapPercent({ x: street, z: 0 }).x}%` }} />
        ))}
        <span className="full-map-campus" style={campusMapStyle()} aria-hidden="true"><em>UNIVERSITY OF LAGOS</em></span>
        <span className="full-map-flyover" aria-hidden="true" />
        {CITY_BUILDINGS.map((building) => (
          <span key={building.id} className="full-map-building" style={{ ...mapPoint(building), width: `${Math.max(0.8, building.width * 0.26)}%`, height: `${Math.max(0.7, building.depth * 0.26)}%` }} title={building.name}><span>{building.name}</span></span>
        ))}
        {targetPoint && (
          <svg className="full-map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1={playerPoint.x} y1={playerPoint.y} x2={targetPoint.x} y2={targetPoint.y} />
          </svg>
        )}
        {WORLD_LOCATIONS.map((location) => (
          <button
            key={location.id}
            className={`map-pin${waypoint === location.id ? ' is-target' : ''}`}
            type="button"
            style={mapPoint(location)}
            onClick={() => { setSelectedLocationId(location.id); onSetWaypoint(location.id) }}
            aria-label={`Select ${location.name} in ${location.district}`}
            title={location.name}
          >
            <MapPin aria-hidden="true" />
          </button>
        ))}
        <span className="map-player" style={mapPoint(playerPosition)} aria-label="Your position" />
        <div className="map-north">N ↑</div>
        <div className="map-label map-label-market">LAGOS ISLAND</div>
        <div className="map-label map-label-ikeja">IKEJA</div>
        <div className="map-label map-label-mainland">MAINLAND</div>
        <div className="map-label map-label-lagoon">LAGOS LAGOON</div>
        </div>
      </div>
      <div className="map-section-heading">
        <div><span>YOUR CITY</span><small>Tap a place to set a route · {target ? `Heading to ${target.name}` : 'Free roam'}</small></div>
        <Compass aria-hidden="true" />
      </div>
      {selectedLocation && (
        <section className="travel-options" aria-label={`Travel options to ${selectedLocation.name}`}>
          <div className="travel-options-heading"><span>GETTING THERE</span><strong>{selectedLocation.name}</strong><small>{Math.round(distanceBetween(playerPosition, selectedLocation))}m away · Wallet {formatNaira(playerCash)}</small></div>
          <div className="travel-options-grid">
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'cab')}><span className="travel-option-icon"><CarFront aria-hidden="true" /></span><strong>Book a cab</strong><small>{formatNaira(estimateRideFare(travelDistance, 'cab'))} · on-demand</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'bike')}><span className="travel-option-icon"><Bike aria-hidden="true" /></span><strong>Book an okada</strong><small>{formatNaira(estimateRideFare(travelDistance, 'bike'))} · faster</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'danfo')}><span className="travel-option-icon"><BusFront aria-hidden="true" /></span><strong>Book a danfo</strong><small>{formatNaira(estimateRideFare(travelDistance, 'danfo'))} · shared route</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'driver')}><span className="travel-option-icon"><CarFront aria-hidden="true" /></span><strong>Private driver</strong><small>{formatNaira(estimateRideFare(travelDistance, 'driver'))} · chauffeured</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'drive')}><span className="travel-option-icon"><KeyRound aria-hidden="true" /></span><strong>Drive myself</strong><small>{ownsScooter ? 'Scooter ready · no booking fee' : 'Rent a scooter at the garage'}</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'walk')}><span className="travel-option-icon"><Footprints aria-hidden="true" /></span><strong>Walk there</strong><small>Follow the marked route</small></button>
          </div>
        </section>
      )}
      <div className="location-list">
        {WORLD_LOCATIONS.map((location) => (
          <button className={`location-row${selectedLocationId === location.id ? ' is-selected' : ''}`} type="button" key={location.id} onClick={() => { setSelectedLocationId(location.id); onSetWaypoint(location.id) }}>
            <span className={`location-marker location-marker-${location.kind}`}><MapPin aria-hidden="true" /></span>
            <span className="location-row-copy"><strong>{location.name}</strong><small>{location.district} · {location.description}</small></span>
            <span className="location-distance">{Math.round(distanceBetween(playerPosition, location))}m</span>
          </button>
        ))}
      </div>
      <p className="panel-footnote">Gold marks your route. Roads, bridges, and the lagoon connect the island, mainland, port, and outer neighborhoods.</p>
    </div>
  )
}

function JobsPanel({
  player,
  playerPosition,
  onAcceptDelivery,
  onSetWaypoint,
  onApplyJob,
  onCompleteShift,
}: Pick<GamePanelsProps, 'player' | 'playerPosition' | 'onAcceptDelivery' | 'onSetWaypoint' | 'onApplyJob' | 'onCompleteShift'>) {
  const isDeliveryActive = player.stage === 'delivery'
  const canStart = player.stage === 'find-tunde' || player.stage === 'free-roam'

  return (
    <div className="jobs-panel-content">
      <div className="shift-summary">
        <div className="shift-summary-icon"><BriefcaseBusiness aria-hidden="true" /></div>
        <div><span>CAREER RECORD</span><strong>{player.completedShifts} completed {player.completedShifts === 1 ? 'shift' : 'shifts'}</strong></div>
        <span className="rep-pill">{player.reputation} REP</span>
      </div>
      <article className="job-card job-card-featured">
        <div className="job-card-meta"><span className="job-category">STORY RUN / COURIER</span><span className="job-duration">FIRST JOB</span></div>
        <h3>Last-mile delivery</h3>
        <p>Carry a sealed parcel from Balogun Night Market to Ada at Afterglow. Meet the locals and learn the roads as you go.</p>
        <div className="job-reward-row"><span><Wallet aria-hidden="true" /> ₦480</span><span><Sparkles aria-hidden="true" /> +25 rep</span><span><MapPin aria-hidden="true" /> 2 districts</span></div>
        <button className="primary-action" type="button" onClick={isDeliveryActive ? () => onSetWaypoint('club') : onAcceptDelivery} disabled={!canStart && !isDeliveryActive}>
          {isDeliveryActive ? 'ROUTE TO AFTERGLOW' : canStart ? 'ACCEPT COURIER RUN' : 'MEET BISI FIRST'}
          <ArrowRight aria-hidden="true" />
        </button>
        {isDeliveryActive && <small className="job-active-note"><span className="status-live-dot" /> IN PROGRESS · PACKAGE IN YOUR BAG</small>}
      </article>

      <div className="job-board-heading"><div><span>LOCAL EMPLOYERS</span><small>Start shifts inside, complete the task checklist, then clock out.</small></div><BriefcaseBusiness aria-hidden="true" /></div>
      <div className="job-board-list">
        {CITY_JOBS.map((job) => {
          const workplace = WORLD_LOCATIONS.find((location) => location.id === job.locationId)
          const isAssigned = player.job === job.id
          const atWork = player.currentInteriorId === job.locationId || Boolean(workplace && distanceBetween(playerPosition, workplace) <= 8)
          const completedTaskCount = job.tasks.filter((_, index) => player.completedShiftTasks.includes(index)).length
          const cannotSwitchJob = player.shiftStarted && !isAssigned
          const actionLabel = cannotSwitchJob
            ? 'FINISH CURRENT SHIFT'
            : !isAssigned
              ? player.job ? 'SWITCH TO THIS JOB' : 'TAKE THIS SHIFT'
              : !atWork
                ? 'ROUTE TO WORKPLACE'
                : !player.shiftStarted
                  ? 'ENTER TO START SHIFT'
                  : completedTaskCount < job.tasks.length
                    ? `WORK TASKS · ${completedTaskCount}/${job.tasks.length}`
                    : 'CLOCK OUT · CLAIM PAY'
          const activeRoleStatus = !atWork
            ? 'ROUTE MARKED'
            : !player.shiftStarted
              ? 'ENTER TO START SHIFT'
              : `${completedTaskCount}/${job.tasks.length} TASKS DONE`
          return (
            <article className={`job-card job-card-local${isAssigned ? ' is-assigned' : ''}`} key={job.id}>
              <div className="job-card-meta"><span className="job-category">{job.category}</span><span className="job-duration">{workplace?.district}</span></div>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
              <div className="job-employer-row"><Building2 aria-hidden="true" /><span>{job.employer}</span></div>
              <div className="job-reward-row"><span><Wallet aria-hidden="true" /> {formatNaira(job.pay)}</span><span><Sparkles aria-hidden="true" /> +{job.reputation} rep</span></div>
              <button
                className={isAssigned ? 'secondary-action' : 'primary-action'}
                type="button"
                disabled={cannotSwitchJob}
                onClick={() => isAssigned ? (atWork ? onCompleteShift(job.id) : onSetWaypoint(job.locationId)) : onApplyJob(job.id)}
              >
                {actionLabel}
                <ArrowRight aria-hidden="true" />
              </button>
              {isAssigned && <small className="job-active-note"><span className="status-live-dot" /> ACTIVE ROLE · {activeRoleStatus}</small>}
            </article>
          )
        })}
      </div>

      <article className="job-card job-card-secondary">
        <div className="job-card-meta"><span className="job-category">TRANSPORT / RENTAL</span><span className="job-duration">CITY ACCESS</span></div>
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
          <div className="npc-portrait" aria-hidden="true" style={{ '--npc-color': character.color, '--npc-skin': character.skinTone, '--npc-hair': character.hairColor, '--npc-accent': character.accentColor } as CSSProperties}>
            <span className="npc-portrait-shoulders" />
            <span className="npc-portrait-head"><i /></span>
            <span className="npc-portrait-hair" />
          </div>
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
    case 'chika':
      return 'Ask about community patrols'
    case 'amina':
      return 'Ask about clinic work'
    case 'wale':
      return 'Ask about stadium shifts'
    case 'tobi':
      return 'Ask about campus life'
    case 'iyabo':
      return 'Ask about the harvest'
    case 'emeka':
      return 'Ask about dock work'
    case 'kemi':
      return 'Ask about local government'
  }
}

function getCharacterLine(id: CharacterId, player: PlayerState) {
  if (id === 'bisi' && player.stage !== 'meet-bisi') return 'You are finding your feet. Tunde has a delivery if you want to make a little money.'
  if (id === 'tunde' && player.stage === 'delivery') return 'The parcel is in your bag. Ada is waiting at Afterglow — follow the gold beacon.'
  if (id === 'ada' && player.stage === 'delivery') return 'You made it. Hand it over and I will make sure the night remembers you.'
  if (id === 'kunle' && player.ownsScooter) return 'Your scooter is ready. Take it for a spin, then bring it back in one piece.'
  return CITY_CHARACTERS.find((character) => character.id === id)?.intro ?? ''
}
