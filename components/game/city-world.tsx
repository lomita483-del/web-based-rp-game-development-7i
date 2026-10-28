'use client'

import { Html, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type MutableRefObject } from 'react'
import { MathUtils, type Group, type PerspectiveCamera, Vector3 } from 'three'
import { CITY_CHARACTERS, WORLD_LOCATIONS, type LocationId, type RemotePlayer } from './game-data'

type PlayerPosition = { x: number; z: number }

type CityWorldProps = {
  keysRef: MutableRefObject<Set<string>>
  onPlayerPosition: (position: PlayerPosition) => void
  inVehicle: boolean
  paused: boolean
  waypoint: LocationId | null
  spawnPosition: PlayerPosition
  remotePlayers: RemotePlayer[]
}

const BUILDINGS = [
  { x: -8, z: -9, width: 6, depth: 6, height: 9, color: '#30453b', accent: '#e9c477' },
  { x: 8, z: -9, width: 7, depth: 6, height: 12, color: '#284139', accent: '#c9df85' },
  { x: -18, z: -17, width: 11, depth: 10, height: 15, color: '#243c37', accent: '#c9df85' },
  { x: 16, z: -17, width: 12, depth: 11, height: 22, color: '#1e3635', accent: '#ffd286' },
  { x: -42, z: -17, width: 13, depth: 11, height: 12, color: '#263934', accent: '#ffcc80' },
  { x: 42, z: -18, width: 13, depth: 10, height: 17, color: '#263d3b', accent: '#b5d889' },
  { x: -18, z: 17, width: 13, depth: 10, height: 21, color: '#2b3531', accent: '#f6b269' },
  { x: 17, z: 17, width: 12, depth: 10, height: 12, color: '#21423a', accent: '#d4e690' },
  { x: -42, z: 17, width: 12, depth: 10, height: 14, color: '#263a38', accent: '#f1bd75' },
  { x: 42, z: 17, width: 13, depth: 10, height: 20, color: '#1d3735', accent: '#ffce83' },
  { x: -18, z: -45, width: 14, depth: 12, height: 17, color: '#293a37', accent: '#c7dc8c' },
  { x: 17, z: -45, width: 13, depth: 12, height: 13, color: '#223d39', accent: '#f5b572' },
  { x: -18, z: 44, width: 12, depth: 11, height: 13, color: '#263b36', accent: '#f4c979' },
  { x: 18, z: 44, width: 13, depth: 11, height: 18, color: '#203a38', accent: '#c9dc88' },
  { x: -43, z: -45, width: 12, depth: 12, height: 20, color: '#213634', accent: '#edbd79' },
  { x: 43, z: -45, width: 12, depth: 12, height: 14, color: '#2b3935', accent: '#c7d887' },
]

const PARKED_CARS = [
  { x: -7, z: -7, color: '#b75c49', rotation: Math.PI / 2 },
  { x: 8, z: 7, color: '#d8aa62', rotation: -Math.PI / 2 },
  { x: 31, z: -4, color: '#588b7a', rotation: Math.PI / 2 },
  { x: -31, z: 7, color: '#7d8295', rotation: -Math.PI / 2 },
  { x: 8, z: 31, color: '#bf6d4d', rotation: 0 },
]

