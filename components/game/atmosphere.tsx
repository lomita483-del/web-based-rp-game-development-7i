'use client'

import { Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AmbientLight, Color, DirectionalLight, Fog, HemisphereLight, Mesh, MathUtils, type Group } from 'three'

type Key = {
  hour: number
  sky: string
  fog: string
  ambient: number
  ambientColor: string
  hemi: number
  hemiSky: string
  hemiGround: string
  sun: number
  sunColor: string
}

// Smoothly interpolated through the whole day: night, pre-dawn, sunrise, morning, noon, afternoon, sunset, dusk.
const KEYS: Key[] = [
  { hour: 0, sky: '#0d1730', fog: '#18253f', ambient: 0.46, ambientColor: '#8fa6d8', hemi: 0.5, hemiSky: '#3f5784', hemiGround: '#2a3040', sun: 0.14, sunColor: '#8aa4e6' },
  { hour: 4.8, sky: '#141f3b', fog: '#223250', ambient: 0.48, ambientColor: '#93a8d6', hemi: 0.52, hemiSky: '#46608f', hemiGround: '#2c3343', sun: 0.16, sunColor: '#8fa8e6' },
  { hour: 5.9, sky: '#e3977a', fog: '#e8ab8c', ambient: 0.66, ambientColor: '#ffcfa6', hemi: 0.74, hemiSky: '#ffd3b0', hemiGround: '#5a4a3c', sun: 0.7, sunColor: '#ffbb85' },
  { hour: 7.4, sky: '#9fd0ee', fog: '#bcdce6', ambient: 0.92, ambientColor: '#fff0d4', hemi: 1.0, hemiSky: '#cdeaff', hemiGround: '#5a5242', sun: 1.45, sunColor: '#fff0cf' },
  { hour: 12.5, sky: '#7cc3f2', fog: '#a8d6ea', ambient: 1.0, ambientColor: '#fff5df', hemi: 1.05, hemiSky: '#c4e8ff', hemiGround: '#575043', sun: 1.8, sunColor: '#fff6dd' },
  { hour: 16.6, sky: '#8fc6ea', fog: '#b6d6df', ambient: 0.94, ambientColor: '#fff0d2', hemi: 1.0, hemiSky: '#cfe6f5', hemiGround: '#574d3e', sun: 1.45, sunColor: '#ffe2b0' },
  { hour: 18.2, sky: '#e08b62', fog: '#e7a181', ambient: 0.7, ambientColor: '#ffc79a', hemi: 0.78, hemiSky: '#ffc9a0', hemiGround: '#52443a', sun: 0.75, sunColor: '#ff9f62' },
  { hour: 19.3, sky: '#3c3a5e', fog: '#4d4a6c', ambient: 0.52, ambientColor: '#b4a7c8', hemi: 0.56, hemiSky: '#6a6694', hemiGround: '#34323f', sun: 0.24, sunColor: '#a79ad0' },
  { hour: 20.8, sky: '#111c36', fog: '#1c2a46', ambient: 0.46, ambientColor: '#8fa6d8', hemi: 0.5, hemiSky: '#3f5784', hemiGround: '#2a3040', sun: 0.14, sunColor: '#8aa4e6' },
  { hour: 24, sky: '#0d1730', fog: '#18253f', ambient: 0.46, ambientColor: '#8fa6d8', hemi: 0.5, hemiSky: '#3f5784', hemiGround: '#2a3040', sun: 0.14, sunColor: '#8aa4e6' },
]

const scratch = {
  sky: new Color(),
  fog: new Color(),
  ambientColor: new Color(),
  hemiSky: new Color(),
  hemiGround: new Color(),
  sunColor: new Color(),
  a: new Color(),
  b: new Color(),
}

function sample(hour: number) {
  let index = 0
  while (index < KEYS.length - 2 && hour >= KEYS[index + 1].hour) index += 1
  const from = KEYS[index]
  const to = KEYS[index + 1]
  const t = MathUtils.clamp((hour - from.hour) / (to.hour - from.hour), 0, 1)
  const ease = t * t * (3 - 2 * t)
  const mix = (target: Color, a: string, b: string) => target.set(a).lerp(scratch.b.set(b), ease)
  mix(scratch.sky, from.sky, to.sky)
  mix(scratch.fog, from.fog, to.fog)
  mix(scratch.ambientColor, from.ambientColor, to.ambientColor)
  mix(scratch.hemiSky, from.hemiSky, to.hemiSky)
  mix(scratch.hemiGround, from.hemiGround, to.hemiGround)
  mix(scratch.sunColor, from.sunColor, to.sunColor)
  return {
    ambient: MathUtils.lerp(from.ambient, to.ambient, ease),
    hemi: MathUtils.lerp(from.hemi, to.hemi, ease),
    sun: MathUtils.lerp(from.sun, to.sun, ease),
  }
}

/** 0 in full daylight, 1 in the dead of night. */
export function darkness(hour: number) {
  if (hour >= 20.5 || hour < 4.8) return 1
  if (hour >= 19.2) return MathUtils.smoothstep(hour, 18.2, 20.5)
  if (hour < 6.3) return 1 - MathUtils.smoothstep(hour, 4.8, 6.3)
  if (hour >= 18.2) return MathUtils.smoothstep(hour, 18.2, 20.5)
  return 0
}

