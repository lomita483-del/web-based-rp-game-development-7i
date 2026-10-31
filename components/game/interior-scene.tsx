'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Group, type Mesh } from 'three'
import type { InteriorDefinition, InteriorKind } from './game-data'
import { HumanoidModel, type IdleStyle } from './humanoid'

type InteriorSceneProps = {
  interior: InteriorDefinition
  onApartmentMove?: (x: number, z: number) => void
  onApartmentAction?: (action: 'rest' | 'shower' | 'toilet' | 'food' | 'cook' | 'tv' | 'study') => void
  apartmentTargetRef?: MutableRefObject<{ x: number; z: number } | null>
}

type RoomPalette = {
  background: string
  wall: string
  floor: string
  trim: string
  light: string
}

const ROOM_PALETTES: Record<InteriorKind, RoomPalette> = {
  market: { background: '#252b2a', wall: '#b59a78', floor: '#776b5e', trim: '#c98c4f', light: '#f2d3a2' },
  club: { background: '#1b1a22', wall: '#46404b', floor: '#332e38', trim: '#d27b58', light: '#f0b178' },
  garage: { background: '#242727', wall: '#77766e', floor: '#585a57', trim: '#d39a4e', light: '#f3d28a' },
  hotel: { background: '#252321', wall: '#8d8172', floor: '#75675c', trim: '#d1ad6c', light: '#f5d9a6' },
  cafe: { background: '#28211d', wall: '#a88d6f', floor: '#796957', trim: '#c56c4b', light: '#f4c887' },
  bank: { background: '#1b252b', wall: '#8f9997', floor: '#686f70', trim: '#d6b16d', light: '#f4dca5' },
  police: { background: '#1c252c', wall: '#77858a', floor: '#5d676b', trim: '#bb6550', light: '#e8d5b7' },
  court: { background: '#29251f', wall: '#b4a991', floor: '#726557', trim: '#967a4f', light: '#f0d8a5' },
  hospital: { background: '#1e2829', wall: '#c3c4ba', floor: '#9ba5a1', trim: '#4b8b91', light: '#f2f1df' },
  university: { background: '#28231c', wall: '#b5a183', floor: '#766552', trim: '#476a72', light: '#f4d69d' },
  school: { background: '#29231d', wall: '#b6a183', floor: '#7a6a57', trim: '#ab624d', light: '#f2d89e' },
  stadium: { background: '#1c2724', wall: '#69766e', floor: '#48564b', trim: '#cba15f', light: '#e6d198' },
  government: { background: '#28251f', wall: '#b6ae9d', floor: '#7a7060', trim: '#a78251', light: '#f3dba9' },
  polling: { background: '#29251f', wall: '#b5a78d', floor: '#7b6c5a', trim: '#bd7054', light: '#f3d69f' },
  bungalow: { background: '#26231e', wall: '#b49c7e', floor: '#776754', trim: '#bd7655', light: '#efd5a3' },
  estate: { background: '#28231d', wall: '#a99b88', floor: '#786c5e', trim: '#b66f56', light: '#f0d7a9' },
  village: { background: '#26231d', wall: '#a8906b', floor: '#796347', trim: '#b17648', light: '#f1d198' },
  farm: { background: '#24241d', wall: '#a9916e', floor: '#776b50', trim: '#b9784d', light: '#efd29a' },
  airport: { background: '#20272b', wall: '#b8c0bc', floor: '#879292', trim: '#5b7d83', light: '#f5e6bf' },
  port: { background: '#23272a', wall: '#8d9694', floor: '#646c6d', trim: '#c28a53', light: '#efd7a8' },
  clubhouse: { background: '#21241f', wall: '#817b70', floor: '#5d5a50', trim: '#d0a35f', light: '#f1d39b' },
  'event-center': { background: '#20252a', wall: '#a6aaa5', floor: '#747b7a', trim: '#c99b58', light: '#f5d7a0' },
  apartment: { background: '#292520', wall: '#a19380', floor: '#786c5e', trim: '#c58a5d', light: '#efcf99' },
  shop: { background: '#29221c', wall: '#ae9371', floor: '#776653', trim: '#d09a51', light: '#f1d39b' },
  office: { background: '#20272a', wall: '#929b99', floor: '#697374', trim: '#c4a16b', light: '#f2e0ba' },
  house: { background: '#29231d', wall: '#b19a79', floor: '#796753', trim: '#bd7755', light: '#f0d4a0' },
}

