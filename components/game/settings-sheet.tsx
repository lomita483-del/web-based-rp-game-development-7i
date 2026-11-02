'use client'

import { Gauge, ShieldCheck, SlidersHorizontal, X } from 'lucide-react'
import type { GraphicsQuality } from './city-world'

type SettingsSheetProps = {
  quality: GraphicsQuality
  lookSensitivity: number
  isAdmin: boolean
  onQuality: (quality: GraphicsQuality) => void
  onLookSensitivity: (value: number) => void
  onOpenAdmin: () => void
  onClose: () => void
}

const QUALITY_COPY: Record<GraphicsQuality, string> = {
  low: 'Lightest. Sharpness reduced, less traffic and fewer pedestrians. Best for older phones.',
  medium: 'Balanced. Full traffic, standard sharpness.',
  high: 'Best. Sharper image, edge smoothing, the busiest streets.',
}

export function SettingsSheet({ quality, lookSensitivity, isAdmin, onQuality, onLookSensitivity, onOpenAdmin, onClose }: SettingsSheetProps) {
  return (
    <div className="service-backdrop" onClick={onClose}>
      <section className="service-sheet" role="dialog" aria-modal="true" aria-label="Settings" onClick={(event) => event.stopPropagation()}>
        <header className="service-head">
          <div className="service-head-icon"><SlidersHorizontal aria-hidden="true" /></div>
          <div className="service-head-copy"><span>Eko After Hours</span><h2>Settings</h2></div>
          <button className="service-close" type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        </header>
        <div className="service-body">
          <div className="service-card">
            <div className="service-card-title"><Gauge aria-hidden="true" /> Graphics quality</div>
            <div className="service-chip-row">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button key={level} type="button" className={quality === level ? 'is-on' : undefined} onClick={() => onQuality(level)}>{level.toUpperCase()}</button>
              ))}
            </div>
            <p>{QUALITY_COPY[quality]}</p>
          </div>
          <div className="service-card">
            <div className="service-card-title"><SlidersHorizontal aria-hidden="true" /> Camera sensitivity</div>
            <input className="admin-range" type="range" min={0.4} max={2} step={0.1} value={lookSensitivity} onChange={(event) => onLookSensitivity(Number(event.target.value))} aria-label="Camera sensitivity" />
            <p>{lookSensitivity.toFixed(1)}× · drag on the right side of the screen to look around, pinch or scroll to zoom.</p>
          </div>
          {isAdmin && (
            <div className="service-card">
              <div className="service-card-title"><ShieldCheck aria-hidden="true" /> Admin</div>
              <button className="primary-action" type="button" onClick={onOpenAdmin}>OPEN ADMIN PANEL</button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