/** Street lights, signs and windows switch on at dusk and off after sunrise (with hysteresis-free hard bounds). */
export function lightsOn(hour: number) {
  return hour >= 18.3 || hour < 6.2
}

export function phaseName(hour: number) {
  if (hour >= 4.8 && hour < 6.3) return 'Sunrise'
  if (hour >= 6.3 && hour < 11.5) return 'Morning'
  if (hour >= 11.5 && hour < 16.3) return 'Afternoon'
  if (hour >= 16.3 && hour < 18.3) return 'Evening'
  if (hour >= 18.3 && hour < 19.6) return 'Sunset'
  if (hour >= 19.6 && hour < 22.5) return 'Night'
  return 'Late night'
}

/**
 * Drives every sky and light value from the game clock, easing between updates so the world never
 * flashes. Only this component reacts to clock ticks; the rest of the scene stays still.
 */
export function Atmosphere({ gameMinutes }: { gameMinutes: number }) {
  const { scene } = useThree()
  const minutesRef = useRef(gameMinutes)
  minutesRef.current = gameMinutes
  const smoothed = useRef(gameMinutes)
  const ambient = useRef<AmbientLight>(null!)
  const hemi = useRef<HemisphereLight>(null!)
  const sun = useRef<DirectionalLight>(null!)
  const sunDisc = useRef<Mesh>(null!)
  const moonDisc = useRef<Mesh>(null!)
  const stars = useRef<Group>(null!)
  const fog = useMemo(() => new Fog('#a8d2df', 90, 245), [])

  useFrame((_, delta) => {
    // Ease toward the clock (wrapping around midnight correctly).
    let diff = minutesRef.current - smoothed.current
    if (diff > 720) diff -= 1440
    if (diff < -720) diff += 1440
    smoothed.current = Math.abs(diff) > 90 ? minutesRef.current : smoothed.current + diff * (1 - Math.exp(-delta * 1.4))
    const hour = (((smoothed.current / 60) % 24) + 24) % 24
    const values = sample(hour)
    const night = darkness(hour)

    if (!scene.background || !(scene.background instanceof Color)) scene.background = new Color()
    scene.background.copy(scratch.sky)
    if (scene.fog !== fog) scene.fog = fog
    fog.color.copy(scratch.fog)
    fog.near = MathUtils.lerp(95, 55, night)
    fog.far = MathUtils.lerp(250, 175, night)

    if (ambient.current) { ambient.current.intensity = values.ambient; ambient.current.color.copy(scratch.ambientColor) }
    if (hemi.current) { hemi.current.intensity = values.hemi; hemi.current.color.copy(scratch.hemiSky); hemi.current.groundColor.copy(scratch.hemiGround) }

    // Sun travels east to west across the day; the moon takes the opposite arc at night.
    const dayProgress = MathUtils.clamp((hour - 6) / 12.4, 0, 1)
    const sunAngle = dayProgress * Math.PI
    const sunX = -Math.cos(sunAngle) * 70
    const sunY = Math.max(6, Math.sin(sunAngle) * 60)
    const nightProgress = ((hour + 24 - 19) % 24) / 11
    const moonAngle = MathUtils.clamp(nightProgress, 0, 1) * Math.PI
    if (sun.current) {
      sun.current.intensity = values.sun
      sun.current.color.copy(scratch.sunColor)
      const isDay = night < 0.85
      sun.current.position.set(isDay ? sunX : Math.cos(moonAngle) * 60, isDay ? sunY : Math.max(10, Math.sin(moonAngle) * 55), 14)
    }
    if (sunDisc.current) {
      sunDisc.current.visible = night < 0.7
      sunDisc.current.position.set(sunX, sunY + 4, -90)
      const horizon = 1 - MathUtils.clamp(sunY / 40, 0, 1)
      ;(sunDisc.current.material as unknown as { color: Color }).color.set('#fff0a3').lerp(scratch.a.set('#ff9a55'), horizon)
    }
    if (moonDisc.current) {
      moonDisc.current.visible = night > 0.4
      moonDisc.current.position.set(Math.cos(moonAngle) * 90, 20 + Math.sin(moonAngle) * 70, -110)
    }
    if (stars.current) stars.current.visible = night > 0.6
  })

  return (
    <>
      <ambientLight ref={ambient} />
      <hemisphereLight ref={hemi} args={['#c4e8ff', '#514b3d', 1]} />
      <directionalLight ref={sun} position={[28, 40, 14]} />
      <mesh ref={sunDisc}><sphereGeometry args={[5, 16, 12]} /><meshBasicMaterial color="#fff0a3" fog={false} /></mesh>
      <mesh ref={moonDisc}><sphereGeometry args={[3, 14, 10]} /><meshBasicMaterial color="#fff3cc" fog={false} /></mesh>
      <group ref={stars}><Stars radius={180} depth={100} count={900} factor={3.4} saturation={0.15} fade speed={0.15} /></group>
    </>
  )
}
