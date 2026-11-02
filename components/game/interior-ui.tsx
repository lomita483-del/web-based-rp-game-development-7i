'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  GraduationCap,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { CITY_HOMES, CITY_JOBS, formatNaira, type InteriorDefinition, type JobId, type PlayerState } from './game-data'

type ServiceSectionProps = {
  icon: LucideIcon
  eyebrow: string
  title: string
  children: ReactNode
}

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

type ServiceStatProps = {
  icon: LucideIcon
  label: string
  value: string
}

function ServiceStat({ icon: Icon, label, value }: ServiceStatProps) {
  return (
    <div className="service-sheet-stat">
      <span className="service-sheet-stat-icon"><Icon aria-hidden="true" /></span>
      <span className="service-sheet-stat-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}
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
  onServiceAction,
  onBuyFood,
  onRest,
  onAttendLecture,
  onDeposit,
  onWithdraw,
  onStartShift,
  onCompleteTask,
  onClockOut,
}: ServiceSheetProps) {
  const [amountText, setAmountText] = useState('')
  const panelRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const amountId = useId()
  const amountHelpId = useId()
  const amountErrorId = useId()

  const isBank = interior.kind === 'bank'
  const isEducation = interior.kind === 'university' || interior.kind === 'school'
  const isFoodCounter = interior.kind === 'market' || interior.kind === 'cafe' || interior.kind === 'shop'
  const home = CITY_HOMES.find((entry) => entry.id === player.home)
  const isOwnedHome = home?.locationId === interior.id
  const canRest = interior.kind === 'hospital' || interior.kind === 'hotel' || isOwnedHome
  const hasDedicatedService = isBank || isEducation || isFoodCounter || canRest
  const shiftJob = CITY_JOBS.find((job) => job.locationId === interior.id)
  const isAssignedToShift = shiftJob !== undefined && player.job === shiftJob.id
  const completedTaskCount = shiftJob
    ? shiftJob.tasks.filter((_, index) => player.completedShiftTasks.includes(index)).length
    : 0

  const amount = amountText.trim() ? Number(amountText) : Number.NaN
  const isValidAmount = Number.isSafeInteger(amount) && amount > 0
  const hasAmountError = amountText.trim().length > 0 && !isValidAmount
  const depositLimit = Math.max(0, Math.min(player.cash, 1_000_000 - player.bankBalance))
  const withdrawLimit = Math.max(0, Math.min(player.bankBalance, 1_000_000 - player.cash))
  const canDeposit = isBank && isValidAmount && amount <= depositLimit
  const canWithdraw = isBank && isValidAmount && amount <= withdrawLimit
  const canAttendLecture = player.energy >= 12 && player.hunger >= 5
  const progressPercentage = shiftJob
    ? Math.round((completedTaskCount / Math.max(1, shiftJob.tasks.length)) * 100)
    : 0

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    return () => {
      if (previouslyFocusedElement?.isConnected) previouslyFocusedElement.focus()
    }
  }, [])

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) return
    const focusableElements = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    )
    if (focusableElements.length === 0) {
      event.preventDefault()
      panelRef.current.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const focusIsOutsidePanel = !panelRef.current.contains(document.activeElement)

    if (event.shiftKey && (document.activeElement === firstElement || focusIsOutsidePanel)) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && (document.activeElement === lastElement || focusIsOutsidePanel)) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  const handleDeposit = () => {
    if (!canDeposit) return
    onDeposit(amount)
    setAmountText('')
  }

  const handleWithdraw = () => {
    if (!canWithdraw) return
    onWithdraw(amount)
    setAmountText('')
  }

  return (
    <div className="panel-overlay service-sheet-overlay" onClick={onClose}>
      <section
        ref={panelRef}
        className="game-panel service-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="panel-header">
          <div className="panel-heading-icon"><Building2 aria-hidden="true" /></div>
          <div>
            <span>{interior.district} · ON-SITE SERVICES</span>
            <h2 id={titleId}>{interior.name}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="panel-close"
            type="button"
            aria-label="Close on-site services"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="service-sheet-content">
          <div className="service-sheet-overview">
            <span>LOCAL SERVICE DESK</span>
            <p>{interior.actionLabel}. Manage your accounts, work, or neighborhood services here.</p>
          </div>

          <div className="service-sheet-stats" aria-label="Current player resources">
            <ServiceStat icon={Wallet} label="Cash" value={formatNaira(player.cash)} />
            {isBank && <ServiceStat icon={Building2} label="Bank balance" value={formatNaira(player.bankBalance)} />}
            <ServiceStat icon={Activity} label="Energy" value={`${player.energy}%`} />
            <ServiceStat icon={Utensils} label="Hunger" value={`${player.hunger}%`} />
            {isEducation && <ServiceStat icon={GraduationCap} label="Study credits" value={`${player.educationCredits}`} />}
          </div>

          {isBank && (
            <ServiceSection icon={Wallet} eyebrow="EKO COOPERATIVE BANK" title="Move money">
              <p className="service-sheet-description">Transfer whole-naira amounts between your wallet and bank account.</p>
              <div className="service-sheet-field">
                <label htmlFor={amountId}>TRANSFER AMOUNT</label>
                <input
                  id={amountId}
                  type="number"
                  min={1}
                  max={1_000_000}
                  step={1}
                  inputMode="numeric"
                  value={amountText}
                  aria-invalid={hasAmountError || undefined}
                  aria-describedby={`${amountHelpId}${hasAmountError ? ` ${amountErrorId}` : ''}`}
                  onChange={(event) => setAmountText(event.currentTarget.value)}
                />
                <small id={amountHelpId} className="service-sheet-field-help">
                  Deposit up to {formatNaira(depositLimit)} · withdraw up to {formatNaira(withdrawLimit)}.
                </small>
                {hasAmountError && (
                  <small id={amountErrorId} className="service-sheet-error" role="status">
                    Enter a positive whole-naira amount.
                  </small>
                )}
              </div>
              <div className="service-sheet-actions">
                <button className="primary-action" type="button" disabled={!canDeposit} onClick={handleDeposit}>
                  <span>Deposit funds</span><ArrowRight aria-hidden="true" />
                </button>
                <button className="secondary-action" type="button" disabled={!canWithdraw} onClick={handleWithdraw}>
                  <span>Withdraw funds</span><ArrowRight aria-hidden="true" />
                </button>
              </div>
            </ServiceSection>
          )}

          {isFoodCounter && (
            <ServiceSection icon={Utensils} eyebrow="FOOD COUNTER" title="Suya wrap">
              <p className="service-sheet-description">Add a fresh wrap to your bag for {formatNaira(90)}.</p>
              <div className="service-sheet-actions">
                <button className="primary-action" type="button" disabled={player.cash < 90} onClick={onBuyFood}>
                  <span>Add to bag · {formatNaira(90)}</span><ArrowRight aria-hidden="true" />
                </button>
              </div>
            </ServiceSection>
          )}

          {isEducation && (
            <ServiceSection
              icon={GraduationCap}
              eyebrow="CAMPUS"
              title={interior.kind === 'university' ? 'Attend a lecture' : 'Evening study room'}
            >
              <p className="service-sheet-description">Complete a class for one study credit and 8 reputation.</p>
              <div className="service-sheet-actions">
                <button className="primary-action" type="button" disabled={!canAttendLecture} onClick={onAttendLecture}>
                  <span>{interior.kind === 'university' ? 'Attend lecture' : 'Join study session'}</span><ArrowRight aria-hidden="true" />
                </button>
              </div>
              {!canAttendLecture && <small className="service-sheet-note">You need at least 12 energy and 5 hunger to study.</small>}
            </ServiceSection>
          )}

          {canRest && (
            <ServiceSection
              icon={Activity}
              eyebrow={interior.kind === 'hospital' ? 'HEALTHCARE' : 'REST & RECOVERY'}
              title={interior.kind === 'hospital' ? 'Recover at the clinic' : 'Get some rest'}
            >
              <p className="service-sheet-description">Restore your energy and recover your hunger before heading back out.</p>
              <div className="service-sheet-actions">
                <button className="primary-action" type="button" onClick={onRest}>
                  <span>{interior.kind === 'hospital' ? 'Get treatment' : 'Rest now'}</span><ArrowRight aria-hidden="true" />
                </button>
              </div>
            </ServiceSection>
          )}

          {shiftJob && (
            <ServiceSection icon={BriefcaseBusiness} eyebrow={shiftJob.employer} title={shiftJob.title}>
              <p className="service-sheet-description">{shiftJob.description}</p>
              <div className="service-sheet-job-reward">
                <span><Wallet aria-hidden="true" /> {formatNaira(shiftJob.pay)}</span>
                <span>+{shiftJob.reputation} REP</span>
              </div>
              {!isAssignedToShift ? (
                <p className="service-sheet-note">Apply for this role from the Work Board before starting a shift here.</p>
              ) : !player.shiftStarted ? (
                <div className="service-sheet-actions">
                  <button className="primary-action" type="button" onClick={() => onStartShift(shiftJob.id)}>
                    <span>Start shift</span><ArrowRight aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="service-sheet-progress" role="status">
                    <span>Shift checklist</span>
                    <strong>{completedTaskCount} / {shiftJob.tasks.length}</strong>
                  </div>
                  <div
                    className="service-sheet-progress-track"
                    role="progressbar"
                    aria-label="Shift checklist progress"
                    aria-valuemin={0}
                    aria-valuemax={shiftJob.tasks.length}
                    aria-valuenow={completedTaskCount}
                  >
                    <span style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <ol className="service-sheet-task-list">
                    {shiftJob.tasks.map((task, index) => {
                      const isComplete = player.completedShiftTasks.includes(index)
                      return (
                        <li key={`${shiftJob.id}-${index}`}>
                          <button
                            className="service-sheet-task"
                            data-complete={isComplete ? 'true' : 'false'}
                            type="button"
                            disabled={isComplete}
                            aria-pressed={isComplete}
                            aria-label={`${isComplete ? 'Completed' : 'Complete'} task ${index + 1}: ${task}`}
                            onClick={() => onCompleteTask(shiftJob.id, index)}
                          >
                            <span className="service-sheet-task-number" aria-hidden="true">
                              {isComplete ? <Check /> : index + 1}
                            </span>
                            <span>{task}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                  <div className="service-sheet-actions">
                    <button
                      className="primary-action"
                      type="button"
                      disabled={completedTaskCount !== shiftJob.tasks.length}
                      onClick={() => onClockOut(shiftJob.id)}
                    >
                      <span>Clock out · claim {formatNaira(shiftJob.pay)}</span><ArrowRight aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}
            </ServiceSection>
          )}

          {!hasDedicatedService && (
            <ServiceSection icon={Building2} eyebrow="ON-SITE SERVICE" title={interior.actionLabel}>
              <p className="service-sheet-description">Use the local desk to check in, review public services, or get the next neighborhood lead.</p>
              <div className="service-sheet-actions">
                <button className="primary-action" type="button" onClick={onServiceAction}>
                  <span>{interior.actionLabel}</span><ArrowRight aria-hidden="true" />
                </button>
              </div>
            </ServiceSection>
          )}
        </div>
      </section>
    </div>
  )
}
