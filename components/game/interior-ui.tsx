import { ArrowRight, BriefcaseBusiness, Building2, Check, Landmark, Sparkles, Utensils, Wallet, X } from 'lucide-react'
import {
  CITY_HOMES,
  CITY_JOBS,
  formatNaira,
  type InteriorDefinition,
  type JobId,
  type PlayerState,
} from './game-data'

export type ServiceSheetProps = {
  interior: InteriorDefinition
  player: PlayerState
  onClose: () => void
  onDeposit: (amount: number) => void
  onWithdraw: (amount: number) => void
  onAttendLecture: () => void
  onStartShift: (jobId: JobId) => void
  onCompleteTask: (jobId: JobId, taskIndex: number) => void
  onClockOut: (jobId: JobId) => void
  onRest: () => void
  onBuyFood: () => void
  /** The building-specific action: court fines, voter registration, scooter hire and so on. */
  onServiceAction: () => void
}

const KIND_LABEL: Record<string, string> = {
  market: 'Market',
  club: 'Social club',
  garage: 'Garage',
  hotel: 'Hotel',
  cafe: 'Café',
  bank: 'Bank',
  police: 'Police division',
  court: 'Courthouse',
  hospital: 'Hospital',
  university: 'University',
  school: 'School',
  stadium: 'Stadium',
  government: 'Government office',
  polling: 'Polling unit',
  bungalow: 'Bungalows',
  estate: 'Residential estate',
  village: 'Village hall',
  farm: 'Farm cooperative',
  airport: 'Airport',
  port: 'Port',
  clubhouse: 'Clubhouse',
  'event-center': 'Events centre',
  apartment: 'Apartments',
  shop: 'Shop',
  office: 'Offices',
  house: 'Home',
}

const BANK_AMOUNTS = [100, 500, 1000] as const

export function ServiceSheet({
  interior,
  player,
  onClose,
  onDeposit,
  onWithdraw,
  onAttendLecture,
  onStartShift,
  onCompleteTask,
  onClockOut,
  onRest,
  onBuyFood,
  onServiceAction,
}: ServiceSheetProps) {
  const kind = interior.kind
  const job = player.job ? CITY_JOBS.find((entry) => entry.id === player.job) ?? null : null
  const atWorkplace = job !== null && job.locationId === interior.id
  const home = player.home ? CITY_HOMES.find((entry) => entry.id === player.home) ?? null : null
  const isHome = home !== null && home.locationId === interior.id
  const canRest = kind === 'hotel' || kind === 'hospital' || isHome
  const sellsFood = kind === 'market' || kind === 'cafe' || kind === 'shop'
  const teaches = kind === 'university' || kind === 'school'
  const allTasksDone = job !== null && player.completedShiftTasks.length >= job.tasks.length

  return (
    <div className="service-backdrop" onClick={onClose}>
      <section
        className="service-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={interior.name}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="service-head">
          <div className="service-head-icon"><Building2 aria-hidden="true" /></div>
          <div className="service-head-copy">
            <span>{KIND_LABEL[kind] ?? 'Building'} · {interior.district}</span>
            <h2>{interior.name}</h2>
          </div>
          <button className="service-close" type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        </header>

        <div className="service-body">
          {kind === 'bank' && (
            <div className="service-card">
              <div className="service-balances">
                <div><small>IN YOUR POCKET</small><strong>{formatNaira(player.cash)}</strong></div>
                <div><small>IN YOUR ACCOUNT</small><strong>{formatNaira(player.bankBalance)}</strong></div>
              </div>
              <div className="service-chip-row" aria-label="Deposit">
                <span>Deposit</span>
                {BANK_AMOUNTS.map((amount) => (
                  <button key={`dep-${amount}`} type="button" disabled={player.cash < amount} onClick={() => onDeposit(amount)}>{formatNaira(amount)}</button>
                ))}
                <button type="button" disabled={player.cash < 1} onClick={() => onDeposit(player.cash)}>All</button>
              </div>
              <div className="service-chip-row" aria-label="Withdraw">
                <span>Withdraw</span>
                {BANK_AMOUNTS.map((amount) => (
                  <button key={`wd-${amount}`} type="button" disabled={player.bankBalance < amount} onClick={() => onWithdraw(amount)}>{formatNaira(amount)}</button>
                ))}
                <button type="button" disabled={player.bankBalance < 1} onClick={() => onWithdraw(player.bankBalance)}>All</button>
              </div>
            </div>
          )}

          {atWorkplace && job && (
            <div className="service-card">
              <div className="service-card-title"><BriefcaseBusiness aria-hidden="true" /> {job.title}</div>
              {!player.shiftStarted ? (
                <>
                  <p>{job.description}</p>
                  <button className="primary-action" type="button" onClick={() => onStartShift(job.id)}>START SHIFT <ArrowRight aria-hidden="true" /></button>
                </>
              ) : (
                <>
                  <ul className="service-tasks">
                    {job.tasks.map((task, index) => {
                      const done = player.completedShiftTasks.includes(index)
                      return (
                        <li key={task} className={done ? 'is-done' : undefined}>
                          <span>{done ? <Check aria-hidden="true" /> : index + 1}</span>
                          <em>{task}</em>
                          {!done && <button type="button" onClick={() => onCompleteTask(job.id, index)}>DO IT</button>}
                        </li>
                      )
                    })}
                  </ul>
                  <button className="primary-action" type="button" disabled={!allTasksDone} onClick={() => onClockOut(job.id)}>
                    {allTasksDone ? `CLOCK OUT · ${formatNaira(job.pay)} + ${job.reputation} REP` : 'FINISH ALL TASKS TO CLOCK OUT'}
                  </button>
                </>
              )}
            </div>
          )}

          {teaches && (
            <div className="service-card">
              <div className="service-card-title"><Sparkles aria-hidden="true" /> Lecture hall</div>
              <p>Sit in on a session. Costs 12 energy and 5 hunger; earns 8 reputation and a study credit. You have {player.educationCredits} credit{player.educationCredits === 1 ? '' : 's'}.</p>
              <button className="primary-action" type="button" disabled={player.energy < 12 || player.hunger < 5} onClick={onAttendLecture}>
                {player.energy < 12 || player.hunger < 5 ? 'TOO TIRED OR HUNGRY' : 'ATTEND A LECTURE'} <ArrowRight aria-hidden="true" />
              </button>
            </div>
          )}

          {canRest && (
            <div className="service-card">
              <div className="service-card-title"><Landmark aria-hidden="true" /> {kind === 'hospital' ? 'Treatment' : isHome ? 'Your home' : 'Rooms'}</div>
              <p>{kind === 'hospital' ? 'The night team will get you back on your feet.' : 'Take a few hours to rest and recover.'}</p>
              <button className="secondary-action" type="button" onClick={onRest}>{kind === 'hospital' ? 'GET TREATED' : 'REST HERE'} <ArrowRight aria-hidden="true" /></button>
            </div>
          )}

          {sellsFood && (
            <div className="service-card">
              <div className="service-card-title"><Utensils aria-hidden="true" /> Food counter</div>
              <p>A hot suya wrap restores energy and hunger.</p>
              <button className="secondary-action" type="button" disabled={player.cash < 90} onClick={onBuyFood}>
                BUY SUYA · {formatNaira(90)} <Wallet aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="service-card">
            <div className="service-card-title"><Building2 aria-hidden="true" /> {interior.actionLabel}</div>
            <button className="secondary-action" type="button" onClick={onServiceAction}>{interior.actionLabel.toUpperCase()} <ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