function Building({
  x,
  z,
  width,
  depth,
  height,
  color,
  accent,
}: (typeof BUILDINGS)[number]) {
  const floors = Math.max(3, Math.floor(height / 3))
  const windowsPerFloor = Math.max(3, Math.floor(width / 2.5))

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      <mesh position={[0, height + 0.18, 0]} castShadow>
        <boxGeometry args={[width + 0.5, 0.36, depth + 0.5]} />
        <meshStandardMaterial color="#172521" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, depth / 2 + 0.08]}>
        <boxGeometry args={[width * 0.32, 1.5, 0.12]} />
        <meshStandardMaterial color="#192b28" roughness={0.55} />
      </mesh>
      {Array.from({ length: floors }, (_, floor) =>
        Array.from({ length: windowsPerFloor }, (_, column) => {
          const windowX = (column - (windowsPerFloor - 1) / 2) * (width / (windowsPerFloor + 0.5))
          const windowY = 1.8 + floor * 2.65
          const lit = (column + floor + Math.round(x + z)) % 4 !== 0
          return (
            <mesh key={`front-${floor}-${column}`} position={[windowX, windowY, depth / 2 + 0.07]}>
              <boxGeometry args={[0.7, 0.9, 0.09]} />
              <meshStandardMaterial
                color={lit ? '#d5bc7a' : '#253b35'}
                emissive={lit ? accent : '#000000'}
                emissiveIntensity={lit ? 0.32 : 0}
                roughness={0.34}
              />
            </mesh>
          )
        }),
      )}
    </group>
  )
}

function RoadGrid() {
  const roadOffsets = [-42, -14, 14, 42]
  const dashes = Array.from({ length: 13 }, (_, index) => -54 + index * 9)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#243831" roughness={1} />
      </mesh>
      {roadOffsets.map((z) => (
        <group key={`road-x-${z}`}>
          <mesh position={[0, -0.12, z]} receiveShadow>
            <boxGeometry args={[128, 0.14, 8]} />
            <meshStandardMaterial color="#28302d" roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.035, z - 4.8]}>
            <boxGeometry args={[128, 0.08, 1.25]} />
            <meshStandardMaterial color="#66705d" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.035, z + 4.8]}>
            <boxGeometry args={[128, 0.08, 1.25]} />
            <meshStandardMaterial color="#66705d" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {roadOffsets.map((x) => (
        <group key={`road-z-${x}`}>
          <mesh position={[x, -0.115, 0]} receiveShadow>
            <boxGeometry args={[8, 0.14, 128]} />
            <meshStandardMaterial color="#28302d" roughness={0.96} />
          </mesh>
          <mesh position={[x - 4.8, -0.03, 0]}>
            <boxGeometry args={[1.25, 0.08, 128]} />
            <meshStandardMaterial color="#66705d" roughness={0.95} />
          </mesh>
          <mesh position={[x + 4.8, -0.03, 0]}>
            <boxGeometry args={[1.25, 0.08, 128]} />
            <meshStandardMaterial color="#66705d" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {dashes.map((position) => (
        <group key={`lane-mark-${position}`}>
          <mesh position={[position, -0.035, 0]}>
            <boxGeometry args={[4.2, 0.05, 0.12]} />
            <meshBasicMaterial color="#d1b778" />
          </mesh>
          <mesh position={[0, -0.035, position]}>
            <boxGeometry args={[0.12, 0.05, 4.2]} />
            <meshBasicMaterial color="#d1b778" />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 61]} receiveShadow>
        <planeGeometry args={[150, 28]} />
        <meshStandardMaterial color="#163a3d" roughness={0.28} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.02, 47]}>
        <boxGeometry args={[26, 0.18, 0.8]} />
        <meshStandardMaterial color="#a89167" roughness={0.88} />
      </mesh>
    </group>
  )
}

function PalmTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.28, 2.8, 7]} />
        <meshStandardMaterial color="#77533c" roughness={1} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.8, 2.68 + Math.sin(index * 1.7) * 0.1, Math.sin(angle) * 0.8]}
            rotation={[0.12, -angle, -0.5]}
            castShadow
          >
            <coneGeometry args={[0.34, 1.8, 5]} />
            <meshStandardMaterial color={index % 2 ? '#456d4c' : '#568354'} roughness={0.92} />
          </mesh>
        )
      })}
      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.24, 8, 8]} />
        <meshStandardMaterial color="#c08a4f" roughness={0.9} />
      </mesh>
    </group>
  )
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 4, 6]} />
        <meshStandardMaterial color="#38423d" metalness={0.55} roughness={0.44} />
      </mesh>
      <mesh position={[0.35, 3.92, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.8, 0.08, 0.1]} />
        <meshStandardMaterial color="#42453b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.65, 3.84, 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#ffe2a3" emissive="#ffcf74" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0.65, 3.72, 0]} color="#ffc775" intensity={0.58} distance={8} decay={2} />
    </group>
  )
}