function RoomSign({ name, accent }: { name: string; accent: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (!context) return null

    context.fillStyle = 'rgba(19, 26, 31, 0.96)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = accent
    context.lineWidth = 7
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)
    context.fillStyle = '#f4ead8'
    context.font = '600 62px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(name.toUpperCase(), canvas.width / 2, canvas.height / 2, canvas.width - 48)

    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [accent, name])

  if (!texture) return null

  return (
    <mesh position={[0, 4.35, -7.72]}>
      <planeGeometry args={[7.8, 1.45]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function Counter({ position = [0, 0, -4.25], width = 6, color = '#62594d' }: { position?: [number, number, number]; width?: number; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 1.3, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.77} />
      </mesh>
      <mesh position={[0, 1.34, 0]} castShadow>
        <boxGeometry args={[width + 0.16, 0.12, 1.04]} />
        <meshStandardMaterial color="#c4b397" roughness={0.54} />
      </mesh>
      {[-width * 0.32, 0, width * 0.32].map((x) => (
        <mesh key={x} position={[x, 1.47, 0.1]}>
          <boxGeometry args={[0.36, 0.22, 0.06]} />
          <meshStandardMaterial color="#2c383b" metalness={0.16} roughness={0.46} />
        </mesh>
      ))}
    </group>
  )
}

function Table({ position, color = '#725d49', width = 2.1, depth = 1.35 }: { position: [number, number, number]; color?: string; width?: number; depth?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${xSide}-${zSide}`} position={[xSide * (width / 2 - 0.18), 0.42, zSide * (depth / 2 - 0.16)]}>
          <boxGeometry args={[0.12, 0.82, 0.12]} />
          <meshStandardMaterial color="#4c4842" roughness={0.9} />
        </mesh>
      )))}
    </group>
  )
}

function Seat({ position, color = '#59544c' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.74, 0.16, 0.72]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.08, -0.27]} castShadow>
        <boxGeometry args={[0.74, 0.8, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.27, 0.31, 0]}>
          <boxGeometry args={[0.1, 0.56, 0.1]} />
          <meshStandardMaterial color="#403d38" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Shelf({ position, color = '#78654f' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[1.25, 2.9, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.87} />
      </mesh>
      {[0.6, 1.4, 2.2].map((y) => (
        <mesh key={y} position={[0, y, 0.27]}>
          <boxGeometry args={[1.14, 0.1, 0.5]} />
          <meshStandardMaterial color="#bda67e" roughness={0.82} />
        </mesh>
      ))}
    </group>
  )
}

function Bed({ position = [4.6, 0, -2.1] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[2.4, 0.42, 4.2]} />
        <meshStandardMaterial color="#d6d2c8" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.75, -1.2]}>
        <boxGeometry args={[2.2, 0.22, 1]} />
        <meshStandardMaterial color="#7d9292" roughness={0.92} />
      </mesh>
      {[-0.95, 0.95].map((x) => [-1.75, 1.75].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.2, z]}>
          <boxGeometry args={[0.12, 0.4, 0.12]} />
          <meshStandardMaterial color="#50493f" roughness={0.9} />
        </mesh>
      )))}
    </group>
  )
}

function Crate({ position, color = '#a9784e' }: { position: [number, number, number]; color?: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[0.9, 0.72, 0.85]} />
      <meshStandardMaterial color={color} roughness={0.96} />
    </mesh>
  )
}

function DoorFrame({ accent }: { accent: string }) {
  return (
    <group position={[0, 0, 7.72]}>
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 2.15, 0]} castShadow>
          <boxGeometry args={[0.18, 4.3, 0.28]} />
          <meshStandardMaterial color={accent} metalness={0.18} roughness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 4.28, 0]}>
        <boxGeometry args={[2.88, 0.18, 0.28]} />
        <meshStandardMaterial color={accent} metalness={0.18} roughness={0.48} />
      </mesh>
    </group>
  )
}

const STAFF_OUTFITS: Partial<Record<InteriorKind, string>> = {
  hospital: '#e4e4d9',
  police: '#27495d',
  bank: '#385a66',
  garage: '#8a6a3c',
  market: '#935d37',
  cafe: '#8b5436',
}

function ServiceWorker({ color, position = [0, 0, -5.5] }: { color: string; position?: [number, number, number] }) {
  return (
    <group position={position}>
      <HumanoidModel skinTone="#8d5c43" hairColor="#211b18" clothing={color} accentColor="#d5ba8b" idle="work" />
    </group>
  )
}

function RoomFurniture({ kind, palette }: { kind: InteriorKind; palette: RoomPalette }) {
  if (kind === 'bank') {
    return (
      <>
        <Counter width={7} color="#596d70" />
        <ServiceWorker color="#385a66" />
        <mesh position={[-6.1, 1.35, -3.8]} castShadow><boxGeometry args={[1.15, 2.5, 0.32]} /><meshStandardMaterial color="#39484a" roughness={0.54} /></mesh>
        <mesh position={[-6.1, 1.34, -3.6]}><boxGeometry args={[0.82, 1.5, 0.08]} /><meshStandardMaterial color="#334852" emissive="#16313b" emissiveIntensity={0.2} /></mesh>
        {[-3.2, -1.1, 1.1, 3.2].map((x) => <Seat key={x} position={[x, 0, 2.6]} color="#52636a" />)}
      </>
    )
  }

  if (kind === 'university' || kind === 'school') {
    return (
      <>
        <mesh position={[0, 3.45, -7.58]}><boxGeometry args={[7.4, 1.5, 0.16]} /><meshStandardMaterial color="#334648" roughness={0.72} /></mesh>
        <mesh position={[0, 2.55, -7.42]}><boxGeometry args={[0.18, 0.5, 0.06]} /><meshStandardMaterial color="#e4ddc7" /></mesh>
        {[-4.5, -1.5, 1.5, 4.5].map((x) => [-3.7, -0.3, 3].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <Table position={[0, 0, 0]} width={2.05} depth={0.82} color="#7b6349" />
            <Seat position={[0, 0, 0.9]} color="#534b42" />
          </group>
        )))}
        <Table position={[0, 0, -5.2]} width={2.6} depth={1.2} color="#8a704e" />
      </>
    )
  }

  if (kind === 'airport') {
    return (
      <>
        <Counter width={8} color="#7b8987" />
        <ServiceWorker color="#476b74" />
        <mesh position={[0, 3.3, -7.6]}><boxGeometry args={[7.8, 1.6, 0.14]} /><meshStandardMaterial color="#26373d" /></mesh>
        {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => <Seat key={x} position={[x, 0, 2.4]} color="#546a72" />)}
        {[-1, 1].map((side) => <Crate key={side} position={[side * 6.1, 0.55, 1.5]} color="#9a8567" />)}
      </>
    )
  }

  if (kind === 'hospital') {
    return (
      <>
        <Counter position={[-3.5, 0, -4.6]} width={4.6} color="#829493" />
        <ServiceWorker color="#e4e4d9" position={[-3.5, 0, -5.9]} />
        <Bed position={[3.8, 0, -2.2]} />
        <mesh position={[5.4, 1.25, -5.4]}><boxGeometry args={[0.9, 1.7, 0.42]} /><meshStandardMaterial color="#647c7e" /></mesh>
        <mesh position={[5.4, 2.2, -5.15]}><boxGeometry args={[0.65, 0.55, 0.08]} /><meshStandardMaterial color="#78a99d" emissive="#427668" emissiveIntensity={0.3} /></mesh>
      </>
    )
  }

  if (kind === 'market' || kind === 'shop' || kind === 'farm' || kind === 'village') {
    return (
      <>
        <Counter width={6.5} color="#795c42" />
        <ServiceWorker color="#935d37" />
        {[-5.6, 5.6].map((x) => <Shelf key={x} position={[x, 0, -4.6]} color="#715d47" />)}
        {[-2.4, 0, 2.4].map((x, index) => <Crate key={x} position={[x, 0.45, -2.5]} color={index % 2 ? '#92734f' : '#a46c42'} />)}
      </>
    )
  }

  if (kind === 'cafe') {
    return (
      <>
        <Counter width={7} color="#73563f" />
        <ServiceWorker color="#8b5436" />
        {[-3.5, 3.5].map((x) => <Table key={x} position={[x, 0, 2.3]} width={1.7} depth={1.25} />)}
        {[-4.3, -2.7, 2.7, 4.3].map((x) => <Seat key={x} position={[x, 0, 3.2]} />)}
      </>
    )
  }

  if (kind === 'garage') {
    return (
      <>
        <mesh position={[-4.5, 1.8, -2.8]} castShadow><boxGeometry args={[4.8, 0.16, 5.8]} /><meshStandardMaterial color="#b28c56" metalness={0.25} roughness={0.56} /></mesh>
        {[-6.3, -2.7].map((x) => <mesh key={x} position={[x, 2.15, -2.8]}><boxGeometry args={[0.18, 4.3, 0.18]} /><meshStandardMaterial color="#626a68" metalness={0.35} roughness={0.58} /></mesh>)}
        <Counter position={[3.2, 0, -4.5]} width={4} color="#676761" />
        <Crate position={[5.2, 0.5, 1]} color="#7d5840" />
      </>
    )
  }

  if (kind === 'club' || kind === 'clubhouse' || kind === 'event-center') {
    return (
      <>
        <mesh position={[0, 0.28, -5.4]} castShadow><boxGeometry args={[8.5, 0.56, 2.2]} /><meshStandardMaterial color={palette.trim} emissive={palette.trim} emissiveIntensity={0.13} /></mesh>
        <Counter position={[0, 0, -3.6]} width={6.4} color="#51454b" />
        {[-4.6, 4.6].map((x) => <Table key={x} position={[x, 0, 1.2]} width={1.8} depth={1.25} color="#65574e" />)}
        {[-5.3, -3.9, 3.9, 5.3].map((x) => <Seat key={x} position={[x, 0, 2.2]} color="#5e5149" />)}
      </>
    )
  }

  if (kind === 'police' || kind === 'government' || kind === 'court' || kind === 'polling' || kind === 'office') {
    return (
      <>
        <Counter width={7} color={kind === 'police' ? '#4f6873' : '#776850'} />
        <ServiceWorker color={kind === 'police' ? '#27495d' : '#66545a'} />
        {[-4.6, 4.6].map((x) => <Seat key={x} position={[x, 0, 2.8]} color="#5e5a52" />)}
        {kind === 'court' && [-3.6, -1.8, 0, 1.8, 3.6].map((x) => <Seat key={`court-${x}`} position={[x, 0, 0.8]} color="#78674f" />)}
      </>
    )
  }

  if (kind === 'port') {
    return (
      <>
        <Counter width={6.5} color="#55676b" />
        <ServiceWorker color="#3e5c64" />
        {[-4.6, 4.6].map((x) => <Crate key={x} position={[x, 0.55, -1.4]} color="#a96f44" />)}
        <mesh position={[5.3, 2.3, -5.5]}><boxGeometry args={[2.4, 2.6, 0.3]} /><meshStandardMaterial color="#687875" /></mesh>
      </>
    )
  }

  if (kind === 'stadium') {
    return (
      <>
        <Counter width={6.3} color="#4e6252" />
        <ServiceWorker color="#3e5849" />
        {[-4.2, 4.2].map((x) => <Shelf key={x} position={[x, 0, 1.5]} color="#5c5b4d" />)}
        {[-2.2, 0, 2.2].map((x) => <Crate key={x} position={[x, 0.55, 3.5]} color="#7d704d" />)}
      </>
    )
  }

  if (kind === 'hotel' || kind === 'bungalow' || kind === 'estate' || kind === 'apartment' || kind === 'house') {
    return (
      <>
        <Counter position={[-3.7, 0, -4.7]} width={4.4} color="#715c48" />
        <Seat position={[-2.9, 0, -1.1]} color="#625c52" />
        <Seat position={[-1.9, 0, -1.1]} color="#625c52" />
        <Table position={[-2.4, 0, 1.1]} width={2.6} depth={1.1} color="#765c43" />
        <Bed position={[4.5, 0, -2.1]} />
        <mesh position={[-6, 1.2, -4.9]}><cylinderGeometry args={[0.62, 0.78, 2.4, 8]} /><meshStandardMaterial color="#697a55" roughness={0.94} /></mesh>
      </>
    )
  }

  return (
    <>
      <Counter width={6.3} color="#6d604e" />
      <ServiceWorker color="#4b626c" />
      <Shelf position={[-5.4, 0, -4.7]} color="#76624c" />
      <Table position={[4.6, 0, 1.6]} />
      <Seat position={[4.6, 0, 2.7]} />
    </>
  )
}


function ApartmentTargetMarker({ targetRef }: { targetRef: MutableRefObject<{ x: number; z: number } | null> }) {
  const markerRef = useRef<Mesh>(null!)
  useFrame(() => {
    const marker = markerRef.current
    if (!marker) return
    const target = targetRef.current
    marker.visible = Boolean(target)
    if (target) marker.position.set(target.x, 0.19, target.z)
  })
  return (
    <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.42, 0.62, 32]} />
      <meshBasicMaterial color="#75f0b2" transparent opacity={0.9} depthWrite={false} />
    </mesh>
  )
}

function StarterApartmentLayout({ onMove, onAction, targetRef }: { onMove?: (x: number, z: number) => void; onAction?: (action: 'rest' | 'shower' | 'toilet' | 'food' | 'cook' | 'tv' | 'study') => void; targetRef?: MutableRefObject<{ x: number; z: number } | null> }) {
  const wall = '#16745f'
  const trim = '#d5c7a5'
  const wood = '#80583b'
  const tile = '#e7e5dc'
  return (
    <>
      <color attach="background" args={['#071321']} />
      <ambientLight intensity={1.15} color="#e8f1eb" />
      <hemisphereLight args={['#e8f5ff', '#233b31', 1.05]} />
      <directionalLight position={[-9, 22, 12]} intensity={1.65} castShadow />
      <pointLight position={[-5, 5, -4]} intensity={0.65} color="#fff0cf" distance={18} />
      <pointLight position={[5, 5, -4]} intensity={0.55} color="#fff0cf" distance={18} />
      {/* Invisible walkable surface: pointer taps set a world-space destination without affecting the city camera. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} onPointerDown={(event) => {
        event.stopPropagation()
        const x = Math.max(-17, Math.min(17, event.point.x))
        const z = Math.max(-14, Math.min(14, event.point.z))
        onMove?.(x, z)
      }}>
        <planeGeometry args={[35, 29]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {targetRef && <ApartmentTargetMarker targetRef={targetRef} />}
      {([
        { action: 'tv' as const, label: 'WATCH TV', x: -4.3, z: -7.1 },
        { action: 'rest' as const, label: 'SLEEP / REST', x: 4.5, z: -3.7 },
        { action: 'study' as const, label: 'USE LAPTOP', x: 1.4, z: -6.7 },
        { action: 'food' as const, label: 'GET FOOD', x: -6.8, z: 4.1 },
        { action: 'cook' as const, label: 'COOK', x: -4.1, z: 6.2 },
        { action: 'shower' as const, label: 'SHOWER', x: 6.4, z: 3.1 },
        { action: 'toilet' as const, label: 'USE TOILET', x: 4.1, z: 6.2 },
      ]).map((spot) => (
        <mesh key={spot.action} position={[spot.x, 0.2, spot.z]} onPointerDown={(event) => {
          event.stopPropagation()
          onMove?.(spot.x, spot.z)
          onAction?.(spot.action)
        }}>
          <cylinderGeometry args={[0.72, 0.72, 0.08, 20]} />
          <meshBasicMaterial color="#72d6a0" transparent opacity={0.001} depthWrite={false} />
        </mesh>
      ))}
      {/* Private circular garden plot and tiled approach */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
        <circleGeometry args={[19, 64]} /><meshStandardMaterial color="#315b3d" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[15.8, 64]} /><meshStandardMaterial color="#47744b" roughness={1} />
      </mesh>
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <boxGeometry args={[17, 0.42, 17]} /><meshStandardMaterial color="#d0cfc4" roughness={0.94} />
      </mesh>
      {/* Four-room open-top cutaway home */}
      <mesh position={[-4.1, 0.02, -4.1]}><boxGeometry args={[8.45, 0.12, 8.45]} /><meshStandardMaterial color={tile} roughness={0.88} /></mesh>
      <mesh position={[4.1, 0.02, -4.1]}><boxGeometry args={[8.45, 0.12, 8.45]} /><meshStandardMaterial color={wood} roughness={0.86} /></mesh>
      <mesh position={[-4.1, 0.02, 4.1]}><boxGeometry args={[8.45, 0.12, 8.45]} /><meshStandardMaterial color="#b7b8ae" roughness={0.9} /></mesh>
      <mesh position={[4.1, 0.02, 4.1]}><boxGeometry args={[8.45, 0.12, 8.45]} /><meshStandardMaterial color="#c7c9c2" roughness={0.9} /></mesh>
      {/* Emerald exterior walls; front and roof stay open for the isometric view */}
      <mesh position={[0, 1.45, -8.45]}><boxGeometry args={[17, 2.9, 0.28]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      <mesh position={[-8.45, 1.45, 0]}><boxGeometry args={[0.28, 2.9, 17]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      <mesh position={[8.45, 1.45, 0]}><boxGeometry args={[0.28, 2.9, 17]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      <mesh position={[0, 1.45, 8.45]}><boxGeometry args={[17, 2.9, 0.28]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      {/* Room partitions built as separate wall sections, leaving genuine 1.6m door openings. */}
      {[-6.25, 6.25].map((z) => <mesh key={`vertical-partition-${z}`} position={[0,1.05,z]}><boxGeometry args={[0.18,2.1,4.0]} /><meshStandardMaterial color={wall} /></mesh>)}
      {[-6.25, 6.25].map((x) => <mesh key={`horizontal-partition-${x}`} position={[x,1.05,0]}><boxGeometry args={[4.0,2.1,0.18]} /><meshStandardMaterial color={wall} /></mesh>)}
      {/* Open timber door leaves, hinges and brass handles. */}
      {[
        { position: [-0.08,1.05,-4.1] as [number,number,number], rotation: [0,-Math.PI/2,0] as [number,number,number] },
        { position: [-4.1,1.05,0.08] as [number,number,number], rotation: [0,Math.PI/2,0] as [number,number,number] },
        { position: [4.1,1.05,0.08] as [number,number,number], rotation: [0,-Math.PI/2,0] as [number,number,number] },
      ].map((door,index) => <group key={index} position={door.position} rotation={door.rotation}>
        <mesh position={[0,0,-0.78]}><boxGeometry args={[1.45,2.05,0.09]} /><meshStandardMaterial color="#765139" roughness={0.78} /></mesh>
        <mesh position={[0,0,-0.78]}><boxGeometry args={[1.12,1.72,0.025]} /><meshStandardMaterial color="#956b49" roughness={0.82} /></mesh>
        <mesh position={[0.53,0,-0.71]}><sphereGeometry args={[0.055,10,8]} /><meshStandardMaterial color="#d4b16d" metalness={0.78} roughness={0.25} /></mesh>
      </group>)}
      {/* Glazed windows with proper frames, mullions and sills. */}
      {[-5.8,5.8].map((x) => <group key={`rear-window-${x}`} position={[x,1.85,-8.28]}>
        <mesh><boxGeometry args={[2.25,1.25,0.12]} /><meshStandardMaterial color="#d7c6a6" /></mesh>
        <mesh position={[0,0,0.075]}><boxGeometry args={[2.02,1.02,0.035]} /><meshStandardMaterial color="#83b8c3" metalness={0.18} roughness={0.18} transparent opacity={0.72} /></mesh>
        <mesh position={[0,0,0.11]}><boxGeometry args={[0.055,1.05,0.04]} /><meshStandardMaterial color="#e9dfca" /></mesh>
        <mesh position={[0,0.53,0.11]}><boxGeometry args={[2.05,0.055,0.04]} /><meshStandardMaterial color="#e9dfca" /></mesh>
        <mesh position={[0,-0.68,0.16]}><boxGeometry args={[2.45,0.12,0.28]} /><meshStandardMaterial color="#d8c8a9" /></mesh>
      </group>)}
      {[-5.8,5.8].map((z) => <group key={`side-window-${z}`} position={[-8.28,1.85,z]} rotation={[0,Math.PI/2,0]}>
        <mesh><boxGeometry args={[2.25,1.25,0.12]} /><meshStandardMaterial color="#d7c6a6" /></mesh>
        <mesh position={[0,0,0.075]}><boxGeometry args={[2.02,1.02,0.035]} /><meshStandardMaterial color="#83b8c3" metalness={0.18} roughness={0.18} transparent opacity={0.72} /></mesh>
        <mesh position={[0,0,0.11]}><boxGeometry args={[0.055,1.05,0.04]} /><meshStandardMaterial color="#e9dfca" /></mesh>
        <mesh position={[0,0.53,0.11]}><boxGeometry args={[2.05,0.055,0.04]} /><meshStandardMaterial color="#e9dfca" /></mesh>
        <mesh position={[0,-0.68,0.16]}><boxGeometry args={[2.45,0.12,0.28]} /><meshStandardMaterial color="#d8c8a9" /></mesh>
      </group>)}
      {/* Main entrance door and glazed sidelights. */}
      <group position={[0,0,8.28]}>
        <mesh position={[-0.72,1.12,0]}><boxGeometry args={[1.28,2.18,0.12]} /><meshStandardMaterial color="#69452f" roughness={0.78} /></mesh>
        <mesh position={[-0.72,1.12,0.075]}><boxGeometry args={[0.92,1.82,0.025]} /><meshStandardMaterial color="#8b6546" roughness={0.78} /></mesh>
        <mesh position={[-0.22,1.1,0.15]}><sphereGeometry args={[0.055,10,8]} /><meshStandardMaterial color="#d9b66f" metalness={0.8} /></mesh>
        <mesh position={[1.0,1.15,0]}><boxGeometry args={[0.62,2.1,0.1]} /><meshStandardMaterial color="#91b9ba" transparent opacity={0.5} /></mesh>
      </group>
      {/* Living room: sectional sofa, coffee table and television */}
      <group position={[-4.3, 0.12, -4.2]}>
        <mesh position={[0, 0.55, 1.6]}><boxGeometry args={[4.4, 0.72, 1.35]} /><meshStandardMaterial color="#287d69" /></mesh>
        <mesh position={[0, 1.05, 1.05]}><boxGeometry args={[4.4, 0.55, 0.35]} /><meshStandardMaterial color="#216753" /></mesh>
        <mesh position={[0, 0.45, -1.2]}><boxGeometry args={[2.2, 0.14, 1.25]} /><meshStandardMaterial color="#72543b" /></mesh>
        <mesh position={[0, 1.55, -3.5]}><boxGeometry args={[2.8, 1.55, 0.16]} /><meshStandardMaterial color="#17242a" metalness={0.25} /></mesh>
        <mesh position={[0, 1.55, -3.39]}><boxGeometry args={[2.55, 1.28, 0.03]} /><meshStandardMaterial color="#1d4850" emissive="#173e46" emissiveIntensity={0.35} /></mesh>
        {/* Upholstered seat pads, cushions, timber feet and a realistic media console. */}
        {[-1.35, 0, 1.35].map((x) => <mesh key={x} position={[x, 0.96, 1.55]} castShadow><boxGeometry args={[1.25, 0.16, 1.08]} /><meshStandardMaterial color="#3a927d" roughness={0.96} /></mesh>)}
        {[-1.45, 1.45].map((x) => <mesh key={x} position={[x, 1.22, 1.03]} rotation={[0, 0, -0.12]}><boxGeometry args={[0.72, 0.52, 0.24]} /><meshStandardMaterial color="#d4c6a8" roughness={0.98} /></mesh>)}
        {[-1.85, 1.85].flatMap((x) => [-0.45, 0.45].map(z => <mesh key={x+':'+z} position={[x, 0.22, 1.6+z]}><cylinderGeometry args={[0.07,0.07,0.42,8]} /><meshStandardMaterial color="#59412f" /></mesh>))}
        <mesh position={[0, 0.25, -3.5]}><boxGeometry args={[3.15, 0.42, 0.72]} /><meshStandardMaterial color="#5c4634" roughness={0.72} /></mesh>
        {[-1.25, 1.25].map(x => <mesh key={x} position={[x,0.48,-3.5]}><boxGeometry args={[0.08,0.06,0.58]} /><meshStandardMaterial color="#b58a55" metalness={0.45} /></mesh>)}
      </group>
      {/* Bedroom and study */}
      <group position={[4.1, 0.12, -4.1]}>
        <mesh position={[0.4, 0.42, 0.4]}><boxGeometry args={[3.2, 0.55, 4.2]} /><meshStandardMaterial color="#5b402d" /></mesh>
        <mesh position={[0.4, 0.76, 0.4]}><boxGeometry args={[3.05, 0.2, 4.05]} /><meshStandardMaterial color="#e9e4d8" /></mesh>
        <mesh position={[0.4, 0.91, -1.05]}><boxGeometry args={[2.9, 0.18, 1]} /><meshStandardMaterial color="#789b91" /></mesh>
        <mesh position={[-2.7, 0.72, -2.6]}><boxGeometry args={[1.5, 0.12, 2.5]} /><meshStandardMaterial color="#694a31" /></mesh>
        <mesh position={[-2.7, 1.2, -2.6]}><boxGeometry args={[1.45, 0.8, 0.08]} /><meshStandardMaterial color="#202e32" /></mesh>
        <mesh position={[-2.7, 1.64, -2.55]}><boxGeometry args={[1.1, 0.04, 0.7]} /><meshStandardMaterial color="#77b8c1" emissive="#245d66" emissiveIntensity={0.45} /></mesh>
        {/* Headboard, layered duvet, pillows and wardrobe detailing. */}
        <mesh position={[0.4, 1.02, -1.48]}><boxGeometry args={[3.05, 0.13, 1.35]} /><meshStandardMaterial color="#789b91" roughness={0.98} /></mesh>
        {[-0.48, 0.48].map(x => <mesh key={x} position={[0.4+x, 1.12, -2.55]} rotation={[0.08,0,0]}><boxGeometry args={[1.05,0.22,0.68]} /><meshStandardMaterial color="#f5f1e8" roughness={1} /></mesh>)}
        <mesh position={[0.4, 1.08, 2.35]}><boxGeometry args={[2.6, 2.05, 0.5]} /><meshStandardMaterial color="#74563c" roughness={0.82} /></mesh>
        {[-0.25, 1.05].map(x => <group key={x} position={[x,1.08,2.09]}><mesh><boxGeometry args={[1.18,1.82,0.06]} /><meshStandardMaterial color="#987653" roughness={0.78} /></mesh><mesh position={[0.45,0,0.07]}><sphereGeometry args={[0.055,8,8]} /><meshStandardMaterial color="#c6a66f" metalness={0.65} /></mesh></group>)}
      </group>
      {/* Kitchen with fridge, counters and cooker */}
      <group position={[-4.1, 0.12, 4.1]}>
        <mesh position={[0, 0.58, -2.9]}><boxGeometry args={[6.6, 1.05, 1.05]} /><meshStandardMaterial color="#9b8b72" /></mesh>
        <mesh position={[0, 1.15, -2.9]}><boxGeometry args={[6.7, 0.12, 1.15]} /><meshStandardMaterial color="#e6e2d8" /></mesh>
        <mesh position={[-2.6, 1.27, -2.9]}><boxGeometry args={[1.1, 0.08, 1]} /><meshStandardMaterial color="#252a2b" metalness={0.5} /></mesh>
        <mesh position={[2.7, 1.25, -2.9]}><boxGeometry args={[1.35, 2.35, 1.25]} /><meshStandardMaterial color="#d9dedb" metalness={0.16} /></mesh>
        <mesh position={[2.7, 1.4, -2.22]}><boxGeometry args={[0.9, 0.55, 0.04]} /><meshStandardMaterial color="#9bb8b5" /></mesh>
        {/* Cabinet fronts, metal pulls, inset sink, tap and four-burner hob. */}
        {[-2.3,-0.8,0.7].map(x => <group key={x} position={[x,0.6,-2.34]}><mesh><boxGeometry args={[1.28,0.78,0.045]} /><meshStandardMaterial color="#b6a184" roughness={0.72} /></mesh><mesh position={[0.48,0,0.05]}><boxGeometry args={[0.055,0.2,0.055]} /><meshStandardMaterial color="#b9b9ae" metalness={0.8} roughness={0.28} /></mesh></group>)}
        <mesh position={[0.4,1.24,-2.9]}><boxGeometry args={[1.35,0.035,0.68]} /><meshStandardMaterial color="#59686a" metalness={0.45} roughness={0.3} /></mesh>
        <mesh position={[0.4,1.34,-2.65]}><torusGeometry args={[0.16,0.035,8,20,Math.PI]} /><meshStandardMaterial color="#b8c6c2" metalness={0.75} roughness={0.25} /></mesh>
        {[-2.6,-1.8].flatMap(x => [-3.15,-2.65].map(z => <group key={x+':'+z} position={[x,1.34,z]}><mesh><cylinderGeometry args={[0.19,0.19,0.035,16]} /><meshStandardMaterial color="#202527" metalness={0.6} /></mesh><mesh position={[0,0.035,0]}><cylinderGeometry args={[0.105,0.105,0.025,12]} /><meshStandardMaterial color="#a9a9a1" metalness={0.7} /></mesh></group>))}
        <mesh position={[2.7,1.3,-2.24]}><boxGeometry args={[0.055,0.62,0.06]} /><meshStandardMaterial color="#87918f" metalness={0.75} /></mesh>
      </group>
      {/* Attached bathroom */}
      <group position={[4.1, 0.12, 4.1]}>
        <mesh position={[1.9, 0.45, -2.2]}><boxGeometry args={[2.1, 0.85, 1.8]} /><meshStandardMaterial color="#f0eee7" /></mesh>
        <mesh position={[1.9, 0.92, -2.2]}><boxGeometry args={[1.8, 0.08, 1.5]} /><meshStandardMaterial color="#d9e6e4" /></mesh>
        <mesh position={[-2.1, 0.5, 2.1]}><cylinderGeometry args={[0.55, 0.55, 0.9, 20]} /><meshStandardMaterial color="#f3f0e8" /></mesh>
        <mesh position={[-2.1, 1.0, 2.1]}><cylinderGeometry args={[0.45, 0.45, 0.12, 20]} /><meshStandardMaterial color="#d6e4e1" /></mesh>
        {/* Shower enclosure, chrome mixer, vanity basin and mirror. */}
        <mesh position={[2.4,1.35,2.35]}><boxGeometry args={[2.2,2.55,0.055]} /><meshStandardMaterial color="#b9d5d6" transparent opacity={0.2} roughness={0.12} metalness={0.12} /></mesh>
        <mesh position={[1.3,1.32,2.35]}><boxGeometry args={[0.055,2.55,0.055]} /><meshStandardMaterial color="#a9b8b6" metalness={0.75} roughness={0.24} /></mesh>
        <mesh position={[-2.1,1.62,1.35]}><boxGeometry args={[1.25,0.95,0.08]} /><meshStandardMaterial color="#8faeb0" metalness={0.32} roughness={0.2} /></mesh>
        <mesh position={[-2.1,0.92,1.95]}><boxGeometry args={[1.65,0.14,0.75]} /><meshStandardMaterial color="#f0eee7" roughness={0.28} /></mesh>
        <mesh position={[-2.1,1.15,1.95]}><cylinderGeometry args={[0.27,0.32,0.32,18]} /><meshStandardMaterial color="#e8e8df" roughness={0.2} /></mesh>
      </group>
      {/* Overhead spotlights */}
      {[-5.5, -2.5, 2.5, 5.5].flatMap((x) => [-5.5, 5.5].map((z) => (
        <group key={x + ':' + z} position={[x, 3.15, z]}>
          <mesh><cylinderGeometry args={[0.28, 0.38, 0.12, 16]} /><meshStandardMaterial color="#f2e5c7" emissive="#f7dfac" emissiveIntensity={0.3} /></mesh>
          <pointLight position={[0, -0.25, 0]} intensity={0.38} color="#ffe8bd" distance={8} />
        </group>
      )))}
      {/* Front steps and tiled garden path */}
      <mesh position={[0, -0.05, 9.3]}><boxGeometry args={[3.2, 0.24, 1.3]} /><meshStandardMaterial color={trim} /></mesh>
      <mesh position={[0, -0.2, 10.1]}><boxGeometry args={[3.8, 0.18, 1.3]} /><meshStandardMaterial color="#b7b4a8" /></mesh>
      <mesh position={[0, -0.28, 12.4]}><boxGeometry args={[2.8, 0.12, 4.2]} /><meshStandardMaterial color="#c8c7bd" /></mesh>
      {/* Carport with a parked starter car */}
      <mesh position={[12.3, 2.5, 4.2]}><boxGeometry args={[6.5, 0.22, 8]} /><meshStandardMaterial color="#536a60" /></mesh>
      {[9.3, 15.3].map((x) => [-0.1, 8.2].map((z) => <mesh key={x + ':' + z} position={[x, 1.2, z]}><cylinderGeometry args={[0.12, 0.12, 2.4, 8]} /><meshStandardMaterial color="#d2c9b1" /></mesh>))}
      <group position={[12.3, 0.12, 4.5]}>
        <mesh position={[0, 0.75, 0]}><boxGeometry args={[2.7, 1.05, 4.8]} /><meshStandardMaterial color="#d8dfd8" metalness={0.28} roughness={0.42} /></mesh>
        <mesh position={[0, 1.35, -0.2]}><boxGeometry args={[2.25, 0.65, 2.4]} /><meshStandardMaterial color="#35525a" metalness={0.35} roughness={0.25} /></mesh>
        {[-1.05, 1.05].flatMap((x) => [-1.55, 1.55].map((z) => <mesh key={x + ':' + z} position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.18, 16]} /><meshStandardMaterial color="#171b1d" /></mesh>))}
      </group>
      {/* Landscaped private yard: layered lawn, planted borders, stepping stones and a low boundary hedge. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]} receiveShadow>
        <circleGeometry args={[18.2, 72]} />
        <meshStandardMaterial color="#416b42" roughness={1} />
      </mesh>
      {Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2
        const x = Math.cos(angle) * 16.4
        const z = Math.sin(angle) * 16.4
        return (
          <group key={`yard-border-${index}`} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <mesh position={[0, 0.28, 0]} castShadow><boxGeometry args={[1.55, 0.56, 0.72]} /><meshStandardMaterial color={index % 2 ? '#355f3b' : '#477447'} roughness={1} /></mesh>
            <mesh position={[0.25, 0.56, 0]}><sphereGeometry args={[0.25, 8, 7]} /><meshStandardMaterial color={index % 3 ? '#527f4a' : '#6b8c4c'} roughness={1} /></mesh>
          </group>
        )
      })}
      {[-2.2, -0.75, 0.75, 2.2].map((x, index) => (
        <mesh key={`path-stone-${index}`} position={[x, -0.095, 11.1]} receiveShadow>
          <boxGeometry args={[0.9, 0.08, 0.78]} />
          <meshStandardMaterial color="#aaa99c" roughness={0.96} />
        </mesh>
      ))}
      {[-10, -7.5, 7.5, 10].map((x, index) => (
        <group key={`flower-bed-${index}`} position={[x, 0, index < 2 ? 6.5 : -6.5]}>
          <mesh position={[0, 0.12, 0]}><boxGeometry args={[2.8, 0.22, 1.05]} /><meshStandardMaterial color="#493c2d" roughness={1} /></mesh>
          {[-0.8, 0, 0.8].map((offset, flower) => (
            <group key={offset} position={[offset, 0.25, 0]}>
              <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.035, 0.045, 0.6, 6]} /><meshStandardMaterial color="#477343" /></mesh>
              <mesh position={[0, 0.62, 0]}><sphereGeometry args={[0.18, 8, 7]} /><meshStandardMaterial color={['#d7a4a0', '#e5c77c', '#c78e9c'][(flower + index) % 3]} roughness={0.8} /></mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Small garden trees and hedges */}
      {[-13, 13].flatMap((x) => [-11, 11].map((z) => (
        <group key={x + ':' + z} position={[x, 0, z]}>
          <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.18, 0.25, 2.2, 8]} /><meshStandardMaterial color="#65452e" /></mesh>
          <mesh position={[0, 2.5, 0]}><sphereGeometry args={[1.2, 12, 10]} /><meshStandardMaterial color="#315b3e" roughness={1} /></mesh>
        </group>
      )))}
      <FloorText text="LIVING ROOM" color="#f5f0e3" position={[-4.1, 0.11, -6.9]} width={3.2} height={0.65} />
      <FloorText text="BEDROOM / STUDY" color="#f5f0e3" position={[4.1, 0.11, -6.9]} width={3.5} height={0.65} />
      <FloorText text="KITCHEN" color="#f5f0e3" position={[-4.1, 0.11, 6.9]} width={2.2} height={0.55} />
      <FloorText text="BATHROOM" color="#f5f0e3" position={[4.1, 0.11, 6.9]} width={2.4} height={0.55} />
    </>
  )
}

function hashString(value: string) {
  let hash = 7
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return hash
}

function shade(hex: string, factor: number) {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)))
  return `#${((1 << 24) | (channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).slice(1)}`
}

const PLANK_KINDS = new Set<InteriorKind>(['hotel', 'bungalow', 'estate', 'apartment', 'house', 'cafe', 'village', 'farm', 'club', 'clubhouse'])

function useFloorTexture(floor: string, kind: InteriorKind, seed: number) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) return null
    let state = seed || 1
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 4294967296
    }
    context.fillStyle = floor
    context.fillRect(0, 0, 512, 512)
    if (PLANK_KINDS.has(kind)) {
      const rows = 10
      const rowHeight = 512 / rows
      for (let row = 0; row < rows; row += 1) {
        let x = -random() * 160
        while (x < 512) {
          const length = 120 + random() * 150
          context.fillStyle = shade(floor, 0.88 + random() * 0.22)
          context.fillRect(x, row * rowHeight, length, rowHeight)
          context.strokeStyle = 'rgba(0,0,0,0.22)'
          context.lineWidth = 2
          context.strokeRect(x, row * rowHeight, length, rowHeight)
          x += length
        }
      }
    } else {
      const tiles = 8
      const size = 512 / tiles
      for (let row = 0; row < tiles; row += 1) {
        for (let column = 0; column < tiles; column += 1) {
          context.fillStyle = shade(floor, (row + column) % 2 === 0 ? 1.06 : 0.92 + random() * 0.04)
          context.fillRect(column * size, row * size, size, size)
        }
      }
      context.strokeStyle = 'rgba(0,0,0,0.25)'
      context.lineWidth = 2
      for (let line = 0; line <= tiles; line += 1) {
        context.beginPath()
        context.moveTo(line * size, 0)
        context.lineTo(line * size, 512)
        context.moveTo(0, line * size)
        context.lineTo(512, line * size)
        context.stroke()
      }
    }
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    return texture
  }, [floor, kind, seed])
}

