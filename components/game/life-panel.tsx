'use client'

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  Check,
  Compass,
  House,
  Landmark,
  ShieldCheck,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { CITY_FACTIONS, CITY_HOMES, CITY_JOBS, formatNaira, type FactionId, type HomeId, type LocationId, type PlayerState } from './game-data'

type LifePanelProps = {
  player: PlayerState
  onJoinFaction: (factionId: FactionId | null) => void
  onLeaseHome: (homeId: HomeId) => void
  onSetWaypoint: (locationId: LocationId) => void
  onRegisterVoter: () => void
  onResolveCourt: () => void
}

export function LifePanel({
  player,
  onJoinFaction,
  onLeaseHome,
  onSetWaypoint,
  onRegisterVoter,
  onResolveCourt,
}: LifePanelProps) {
  const activeJob = CITY_JOBS.find((job) => job.id === player.job)
  const currentFaction = CITY_FACTIONS.find((faction) => faction.id === player.faction)
  const currentHome = CITY_HOMES.find((home) => home.id === player.home)
  const courtFine = player.wantedLevel * 300

  return (
    <div className="life-panel-content">
      <section className="life-profile-card" aria-label="Citizen profile">
        <div className="life-profile-mark">{player.name.slice(0, 1)}</div>
        <div className="life-profile-copy">
          <span>CITIZEN PROFILE · LEVEL {player.level}</span>
          <strong>{player.name}</strong>
          <small>{currentFaction?.name ?? 'Independent resident'} · {currentHome?.name ?? 'No registered home'}</small>
        </div>
        <div className="life-reputation"><BadgeCheck aria-hidden="true" /><strong>{player.reputation}</strong><small>REP</small></div>
      </section>

      <section className="life-section" aria-labelledby="life-work-title">
        <div className="life-section-heading">
          <div className="life-section-icon"><BriefcaseBusiness aria-hidden="true" /></div>
          <div><span>WORKPLACE</span><h3 id="life-work-title">Your working life</h3></div>
        </div>
        {activeJob ? (
          <div className="life-active-row">
            <div><strong>{activeJob.title}</strong><small>{activeJob.employer} · {player.completedShifts} shifts completed</small></div>
            <span className="life-active-pill"><i /> ON ROSTER</span>
          </div>
        ) : (
          <div className="life-empty-row"><Building2 aria-hidden="true" /><span>No current job. Visit the Work board to find a shift.</span></div>
        )}
      </section>

      <section className="life-section" aria-labelledby="life-factions-title">
        <div className="life-section-heading">
          <div className="life-section-icon"><UsersRound aria-hidden="true" /></div>
          <div><span>COMMUNITY · {currentFaction ? 'MEMBER' : 'INDEPENDENT'}</span><h3 id="life-factions-title">Choose your people</h3></div>
        </div>
        <div className="life-card-grid">
          {CITY_FACTIONS.map((faction) => {
            const isMember = player.faction === faction.id
            const canJoin = player.faction === null || isMember
            return (
              <article className={`life-option-card${isMember ? ' is-selected' : ''}`} key={faction.id}>
                <div className="life-option-topline"><span>{faction.district}</span>{isMember && <Check aria-label="Current faction" />}</div>
                <h4>{faction.name}</h4>
                <p>{faction.description}</p>
                <small>{faction.members}</small>
                <div className="life-option-actions">
                  <button type="button" className={isMember ? 'life-button life-button-quiet' : 'life-button'} disabled={!canJoin} onClick={() => onJoinFaction(isMember ? null : faction.id)}>
                    {isMember ? 'Leave faction' : player.faction ? 'One faction at a time' : 'Join faction'}
                  </button>
                  <button className="life-route-button" type="button" onClick={() => onSetWaypoint(faction.locationId)} aria-label={`Route to ${faction.name}`}><ArrowRight aria-hidden="true" /></button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="life-section" aria-labelledby="life-home-title">
        <div className="life-section-heading">
          <div className="life-section-icon"><House aria-hidden="true" /></div>
          <div><span>HOUSING · {currentHome ? 'RESIDENT' : 'AVAILABLE'}</span><h3 id="life-home-title">Find a place to call home</h3></div>
        </div>
        <div className="life-home-list">
          {CITY_HOMES.map((home) => {
            const isCurrent = player.home === home.id
            const canLease = !player.home && player.cash >= home.price
            return (
              <article className={`life-home-row${isCurrent ? ' is-selected' : ''}`} key={home.id}>
                <div className="life-home-art" aria-hidden="true"><House /></div>
                <div className="life-home-copy"><span>{home.district} · {home.tenure}</span><strong>{home.name}</strong><small>{home.description}</small></div>
                <div className="life-home-action"><strong>{formatNaira(home.price)}</strong><button type="button" disabled={!canLease && !isCurrent} onClick={() => isCurrent ? onSetWaypoint(home.locationId) : onLeaseHome(home.id)}>{isCurrent ? 'MY HOME' : player.home ? 'LEASED' : canLease ? 'LEASE' : 'NEED FUNDS'}<ArrowRight aria-hidden="true" /></button></div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="life-section life-civic-section" aria-labelledby="life-civic-title">
        <div className="life-section-heading">
          <div className="life-section-icon"><Landmark aria-hidden="true" /></div>
          <div><span>CIVIC RECORD · LAGOS STATE</span><h3 id="life-civic-title">Your city, your say</h3></div>
        </div>
        <div className="civic-record-grid">
          <div className="civic-record-item"><ShieldCheck aria-hidden="true" /><span>Police record</span><strong>{player.wantedLevel > 0 ? `${player.wantedLevel} open ${player.wantedLevel === 1 ? 'case' : 'cases'}` : 'Clear'}</strong></div>
          <div className="civic-record-item"><Compass aria-hidden="true" /><span>Ward registration</span><strong>{player.voterRegistered ? 'Registered · Ward 08' : 'Not registered'}</strong></div>
        </div>
        <div className="civic-actions">
          {player.wantedLevel > 0 ? (
            <button className="life-button" type="button" disabled={player.cash < courtFine} onClick={onResolveCourt}>Settle court fine · {formatNaira(courtFine)}</button>
          ) : (
            <button className="life-button life-button-quiet" type="button" onClick={() => onSetWaypoint('court')}>View the public court docket <ArrowRight aria-hidden="true" /></button>
          )}
          <button className="life-button" type="button" disabled={player.voterRegistered} onClick={player.voterRegistered ? undefined : onRegisterVoter}>
            {player.voterRegistered ? <><Check aria-hidden="true" /> Voter registered</> : <>Register at Ward 08 <ArrowRight aria-hidden="true" /></>}
          </button>
          {!player.voterRegistered && <button className="civic-route-link" type="button" onClick={() => onSetWaypoint('polling')}>Mark polling unit on map</button>}
        </div>
      </section>

      <div className="life-footer-note"><Wallet aria-hidden="true" /><span>Lease and purchase costs come from your wallet. Sign in to keep your city profile across sessions.</span></div>
    </div>
  )
}