function MarketStall() {
  return (
    <group position={[23, 0, -22]}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[4.4, 1.4, 2.8]} />
        <meshStandardMaterial color="#704838" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.72, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[5.2, 0.2, 3.6]} />
        <meshStandardMaterial color="#d19d50" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <boxGeometry args={[5.2, 0.08, 0.42]} />
        <meshStandardMaterial color="#a65340" roughness={0.8} />
      </mesh>
      <mesh position={[0.7, 2.2, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color="#ffe0a0" emissive="#f4ba67" emissiveIntensity={1.35} />
      </mesh>
      <pointLight position={[0.7, 2.4, 0]} color="#ffc578" intensity={0.65} distance={7} />
    </group>
  )
}

function ClubFacade() {
  return (
    <group position={[-22, 0, 22]}>
      <mesh position={[0, 2.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.5, 5.4, 6.4]} />
        <meshStandardMaterial color="#292b35" roughness={0.75} />
      </mesh>
      <mesh position={[0, 5.55, 0]}>
        <boxGeometry args={[9, 0.3, 6.8]} />
        <meshStandardMaterial color="#d26c56" emissive="#d26c56" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 3.9, 3.25]}>
        <boxGeometry args={[4.8, 1.15, 0.14]} />
        <meshStandardMaterial color="#f0bd65" emissive="#a8603d" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-3.1, 2.8, 3.28]}>
        <boxGeometry args={[0.7, 2.3, 0.16]} />
        <meshStandardMaterial color="#d87b55" emissive="#ad533c" emissiveIntensity={0.45} />
      </mesh>
      <pointLight position={[0, 4, 5]} color="#e78458" intensity={1.1} distance={12} />
    </group>
  )
}

function GarageFacade() {
  return (
    <group position={[23, 0, 18]}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[7.5, 3.6, 6]} />
        <meshStandardMaterial color="#303a36" roughness={0.94} />
      </mesh>
      <mesh position={[0, 3.72, 0]}>
        <boxGeometry args={[8, 0.22, 6.4]} />
        <meshStandardMaterial color="#db9b52" emissive="#b67d45" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 1.45, 3.1]}>
        <boxGeometry args={[3.7, 2.3, 0.12]} />
        <meshStandardMaterial color="#192521" roughness={0.7} />
      </mesh>
      <pointLight position={[0, 3.8, 4.2]} color="#ffd18c" intensity={0.7} distance={9} />
    </group>
  )
}

function CafeFacade() {
  return (
    <group position={[1, 0, 22]}>
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[7.6, 3.5, 6.4]} />
        <meshStandardMaterial color="#35423a" roughness={0.88} />
      </mesh>
      <mesh position={[0, 3.62, 0]}>
        <boxGeometry args={[8, 0.22, 6.7]} />
        <meshStandardMaterial color="#88a963" roughness={0.75} />
      </mesh>
      <mesh position={[0, 2.3, 3.27]}>
        <boxGeometry args={[3.8, 1, 0.12]} />
        <meshStandardMaterial color="#f4c575" emissive="#b97b4f" emissiveIntensity={0.48} />
      </mesh>
      <pointLight position={[0, 2.2, 4.2]} color="#ffd18b" intensity={0.55} distance={8} />
    </group>
  )
}

function HotelFacade() {
  return (
    <group position={[-23, 0, -22]}>
      <mesh position={[0, 4.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.8, 8.8, 6.8]} />
        <meshStandardMaterial color="#263b37" roughness={0.88} />
      </mesh>
      <mesh position={[0, 8.95, 0]}>
        <boxGeometry args={[9.2, 0.24, 7.2]} />
        <meshStandardMaterial color="#d0ae6d" roughness={0.82} />
      </mesh>
      <mesh position={[0, 2.1, 3.48]}>
        <boxGeometry args={[2.3, 3.2, 0.16]} />
        <meshStandardMaterial color="#172822" roughness={0.7} />
      </mesh>
      <pointLight position={[0, 4.2, 4.1]} color="#f2c575" intensity={0.55} distance={9} />
    </group>
  )
}