function FloorText({ text, color, position, width, height }: { text: string; color: string; position: [number, number, number]; width: number; height: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (!context) return null
    context.clearRect(0, 0, 256, 96)
    context.fillStyle = color
    context.font = '800 54px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, 128, 50)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [color, text])
  if (!texture) return null
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}

function ActionMarker({ x, z, color }: { x: number; z: number; color: string }) {
  const gem = useRef<Group>(null!)
  useFrame((state) => {
    if (!gem.current) return
    gem.current.position.y = 1.9 + Math.sin(state.clock.elapsedTime * 2.2) * 0.12
    gem.current.rotation.y = state.clock.elapsedTime * 1.4
  })
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <ringGeometry args={[0.7, 0.95, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
      <group ref={gem}>
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#ffe1a1" emissive="#bd8244" emissiveIntensity={1.4} />
        </mesh>
      </group>
    </group>
  )
}

function FloorLamp({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.3, 0.34, 0.12, 12]} /><meshStandardMaterial color="#3b3a37" roughness={0.7} /></mesh>
      <mesh position={[0, 1.35, 0]}><cylinderGeometry args={[0.05, 0.05, 2.6, 8]} /><meshStandardMaterial color="#4b4a45" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, 2.78, 0]}><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} roughness={0.4} /></mesh>
    </group>
  )
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.36, 0.28, 0.68, 10]} /><meshStandardMaterial color="#8a5a3c" roughness={0.9} /></mesh>
      <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.62, 12, 10]} /><meshStandardMaterial color="#4f6b43" roughness={0.95} /></mesh>
      <mesh position={[0.28, 1.55, 0.08]}><sphereGeometry args={[0.38, 10, 8]} /><meshStandardMaterial color="#5f7d4e" roughness={0.95} /></mesh>
    </group>
  )
}

