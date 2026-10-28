'use client'

import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { InteriorDefinition, InteriorKind } from './game-data'

type InteriorSceneProps = {
  interior: InteriorDefinition
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
      <mesh position={[0, 2, 0.06]}>
        <boxGeometry args={[2.52, 3.9, 0.06]} />
        <meshStandardMaterial color="#66787a" metalness={0.24} roughness={0.28} transparent opacity={0.34} />
      </mesh>
    </group>
  )
}

function ServiceWorker({ color, position = [0, 0, -5.5] }: { color: string; position?: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.29, 0.58, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.91, 0]} castShadow>
        <sphereGeometry args={[0.21, 14, 12]} />
        <meshStandardMaterial color="#8d5c43" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.04, -0.035]}>
        <sphereGeometry args={[0.21, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#211b18" roughness={0.96} />
      </mesh>
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

export function InteriorScene({ interior }: InteriorSceneProps) {
  const palette = ROOM_PALETTES[interior.kind]

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 18, 52]} />
      <ambientLight intensity={0.86} color="#e5dfd1" />
      <hemisphereLight args={[palette.light, '#51453b', 0.92]} />
      <directionalLight position={[4, 13, 7]} intensity={1.1} color={palette.light} castShadow />
      <pointLight position={[-5, 3.6, -3]} intensity={0.5} color={palette.light} distance={18} />
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <boxGeometry args={[16, 0.3, 16]} />
        <meshStandardMaterial color={palette.floor} roughness={0.88} />
      </mesh>
      <mesh position={[0, 2.5, -7.92]} castShadow receiveShadow>
        <boxGeometry args={[16, 5, 0.28]} />
        <meshStandardMaterial color={palette.wall} roughness={0.89} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`side-wall-${side}`} position={[side * 7.92, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 5, 16]} />
          <meshStandardMaterial color={palette.wall} roughness={0.89} />
        </mesh>
      ))}
      {[-4.8, 4.8].map((side) => (
        <mesh key={`entry-wall-${side}`} position={[side, 2.35, 7.92]} castShadow receiveShadow>
          <boxGeometry args={[6.4, 4.7, 0.28]} />
          <meshStandardMaterial color={palette.wall} roughness={0.89} />
        </mesh>
      ))}
      <mesh position={[0, 4.98, 0]} receiveShadow>
        <boxGeometry args={[16, 0.18, 16]} />
        <meshStandardMaterial color={palette.trim} roughness={0.8} side={2} />
      </mesh>
      <RoomSign name={interior.name} accent={palette.trim} />
      <DoorFrame accent={palette.trim} />
      <mesh position={[0, 0.02, 6.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.76, 28]} />
        <meshBasicMaterial color={palette.trim} transparent opacity={0.78} />
      </mesh>
      <RoomFurniture kind={interior.kind} palette={palette} />
    </>
  )
}