function LandmarkMarkers({ waypoint }: { waypoint: LocationId | null }) {
  const target = WORLD_LOCATIONS.find((location) => location.id === waypoint)

  return (
    <group>
      {WORLD_LOCATIONS.map((location) => (
        <group key={location.id} position={[location.x, 0, location.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.62, 0.78, 32]} />
            <meshBasicMaterial color={location.id === waypoint ? '#e7ca74' : '#98c879'} transparent opacity={0.72} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <octahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial
              color={location.id === waypoint ? '#f2cc72' : '#a9d184'}
              emissive={location.id === waypoint ? '#b98446' : '#427254'}
              emissiveIntensity={0.9}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      {target && (
        <group position={[target.x, 0, target.z]}>
          <mesh position={[0, 2.25, 0]}>
            <cylinderGeometry args={[0.09, 0.48, 4.3, 12, 1, true]} />
            <meshBasicMaterial color="#f0c96f" transparent opacity={0.17} depthWrite={false} />
          </mesh>
          <mesh position={[0, 4.55, 0]}>
            <octahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color="#ffe39a" emissive="#d99c50" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, 2.4, 0]} color="#f3bd60" intensity={0.85} distance={8} />
        </group>
      )}
    </group>
  )
}

function CharacterActor({ character }: { character: (typeof CITY_CHARACTERS)[number] }) {
  const characterRef = useRef<Group>(null!)

  useFrame((state) => {
    if (!characterRef.current) return
    characterRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + character.x) * 0.025
  })

  return (
    <group ref={characterRef} position={[character.x, 0, character.z]}>
      <mesh position={[0, 0.92, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.34, 0.95, 8]} />
        <meshStandardMaterial color={character.color} roughness={0.84} />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <sphereGeometry args={[0.27, 12, 10]} />
        <meshStandardMaterial color="#7e5a47" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.81, -0.02]}>
        <sphereGeometry args={[0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#241f1b" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.36, 0.02]}>
        <boxGeometry args={[0.38, 0.08, 0.42]} />
        <meshStandardMaterial color="#d7bd83" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.42, 0.48, 24]} />
        <meshBasicMaterial color={character.color} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function AvatarModel() {
  return (
    <group>
      <mesh position={[0, 0.84, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.36, 0.88, 9]} />
        <meshStandardMaterial color="#d19a68" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.52, 0]} castShadow>
        <sphereGeometry args={[0.28, 14, 12]} />
        <meshStandardMaterial color="#7c513c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.74, -0.02]}>
        <sphereGeometry args={[0.29, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1f201b" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.32, -0.08]}>
        <boxGeometry args={[0.42, 0.28, 0.24]} />
        <meshStandardMaterial color="#bd744e" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.06, -0.28]}>
        <boxGeometry args={[0.45, 0.52, 0.12]} />
        <meshStandardMaterial color="#293a33" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.43, 32]} />
        <meshBasicMaterial color="#b5d77b" transparent opacity={0.55} />
      </mesh>
    </group>
  )
}

function ScooterModel() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.86, 0.5, 1.5]} />
        <meshStandardMaterial color="#d5964f" metalness={0.28} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.97, -0.24]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.52, 0.36, 0.62]} />
        <meshStandardMaterial color="#273b35" roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.2, -0.68]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#ffe3aa" emissive="#ffcc76" emissiveIntensity={1.4} />
      </mesh>
      {[-0.5, 0.5].map((x) =>
        [-0.48, 0.48].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.16, 12]} />
            <meshStandardMaterial color="#121513" roughness={0.95} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.94, 0.54]}>
        <boxGeometry args={[0.74, 0.09, 0.08]} />
        <meshStandardMaterial color="#323a34" metalness={0.5} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 1.14, -0.8]} color="#f2ca84" intensity={0.4} distance={6} />
    </group>
  )
}

