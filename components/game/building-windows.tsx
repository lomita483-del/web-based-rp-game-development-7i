'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import type { CityBuilding } from './game-data'

type Placement = { x: number; y: number; z: number; rot: number; width: number }

const dummy = new Object3D()

/**
 * Every window, window frame and floor band of every building as three instanced meshes.
 * Previously each window was its own group of meshes, which was the main source of draw-call lag.
 */
export function BuildingWindows({ buildings, night }: { buildings: readonly CityBuilding[]; night: boolean }) {
  const data = useMemo(() => {
    const frames: Placement[] = []
    const lit: Placement[] = []
    const dark: Placement[] = []
    const bands: (Placement & { color: string; span: number })[] = []
    for (const b of buildings) {
      const floors = Math.max(2, Math.floor(b.height / 3))
      const faces = [
        { rot: 0, span: b.width, ox: 0, oz: b.depth / 2 },
        { rot: Math.PI, span: b.width, ox: 0, oz: -b.depth / 2 },
        { rot: Math.PI / 2, span: b.depth, ox: b.width / 2, oz: 0 },
        { rot: -Math.PI / 2, span: b.depth, ox: -b.width / 2, oz: 0 },
      ]
      faces.forEach((face, faceIndex) => {
        const columns = Math.max(3, Math.floor(face.span / 2.4))
        const windowWidth = Math.min(0.86, face.span / (columns * 1.65))
        const sin = Math.sin(face.rot)
        const cos = Math.cos(face.rot)
        for (let floor = 0; floor < floors; floor += 1) {
          const y = 1.55 + floor * 2.72
          bands.push({ x: b.x + face.ox + sin * 0.035, y: y - 0.64, z: b.z + face.oz + cos * 0.035, rot: face.rot, width: face.span * 0.96, color: b.accent, span: face.span })
          for (let column = 0; column < columns; column += 1) {
            // Leave the ground-floor centre free for the door on the front face.
            const local = (column - (columns - 1) / 2) * (face.span / (columns + 0.1))
            if (faceIndex === 0 && floor === 0 && Math.abs(local) < b.width * 0.16) continue
            const x = b.x + face.ox + cos * local + sin * 0.08
            const z = b.z + face.oz - sin * local + cos * 0.08
            const placement = { x, y, z, rot: face.rot, width: windowWidth }
            frames.push(placement)
            const isLit = (column * 5 + floor * 3 + faceIndex * 2 + Math.round(b.x + b.z)) % 5 !== 0
            ;(isLit ? lit : dark).push(placement)
          }
        }
      })
    }
    return { frames, lit, dark, bands }
  }, [buildings])

  const unit = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const frameMaterial = useMemo(() => new MeshBasicMaterial({ color: '#434644' }), [])
  const litMaterial = useMemo(() => new MeshBasicMaterial({ color: '#4d5e69' }), [])
  const darkMaterial = useMemo(() => new MeshBasicMaterial({ color: '#2a353e' }), [])
  const bandMaterial = useMemo(() => new MeshBasicMaterial({ color: '#ffffff' }), [])
  useEffect(() => () => { unit.dispose(); frameMaterial.dispose(); litMaterial.dispose(); darkMaterial.dispose(); bandMaterial.dispose() }, [unit, frameMaterial, litMaterial, darkMaterial, bandMaterial])
  useEffect(() => {
    litMaterial.color.set(night ? '#ffd596' : '#4d5e69')
    darkMaterial.color.set(night ? '#1a232b' : '#2a353e')
    frameMaterial.color.set(night ? '#2a2c2b' : '#434644')
  }, [night, litMaterial, darkMaterial, frameMaterial])

  const frameRef = useRef<InstancedMesh>(null!)
  const litRef = useRef<InstancedMesh>(null!)
  const darkRef = useRef<InstancedMesh>(null!)
  const bandRef = useRef<InstancedMesh>(null!)

  useLayoutEffect(() => {
    const fill = (mesh: InstancedMesh | null, list: Placement[], w: (p: Placement) => number, h: number, d: number, extra = 0) => {
      if (!mesh) return
      list.forEach((p, index) => {
        dummy.position.set(p.x, p.y, p.z)
        dummy.rotation.set(0, p.rot, 0)
        dummy.scale.set(w(p) + extra, h, d)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    fill(frameRef.current, data.frames, (p) => p.width, 1.18, 0.12, 0.12)
    fill(litRef.current, data.lit, (p) => p.width, 0.94, 0.1)
    fill(darkRef.current, data.dark, (p) => p.width, 0.94, 0.1)
    fill(bandRef.current, data.bands, (p) => p.width, 0.12, 0.18)
    const tint = new Color()
    data.bands.forEach((band, index) => bandRef.current?.setColorAt(index, tint.set(band.color)))
    if (bandRef.current?.instanceColor) bandRef.current.instanceColor.needsUpdate = true
  }, [data])

  return (
    <>
      <instancedMesh ref={frameRef} args={[unit, frameMaterial, Math.max(1, data.frames.length)]} frustumCulled={false} />
      {data.lit.length > 0 && <instancedMesh ref={litRef} args={[unit, litMaterial, data.lit.length]} frustumCulled={false} />}
      {data.dark.length > 0 && <instancedMesh ref={darkRef} args={[unit, darkMaterial, data.dark.length]} frustumCulled={false} />}
      <instancedMesh ref={bandRef} args={[unit, bandMaterial, Math.max(1, data.bands.length)]} frustumCulled={false} />
    </>
  )
}
