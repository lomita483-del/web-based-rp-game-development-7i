'use client'

import { useState, type CSSProperties, type PointerEvent } from 'react'
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
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
  CITY_JOBS,
  WORLD_LOCATIONS,
  distanceBetween,
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
} from './game-data'
import { LifePanel } from './life-panel'
import { OnlinePanel } from './online-panel'
import type { GameUser, OnlinePlayer, SaveStatus } from '@/lib/game/types'

export type TravelMode = 'cab' | 'bike' | 'danfo' | 'driver' | 'drive' | 'walk'

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
  { id: 'life', label: 'City life', icon: Landmark, shortcut: 'P' },
  { id: 'inventory', label: 'Bag', icon: Package, shortcut: 'I' },
  { id: 'online', label: 'Online', icon: UsersRound, shortcut: 'O' },
]

function mapCoordinates(position: { x: number; z: number }) {
  return { x: 50 + position.x * 0.45, y: 50 + position.z * 0.45 }
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
  waypoint,
  activePanel,
  toast,
  onOpenPanel,
  onInteract,
  onMoveKey,
}: HudProps) {
  const mission = getMissionDetails(player.stage)
  const currentDistrict = nearbyLocation?.district ?? 'Lagos Mainland'
  const streets = [-66, -42, -18, 18, 42, 66]
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
          <span className="minimap-water" aria-hidden="true" />
          {streets.map((street) => <span className="minimap-road minimap-road-horizontal" key={`h-${street}`} style={{ top: `${50 + street * 0.45}%` }} />)}
          {streets.map((street) => <span className="minimap-road minimap-road-vertical" key={`v-${street}`} style={{ left: `${50 + street * 0.45}%` }} />)}
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
        <span><kbd>M</kbd> MAP</span>
        <span><kbd>J</kbd> WORK</span>
        <span><kbd>P</kbd> CITY LIFE</span>
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

const PANEL_META: Record<Exclude<GamePanel, 'none'>, { title: string; eyebrow: string; icon: LucideIcon }> = {
  map: { title: 'City map', eyebrow: 'LAGOS / WAYFINDING', icon: Map },
  jobs: { title: 'Work board', eyebrow: 'CAREERS / AVAILABLE SHIFTS', icon: BriefcaseBusiness },
  life: { title: 'City life', eyebrow: 'CITIZEN / COMMUNITY / HOME', icon: Landmark },
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
              onClick={() => onChangePanel(id)}
            >
              <TabIcon aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        <div className="panel-scroll">
          {panel === 'map' && <MapPanel waypoint={waypoint} playerPosition={playerPosition} onSetWaypoint={onSetWaypoint} onTravel={onTravel} />}
          {panel === 'jobs' && <JobsPanel player={player} playerPosition={playerPosition} onAcceptDelivery={onAcceptDelivery} onSetWaypoint={onSetWaypoint} onApplyJob={onApplyJob} onCompleteShift={onCompleteShift} />}
          {panel === 'life' && <LifePanel player={player} onJoinFaction={onJoinFaction} onLeaseHome={onLeaseHome} onSetWaypoint={onSetWaypoint} onRegisterVoter={onRegisterVoter} onResolveCourt={onResolveCourt} />}
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
  onTravel,
}: Pick<GamePanelsProps, 'waypoint' | 'playerPosition' | 'onSetWaypoint' | 'onTravel'>) {
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(waypoint)
  const selectedLocation = WORLD_LOCATIONS.find((location) => location.id === selectedLocationId) ?? null
  const target = WORLD_LOCATIONS.find((location) => location.id === waypoint)
  const playerPoint = mapCoordinates(playerPosition)
  const targetPoint = target ? mapCoordinates(target) : null
  const streets = [-66, -42, -18, 18, 42, 66]

  return (
    <div className="map-panel-content">
      <div className="map-world-summary"><span>METROPOLITAN DISTRICT</span><strong>{WORLD_LOCATIONS.length} places · island, mainland & beyond</strong></div>
      <div className="full-map" aria-label="Lagos metropolitan district map">
        <span className="full-map-water" aria-hidden="true" />
        {streets.map((street) => (
          <span className="full-map-road full-map-road-horizontal" key={`h-${street}`} style={{ top: `${50 + street * 0.45}%` }} />
        ))}
        {streets.map((street) => (
          <span className="full-map-road full-map-road-vertical" key={`v-${street}`} style={{ left: `${50 + street * 0.45}%` }} />
        ))}
        <span className="full-map-flyover" aria-hidden="true" />
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
      <div className="map-section-heading">
        <div><span>YOUR CITY</span><small>Tap a place to set a route · {target ? `Heading to ${target.name}` : 'Free roam'}</small></div>
        <Compass aria-hidden="true" />
      </div>
      <div className="location-list">
        {WORLD_LOCATIONS.map((location) => (
          <button className={`location-row${selectedLocationId === location.id ? ' is-selected' : ''}`} type="button" key={location.id} onClick={() => { setSelectedLocationId(location.id); onSetWaypoint(location.id) }}>
            <span className={`location-marker location-marker-${location.kind}`}><MapPin aria-hidden="true" /></span>
            <span className="location-row-copy"><strong>{location.name}</strong><small>{location.district} · {location.description}</small></span>
            <span className="location-distance">{Math.round(distanceBetween(playerPosition, location))}m</span>
          </button>
        ))}
      </div>
      {selectedLocation && (
        <section className="travel-options" aria-label={`Travel options to ${selectedLocation.name}`}>
          <div className="travel-options-heading"><span>GETTING THERE</span><strong>{selectedLocation.name}</strong><small>{Math.round(distanceBetween(playerPosition, selectedLocation))}m away · Choose your journey</small></div>
          <div className="travel-options-grid">
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'cab')}><span>🚕</span><strong>Book a cab</strong><small>₦2,500 · on-demand</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'bike')}><span>🏍️</span><strong>Book a bike</strong><small>₦1,200 · faster</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'danfo')}><span>🚌</span><strong>Next danfo</strong><small>Wait for route bus</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'driver')}><span>🚘</span><strong>Private driver</strong><small>₦5,000 · chauffeured</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'drive')}><span>🔑</span><strong>Drive myself</strong><small>Use your vehicle</small></button>
            <button type="button" onClick={() => onTravel(selectedLocation.id, 'walk')}><span>🚶</span><strong>Walk there</strong><small>Automatic walking</small></button>
          </div>
        </section>
      )}
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

      <div className="job-board-heading"><div><span>LOCAL EMPLOYERS</span><small>Apply, travel to work, then clock out for pay.</small></div><BriefcaseBusiness aria-hidden="true" /></div>
      <div className="job-board-list">
        {CITY_JOBS.map((job) => {
          const workplace = WORLD_LOCATIONS.find((location) => location.id === job.locationId)
          const isAssigned = player.job === job.id
          const atWork = Boolean(workplace && distanceBetween(playerPosition, workplace) <= 8)
          return (
            <article className={`job-card job-card-local${isAssigned ? ' is-assigned' : ''}`} key={job.id}>
              <div className="job-card-meta"><span className="job-category">{job.category}</span><span className="job-duration">{workplace?.district}</span></div>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
              <div className="job-employer-row"><Building2 aria-hidden="true" /><span>{job.employer}</span></div>
              <div className="job-reward-row"><span><Wallet aria-hidden="true" /> {formatNaira(job.pay)}</span><span><Sparkles aria-hidden="true" /> +{job.reputation} rep</span></div>
              <button className={isAssigned ? 'secondary-action' : 'primary-action'} type="button" onClick={() => isAssigned ? (atWork ? onCompleteShift(job.id) : onSetWaypoint(job.locationId)) : onApplyJob(job.id)}>
                {isAssigned ? atWork ? 'CLOCK OUT · CLAIM PAY' : 'ROUTE TO WORKPLACE' : player.job ? 'SWITCH TO THIS JOB' : 'TAKE THIS SHIFT'}
                <ArrowRight aria-hidden="true" />
              </button>
              {isAssigned && <small className="job-active-note"><span className="status-live-dot" /> ACTIVE ROLE · {atWork ? 'WORKPLACE IN RANGE' : 'ROUTE MARKED'}</small>}
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