function PlayerController({
  keysRef,
  onPlayerPosition,
  inVehicle,
  paused,
  spawnPosition,
}: Pick<CityWorldProps, 'keysRef' | 'onPlayerPosition' | 'inVehicle' | 'paused' | 'spawnPosition'>) {
  const playerRef = useRef<Group>(null!)
  const { camera, size } = useThree()
  const cameraTarget = useRef(new Vector3())
  const cameraLookAt = useRef(new Vector3())
  const movement = useRef(new Vector3())
  const publishTimer = useRef(0)
  const onPositionRef = useRef(onPlayerPosition)
  onPositionRef.current = onPlayerPosition

  useEffect(() => {
    playerRef.current?.position.set(spawnPosition.x, 0, spawnPosition.z)
    publishTimer.current = 0
    onPositionRef.current(spawnPosition)
  }, [spawnPosition.x, spawnPosition.z])

  useFrame((_, delta) => {
    if (!playerRef.current) return
    const step = Math.min(delta, 0.05)
    const keys = keysRef.current
    const direction = movement.current.set(0, 0, 0)

    if (!paused) {
      if (keys.has('w') || keys.has('arrowup')) direction.z -= 1
      if (keys.has('s') || keys.has('arrowdown')) direction.z += 1
      if (keys.has('a') || keys.has('arrowleft')) direction.x -= 1
      if (keys.has('d') || keys.has('arrowright')) direction.x += 1

      if (direction.lengthSq() > 0) {
        direction.normalize()
        const speed = inVehicle ? 10 : 5.2
        playerRef.current.position.x += direction.x * speed * step
        playerRef.current.position.z += direction.z * speed * step
        playerRef.current.rotation.y = MathUtils.damp(
          playerRef.current.rotation.y,
          Math.atan2(direction.x, direction.z),
          10,
          step,
        )
      }
    }

    playerRef.current.position.x = MathUtils.clamp(playerRef.current.position.x, -58, 58)
    playerRef.current.position.z = MathUtils.clamp(playerRef.current.position.z, -58, 53)

    const { x, z } = playerRef.current.position
    const tallViewport = size.height > size.width * 1.15
    const perspectiveCamera = camera as PerspectiveCamera
    const nextFov = tallViewport ? 62 : 45
    if (perspectiveCamera.fov !== nextFov) {
      perspectiveCamera.fov = nextFov
      perspectiveCamera.updateProjectionMatrix()
    }
    cameraTarget.current.set(
      x,
      tallViewport ? (inVehicle ? 18 : 20) : (inVehicle ? 8.5 : 9.5),
      z + (tallViewport ? 27 : 15),
    )
    cameraLookAt.current.set(x, inVehicle ? 1.8 : 2, z - 7)
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-step * 3.8))
    camera.lookAt(cameraLookAt.current)

    publishTimer.current += step
    if (publishTimer.current > 0.16) {
      publishTimer.current = 0
      onPositionRef.current({ x, z })
    }
  })

  return (
    <group ref={playerRef} position={[spawnPosition.x, 0, spawnPosition.z]}>
      {inVehicle ? <ScooterModel /> : <AvatarModel />}
    </group>
  )
}

function RemotePlayerAvatar({ player }: { player: RemotePlayer }) {
  const palette = ['#d5e982', '#e8c279', '#df9c6d', '#7fb7a0', '#b8a3d9'] as const
  const paletteIndex = [...player.userId].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7) % palette.length
  const color = palette[paletteIndex]

  return (
    <group position={[player.x, 0, player.z]}>
      {player.inVehicle && (
        <mesh position={[0, 0.24, 0]} castShadow>
          <boxGeometry args={[0.68, 0.2, 1.1]} />
          <meshStandardMaterial color="#c78a4b" metalness={0.2} roughness={0.58} />
        </mesh>
      )}
      <mesh position={[0, 0.86, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.72, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.24, 14, 10]} />
        <meshStandardMaterial color="#c99770" roughness={0.76} />
      </mesh>
      <Html position={[0, 2.25, 0]} center distanceFactor={10} sprite>
        <span className="world-player-tag" aria-hidden="true">{player.displayName}</span>
      </Html>
    </group>
  )
}

