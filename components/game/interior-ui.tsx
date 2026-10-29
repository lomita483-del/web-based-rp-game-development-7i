'use client'

import { useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  Sparkles,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  CITY_JOBS,
  formatNaira,
  type InteriorDefinition,
  type InteriorKind,
  type JobId,
  type PlayerState,
} from './game-data'

type ServiceSheetProps = {
  interior: InteriorDefinition
  player: PlayerState
  onClose: () => void
  onDeposit: (amount: number) => void
  onWithdraw: (amount: number) => void
  onLecture: () => void
  onStartShift: (jobId: JobId) => void
  onWorkTask: (jobId: JobId, taskIndex: number) => void
  onClockOut: (jobId: JobId) => void
  onRest: () => void
  onBuyFood: () => void
  onServiceAction: () => void
}

type ServiceSectionProps = {
  icon: LucideIcon
  eyebrow: string
  title: string
  children: ReactNode
}

const REST_KINDS: ReadonlySet<InteriorKind> = new Set([
  'hospital',
  'hotel',
  'bungalow',
  'estate',
  'village',
  'farm',
  'apartment',
  'house',
])

const FOOD_KINDS: ReadonlySet<InteriorKind> = new Set(['market', 'cafe', 'shop'])
const STUDY_KINDS: ReadonlySet<InteriorKind> = new Set(['university', 'school'])

function ServiceSection({ icon: Icon, eyebrow, title, children }: ServiceSectionProps) {
  return (
    <section className="service-sheet-section">
      <div className="service-sheet-section-header">
        <span className="service-sheet-section-icon"><Icon aria-hidden="true" /></span>
        <div className="service-sheet-section-copy">
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  )
}

function ServiceStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="service-sheet-stat">
      <span className="service-sheet-stat-icon"><Icon aria-hidden="true" /></span>
      <span className="service-sheet-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