function WallArt({ position, rotation = [0, 0, 0], width = 1.8, height = 1.2, color }: { position: [number, number, number]; rotation?: [number, number, number]; width?: number; height?: number; color: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh><boxGeometry args={[width + 0.18, height + 0.18, 0.08]} /><meshStandardMaterial color="#3d352d" roughness={0.7} /></mesh>
      <mesh position={[0, 0, 0.05]}><boxGeometry args={[width, height, 0.04]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
      <mesh position={[width * 0.12, -height * 0.1, 0.075]}><boxGeometry args={[width * 0.4, height * 0.4, 0.02]} /><meshStandardMaterial color={shade(color, 1.35)} roughness={0.8} /></mesh>
    </group>
  )
}

const SKINS = ['#6b4430', '#87583f', '#80543e', '#925d43', '#5a3a2a']
const OUTFITS = ['#8c4d3f', '#d1a05b', '#456b72', '#65764d', '#6c587e', '#c5c0b4', '#3f5f7a', '#a0623d']
const HAIRS = ['#211817', '#30221b', '#1d1917', '#2b201b']
const IDLES: IdleStyle[] = ['talk', 'stand', 'wave', 'stand']
const CUSTOMER_SPOTS: [number, number][] = [[-6.0, 0.6], [6.0, 0.2], [-4.4, -1.6], [4.6, 2.0]]

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length]
}