function CityScene({
  keysRef,
  onPlayerPosition,
  inVehicle,
  paused,
  waypoint,
  spawnPosition,
  remotePlayers,
}: CityWorldProps) {
  const palmPositions: [number, number, number][] = [
    [-9, 0, -7],
    [10, 0, -7],
    [-9, 0, 7],
    [10, 0, 7],
    [-34, 0, -8],
    [34, 0, 8],
    [-34, 0, 36],
    [34, 0, 35],
    [-8, 0, 36],
    [9, 0, 36],
    [-34, 0, -36],
    [34, 0, -35],
  ]
  const lampPositions: [number, number, number][] = [
    [-8, 0, -7],
    [8, 0, -7],
    [-8, 0, 7],
    [8, 0, 7],
    [-34, 0, 7],
    [34, 0, -7],
    [-34, 0, 35],
    [34, 0, 35],
  ]

  return (
    <>
      <color attach="background" args={['#101b18']} />
      <fog attach="fog" args={['#101b18', 48, 115]} />
      <ambientLight intensity={1.18} color="#c8d5bd" />
      <hemisphereLight args={['#dbe2c5', '#1e3027', 1.15]} />
      <directionalLight position={[25, 35, 16]} intensity={2.1} color="#f5dcb0" castShadow />
      <pointLight position={[-14, 9, 11]} intensity={0.7} color="#c4d88a" distance={32} />
      <Stars radius={100} depth={55} count={850} factor={2.4} saturation={0} fade speed={0.2} />
      <RoadGrid />
      {BUILDINGS.map((building) => (
        <Building key={`${building.x}-${building.z}`} {...building} />
      ))}
      <HotelFacade />
      <MarketStall />
      <ClubFacade />
      <GarageFacade />
      <CafeFacade />
      {palmPositions.map((position, index) => (
        <PalmTree key={index} position={position} scale={index % 3 === 0 ? 1.1 : 0.86} />
      ))}
      {lampPositions.map((position, index) => (
        <StreetLamp key={index} position={position} />
      ))}
      {PARKED_CARS.map((car, index) => (
        <group key={index} position={[car.x, 0, car.z]} rotation={[0, car.rotation, 0]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[1.5, 0.65, 3.1]} />
            <meshStandardMaterial color={car.color} metalness={0.16} roughness={0.58} />
          </mesh>
          <mesh position={[0, 1.08, -0.12]}>
            <boxGeometry args={[1.18, 0.42, 1.48]} />
            <meshStandardMaterial color="#7d9c8b" metalness={0.4} roughness={0.2} transparent opacity={0.7} />
          </mesh>
          {[-0.76, 0.76].map((x) =>
            [-0.96, 0.96].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, 0.35, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.28, 0.28, 0.18, 12]} />
                <meshStandardMaterial color="#131715" roughness={0.96} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {CITY_CHARACTERS.map((character) => (
        <CharacterActor key={character.id} character={character} />
      ))}
      {remotePlayers.map((player) => (
        <RemotePlayerAvatar key={player.userId} player={player} />
      ))}
      <LandmarkMarkers waypoint={waypoint} />
      <PlayerController
        keysRef={keysRef}
        onPlayerPosition={onPlayerPosition}
        inVehicle={inVehicle}
        paused={paused}
        spawnPosition={spawnPosition}
      />
    </>
  )
}

export function CityWorld(props: CityWorldProps) {
  return (
    <div className="world-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        shadows="basic"
        camera={{ position: [-2, 12, 19], fov: 45, near: 0.1, far: 160 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <CityScene {...props} />
      </Canvas>
    </div>
  )
}