export function ServiceSheet({
  interior,
  player,
  onClose,
  onDeposit,
  onWithdraw,
  onLecture,
  onStartShift,
  onWorkTask,
  onClockOut,
  onRest,
  onBuyFood,
  onServiceAction,
}: ServiceSheetProps) {
  const [amountText, setAmountText] = useState('')
  const isBank = interior.kind === 'bank'
  const canStudy = STUDY_KINDS.has(interior.kind)
  const canRest = REST_KINDS.has(interior.kind)
  const canBuyFood = FOOD_KINDS.has(interior.kind)
  const job = CITY_JOBS.find((entry) => entry.locationId === interior.id)
  const isAssignedToJob = Boolean(job && player.job === job.id)
  const completedTaskCount = job
    ? job.tasks.reduce((count, _, index) => count + Number(player.completedShiftTasks.includes(index)), 0)
    : 0
  const amount = Number(amountText)
  const hasAmount = amountText.trim().length > 0
  const validAmount = Number.isSafeInteger(amount) && amount > 0
  const depositLimit = Math.max(0, Math.min(player.cash, 1_000_000 - player.bankBalance))
  const withdrawLimit = Math.max(0, Math.min(player.bankBalance, 1_000_000 - player.cash))
  const canDeposit = validAmount && amount <= depositLimit
  const canWithdraw = validAmount && amount <= withdrawLimit
  const canAttendLecture = player.energy >= 12 && player.hunger >= 5
  const hasDedicatedService = isBank || canStudy || canRest || canBuyFood

  const deposit = () => {
    if (!canDeposit) return
    onDeposit(amount)
    setAmountText('')
  }

  const withdraw = () => {
    if (!canWithdraw) return
    onWithdraw(amount)
    setAmountText('')
  }

  return (
    <div className="panel-overlay service-sheet-overlay" onClick={onClose}>
      <section
        className="game-panel service-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interior-service-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="panel-header">
          <div className="panel-heading-icon"><Building2 aria-hidden="true" /></div>
          <div>
            <span>{interior.district.toUpperCase()} / ON SITE</span>
            <h2 id="interior-service-title">{interior.name}</h2>
          </div>
          <button className="panel-close" type="button" onClick={onClose} aria-label="Close services">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="service-sheet-content">
          <div className="service-sheet-overview">
            <span>LOCAL SERVICES</span>
            <p>{interior.actionLabel}</p>
          </div>

          <div className="service-sheet-stats" aria-label="Player resources">
            <ServiceStat icon={Wallet} label="CASH" value={formatNaira(player.cash)} />
            {isBank && <ServiceStat icon={Building2} label="BANK BALANCE" value={formatNaira(player.bankBalance)} />}
            <ServiceStat icon={Activity} label="ENERGY" value={`${player.energy}%`} />
            {canStudy && <ServiceStat icon={Sparkles} label="STUDY CREDITS" value={`${player.educationCredits}`} />}
          </div>

          {isBank && (
            <ServiceSection icon={Wallet} eyebrow="ACCOUNT SERVICES" title="Teller counter">
              <div className="service-sheet-field">
                <label htmlFor="interior-service-amount">TRANSFER AMOUNT</label>
                <input
                  id="interior-service-amount"
                  type="number"
                  min={1}
                  max={1_000_000}
                  step={1}
                  inputMode="numeric"
                  value={amountText}
                  onChange={(event) => setAmountText(event.currentTarget.value)}
                  aria-invalid={hasAmount && !validAmount}
                  aria-describedby="interior-service-amount-help"
                />
                <p id="interior-service-amount-help" className="service-sheet-field-help" aria-live="polite">
                  Deposit up to {formatNaira(depositLimit)} · withdraw up to {formatNaira(withdrawLimit)}.
                  {hasAmount && !validAmount ? ' Enter a positive whole-naira amount.' : ''}
                </p>
              </div>
              <div className="service-sheet-actions">
                <button className="primary-action" type="button" onClick={deposit} disabled={!canDeposit}>
                  <span>Deposit funds</span><strong>{validAmount ? formatNaira(amount) : 'Choose amount'}</strong>
                </button>
                <button className="secondary-action" type="button" onClick={withdraw} disabled={!canWithdraw}>
                  <span>Withdraw funds</span><strong>{validAmount ? formatNaira(amount) : 'Choose amount'}</strong>
                </button>
              </div>
            </ServiceSection>
          )}

          {canStudy && (
            <ServiceSection icon={Sparkles} eyebrow="EDUCATION" title={interior.kind === 'university' ? 'Campus lecture' : 'Study room'}>
              <p className="service-sheet-description">Attend a session to earn one study credit and build your reputation.</p>
              {!canAttendLecture && <p className="service-sheet-note">You need at least 12 energy and 5 hunger to attend.</p>}
              <button className="primary-action" type="button" onClick={onLecture} disabled={!canAttendLecture}>
                <span>{interior.kind === 'university' ? 'Attend lecture' : 'Join study session'}</span><ArrowRight aria-hidden="true" />
              </button>
            </ServiceSection>
          )}

          {canRest && (
            <ServiceSection icon={Activity} eyebrow="RECOVERY" title={interior.kind === 'hospital' ? 'Get treatment' : 'Take a rest'}>
              <p className="service-sheet-description">
                {interior.kind === 'hospital' ? 'Recover your energy and settle in for a few hours.' : 'Restore your energy and get ready for the next part of the night.'}
              </p>
              <button className="primary-action" type="button" onClick={onRest}>
                <span>{interior.kind === 'hospital' ? 'Recover at the clinic' : 'Rest here'}</span><ArrowRight aria-hidden="true" />
              </button>
            </ServiceSection>
          )}

          {canBuyFood && (
            <ServiceSection icon={Utensils} eyebrow="FOOD COUNTER" title="Suya wrap">
              <p className="service-sheet-description">Pick up a warm street-food wrap for your bag.</p>
              <button className="primary-action" type="button" onClick={onBuyFood} disabled={player.cash < 90}>
                <span>{player.cash < 90 ? 'Not enough cash' : 'Buy a suya wrap'}</span><strong>{formatNaira(90)}</strong>
              </button>
            </ServiceSection>
          )}

          {job && (
            <ServiceSection icon={BriefcaseBusiness} eyebrow="WORKPLACE SHIFT" title={job.title}>
              <p className="service-sheet-description">{job.description}</p>
              <div className="service-sheet-job-reward">
                <span>{formatNaira(job.pay)} pay</span><span>+{job.reputation} REP</span>
              </div>
              {!isAssignedToJob ? (
                <p className="service-sheet-note">Apply for this role from the Work Board before starting a shift here.</p>
              ) : !player.shiftStarted ? (
                <button className="primary-action" type="button" onClick={() => onStartShift(job.id)}>
                  <span>Start shift</span><ArrowRight aria-hidden="true" />
                </button>
              ) : (
                <>
                  <div className="service-sheet-progress" role="status">
                    <span>WORK CHECKLIST</span><strong>{completedTaskCount} / {job.tasks.length} complete</strong>
                  </div>
                  <ol className="service-sheet-task-list" aria-label={`${job.title} task checklist`}>
                    {job.tasks.map((task, index) => {
                      const complete = player.completedShiftTasks.includes(index)
                      return (
                        <li key={`${job.id}-${index}`}>
                          <button
                            className="service-sheet-task"
                            data-complete={complete ? 'true' : undefined}
                            type="button"
                            onClick={() => onWorkTask(job.id, index)}
                            disabled={complete}
                            aria-pressed={complete}
                          >
                            <span className="service-sheet-task-number">{complete ? <Check aria-hidden="true" /> : index + 1}</span>
                            <span>{task}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                  <button className="primary-action" type="button" onClick={() => onClockOut(job.id)} disabled={completedTaskCount < job.tasks.length}>
                    <span>Clock out and collect pay</span><strong>{formatNaira(job.pay)}</strong>
                  </button>
                </>
              )}
            </ServiceSection>
          )}

          {!hasDedicatedService && (
            <ServiceSection icon={Building2} eyebrow="NEIGHBORHOOD DESK" title="On-site service">
              <p className="service-sheet-description">Use the local desk for information and services at this address.</p>
              <button className="primary-action" type="button" onClick={onServiceAction}>
                <span>{interior.actionLabel}</span><ArrowRight aria-hidden="true" />
              </button>
            </ServiceSection>
          )}

          <div className="service-sheet-exit-note"><Clock3 aria-hidden="true" /><span>Press E near the marked door when you are ready to leave.</span></div>
        </div>
      </section>
    </div>
  )
}