function InteriorPeople({ id, kind }: { id: string; kind: InteriorKind }) {
  const seed = hashString(id)
  const customers = ['market', 'club', 'cafe', 'airport', 'event-center', 'hospital', 'bank', 'court'].includes(kind) ? 3 : 2
  return (
    <>
      {Array.from({ length: customers }, (_, index) => {
        const [x, z] = CUSTOMER_SPOTS[(index + (seed % 2)) % CUSTOMER_SPOTS.length]
        const personSeed = seed + index * 97
        return (
          <group key={`customer-${index}`} position={[x, 0, z]} rotation={[0, Math.atan2(-x * 0.6, -3 - z), 0]}>
            <HumanoidModel
              skinTone={pick(SKINS, personSeed)}
              hairColor={pick(HAIRS, personSeed >> 2)}
              clothing={pick(OUTFITS, personSeed >> 1)}
              accentColor="#d2b17a"
              gender={personSeed % 2 === 0 ? 'male' : 'female'}
              idle={pick(IDLES, personSeed >> 3)}
              phase={index * 1.7 + (seed % 7)}
            />
          </group>
        )
      })}
    </>
  )
}

export function InteriorScene({ interior, onApartmentMove, onApartmentAction, apartmentTargetRef }: InteriorSceneProps) {
  if (interior.id === 'marina-apartments') return <StarterApartmentLayout onMove={onApartmentMove} onAction={onApartmentAction} targetRef={apartmentTargetRef} />
  const palette = ROOM_PALETTES[interior.kind]
  const seed = hashString(interior.id)
  const floorTexture = useFloorTexture(palette.floor, interior.kind, seed)
  const baseboard = shade(palette.wall, 0.55)
  const showRug = interior.kind !== 'garage' && interior.kind !== 'port' && interior.kind !== 'stadium'
  const artColors = ['#7b5e45', '#4f6b73', '#8a6a3c', '#6a4f68']

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 24, 64]} />
      <ambientLight intensity={0.95} color="#e5dfd1" />
      <hemisphereLight args={[palette.light, '#51453b', 0.95]} />
      <directionalLight position={[4, 13, 7]} intensity={1.05} color={palette.light} />
      <pointLight position={[-5, 3.6, -3]} intensity={0.55} color={palette.light} distance={18} />
      <pointLight position={[5, 3.6, 2]} intensity={0.4} color={palette.light} distance={16} />

      {/* Floor */}
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <boxGeometry args={[16, 0.3, 16]} />
        <meshStandardMaterial color={floorTexture ? '#ffffff' : palette.floor} map={floorTexture ?? undefined} roughness={0.88} />
      </mesh>
      {showRug && (
        <mesh position={[0, 0.012, 1.0]} receiveShadow>
          <boxGeometry args={[6.4, 0.025, 4.2]} />
          <meshStandardMaterial color={shade(palette.trim, 0.62)} roughness={0.96} />
        </mesh>
      )}

      {/* Walls: full back and side walls, a low front wall so the camera can see in from the street side. */}
      <mesh position={[0, 2.5, -7.92]} castShadow receiveShadow>
        <boxGeometry args={[16, 5, 0.28]} />
        <meshStandardMaterial color={palette.wall} roughness={0.89} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`side-${side}`}>
          <mesh position={[side * 7.92, 2.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.28, 5, 16]} />
            <meshStandardMaterial color={palette.wall} roughness={0.89} />
          </mesh>
          <mesh position={[side * 7.74, 0.12, 0]}>
            <boxGeometry args={[0.1, 0.24, 15.6]} />
            <meshStandardMaterial color={baseboard} roughness={0.8} />
          </mesh>
          {[-3.8, 2.4].map((z) => (
            <group key={`window-${z}`} position={[side * 7.74, 2.75, z]}>
              <mesh><boxGeometry args={[0.1, 1.9, 2.6]} /><meshStandardMaterial color={baseboard} roughness={0.7} /></mesh>
              <mesh position={[-side * 0.04, 0, 0]}>
                <boxGeometry args={[0.08, 1.6, 2.3]} />
                <meshStandardMaterial color="#cfe3ea" emissive="#a9cfdb" emissiveIntensity={0.55} roughness={0.2} metalness={0.1} />
              </mesh>
              <mesh position={[-side * 0.06, 0, 0]}><boxGeometry args={[0.06, 1.6, 0.08]} /><meshStandardMaterial color={baseboard} /></mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.12, -7.74]}>
        <boxGeometry args={[15.6, 0.24, 0.1]} />
        <meshStandardMaterial color={baseboard} roughness={0.8} />
      </mesh>
      {[-4.8, 4.8].map((side) => (
        <mesh key={`entry-wall-${side}`} position={[side, 0.5, 7.92]} castShadow receiveShadow>
          <boxGeometry args={[6.4, 1, 0.28]} />
          <meshStandardMaterial color={palette.wall} roughness={0.89} />
        </mesh>
      ))}
      <mesh position={[0, 4.72, 7.92]}>
        <boxGeometry args={[16, 0.5, 0.28]} />
        <meshStandardMaterial color={palette.trim} roughness={0.7} />
      </mesh>

      {/* Dressing */}
      <WallArt position={[-5.9, 3.55, -7.72]} color={artColors[seed % artColors.length]} />
      <WallArt position={[5.9, 3.55, -7.72]} color={artColors[(seed >> 2) % artColors.length]} />
      <FloorLamp position={[-6.9, 0, -6.9]} color={palette.light} />
      <FloorLamp position={[6.9, 0, -6.9]} color={palette.light} />
      <Plant position={[-6.8, 0, 5.8]} />
      <Plant position={[6.8, 0, 5.6]} scale={0.88} />

      <RoomSign name={interior.name} accent={palette.trim} />
      <DoorFrame accent={palette.trim} />
      <mesh position={[0, 0.03, 6.9]}>
        <boxGeometry args={[2.7, 0.05, 1.5]} />
        <meshStandardMaterial color={shade(palette.trim, 0.7)} roughness={0.95} />
      </mesh>
      <FloorText text="EXIT" color="#f4ead8" position={[0, 0.07, 6.9]} width={1.6} height={0.6} />
      <mesh position={[0, 0.04, 6.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.76, 28]} />
        <meshBasicMaterial color={palette.trim} transparent opacity={0.78} />
      </mesh>

      <ActionMarker x={interior.actionPoint.x} z={interior.actionPoint.z} color={palette.trim} />
      <InteriorPeople id={interior.id} kind={interior.kind} />
      <RoomFurniture kind={interior.kind} palette={palette} />
    </>
  )
}
