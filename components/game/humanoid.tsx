'use client'

import { useFrame } from '@react-three/fiber'
import { useRef, type MutableRefObject } from 'react'
import type { Group } from 'three'
import type { Gender } from './game-data'

/** How a standing character idles: breathing, talking with a gesturing arm, working at a desk, or waving. */
export type IdleStyle = 'stand' | 'talk' | 'work' | 'wave'

type HumanoidProps = {
  skinTone: string
  hairColor: string
  clothing: string
  accentColor: string
  keysRef?: MutableRefObject<Set<string>>
  paused?: boolean
  walking?: boolean
  gender?: Gender
  idle?: IdleStyle
  /** Offsets the idle animation so a crowd does not move in lockstep. */
  phase?: number
  /** Game admins wear a black suit with gold trim and a halo so players can recognise them. */
  admin?: boolean
}

export function HumanoidModel({
  skinTone,
  hairColor,
  clothing,
  accentColor,
  keysRef,
  paused = false,
  walking = false,
  gender = 'male',
  idle = 'stand',
  phase = 0,
  admin = false,
}: HumanoidProps) {
  const leftArm = useRef<Group>(null!)
  const rightArm = useRef<Group>(null!)
  const leftLeg = useRef<Group>(null!)
  const rightLeg = useRef<Group>(null!)

  useFrame((state) => {
    if (!leftArm.current || !rightArm.current || !leftLeg.current || !rightLeg.current) return
    const t = state.clock.elapsedTime + phase
    const movementKeys = keysRef?.current
    const hasMovementInput = movementKeys
      ? ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some((key) => movementKeys.has(key))
      : walking
    const isMoving = hasMovementInput && !paused
    const stride = isMoving ? Math.sin(t * 10) * 0.44 : 0
    const breathe = Math.sin(t * 1.5) * 0.035

    if (isMoving) {
      leftArm.current.rotation.set(stride, 0, 0)
      rightArm.current.rotation.set(-stride, 0, 0)
    } else if (idle === 'talk') {
      leftArm.current.rotation.set(breathe, 0, 0)
      rightArm.current.rotation.set(-0.7 + Math.sin(t * 3.1) * 0.28, 0, -0.12 + Math.sin(t * 2.3) * 0.08)
    } else if (idle === 'work') {
      leftArm.current.rotation.set(-0.95 + Math.sin(t * 7) * 0.07, 0, 0.08)
      rightArm.current.rotation.set(-0.95 + Math.sin(t * 7 + 1.7) * 0.07, 0, -0.08)
    } else if (idle === 'wave') {
      leftArm.current.rotation.set(breathe, 0, 0)
      rightArm.current.rotation.set(0, 0, -2.5 + Math.sin(t * 5.5) * 0.35)
    } else {
      leftArm.current.rotation.set(breathe, 0, 0)
      rightArm.current.rotation.set(-breathe, 0, 0)
    }
    leftLeg.current.rotation.x = isMoving ? -stride : 0
    rightLeg.current.rotation.x = isMoving ? stride : 0
  })

  return (
    <group>
      <mesh position={[0, 1.03, 0]} castShadow>
        <capsuleGeometry args={gender === 'female' ? [0.25, 0.5, 8, 14] : [0.28, 0.52, 8, 14]} />
        <meshStandardMaterial color={clothing} roughness={0.77} />
      </mesh>
      <mesh position={[0, 1.42, 0.015]}>
        <boxGeometry args={[0.45, 0.13, 0.32]} />
        <meshStandardMaterial color={accentColor} roughness={0.76} />
      </mesh>
      <mesh position={[0, 1.54, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.25, 10]} />
        <meshStandardMaterial color={skinTone} roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.86, 0]} castShadow>
        <sphereGeometry args={[0.205, 24, 18]} />
        <meshStandardMaterial color={skinTone} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.99, -0.035]}>
        <sphereGeometry args={[0.205, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.96} />
      </mesh>
      {gender === 'female' && (
        <mesh position={[0, 1.67, -0.19]} rotation={[0.2, 0, 0]}>
          <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
          <meshStandardMaterial color={hairColor} roughness={0.96} />
        </mesh>
      )}
      {[-1, 1].map((side) => (
        <group key={`face-side-${side}`}>
          <mesh position={[side * 0.205, 1.86, 0.01]}><sphereGeometry args={[0.038, 10, 8]} /><meshStandardMaterial color={skinTone} roughness={0.9} /></mesh>
          <mesh position={[side * 0.072, 1.88, 0.17]}><sphereGeometry args={[0.019, 10, 8]} /><meshStandardMaterial color="#f0e8dc" roughness={0.5} /></mesh>
          <mesh position={[side * 0.072, 1.88, 0.188]}><sphereGeometry args={[0.009, 8, 6]} /><meshStandardMaterial color="#211c19" roughness={0.5} /></mesh>
          <mesh position={[side * 0.072, 1.93, 0.16]} rotation={[0, 0, side * -0.1]}><boxGeometry args={[0.08, 0.016, 0.02]} /><meshStandardMaterial color={hairColor} roughness={0.9} /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.82, 0.194]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.035, 0.085, 6]} /><meshStandardMaterial color={skinTone} roughness={0.88} /></mesh>
      <mesh position={[0, 1.73, 0.18]}><boxGeometry args={[0.075, 0.014, 0.018]} /><meshStandardMaterial color="#57392f" roughness={0.82} /></mesh>
      <group ref={leftArm} position={[-0.33, 1.28, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.09, 0.36, 5, 8]} /><meshStandardMaterial color={clothing} roughness={0.8} /></mesh>
        <mesh position={[0, -0.53, 0.02]}><sphereGeometry args={[0.085, 8, 7]} /><meshStandardMaterial color={skinTone} roughness={0.9} /></mesh>
      </group>
      <group ref={rightArm} position={[0.33, 1.28, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.09, 0.36, 5, 8]} /><meshStandardMaterial color={clothing} roughness={0.8} /></mesh>
        <mesh position={[0, -0.53, 0.02]}><sphereGeometry args={[0.085, 8, 7]} /><meshStandardMaterial color={skinTone} roughness={0.9} /></mesh>
      </group>
      <group ref={leftLeg} position={[-0.13, 0.72, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.105, 0.37, 5, 8]} /><meshStandardMaterial color="#35383a" roughness={0.94} /></mesh>
        <mesh position={[0, -0.55, 0.11]} castShadow><boxGeometry args={[0.23, 0.16, 0.38]} /><meshStandardMaterial color="#24272a" roughness={0.86} /></mesh>
      </group>
      <group ref={rightLeg} position={[0.13, 0.72, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.105, 0.37, 5, 8]} /><meshStandardMaterial color="#35383a" roughness={0.94} /></mesh>
        <mesh position={[0, -0.55, 0.11]} castShadow><boxGeometry args={[0.23, 0.16, 0.38]} /><meshStandardMaterial color="#24272a" roughness={0.86} /></mesh>
      </group>
      {admin && (
        <group>
          <mesh position={[0, 2.38, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.025, 8, 24]} /><meshBasicMaterial color="#f0c860" toneMapped={false} /></mesh>
          {[-1, 1].map((side) => <mesh key={`epaulette-${side}`} position={[side * 0.34, 1.43, 0]}><boxGeometry args={[0.22, 0.05, 0.3]} /><meshStandardMaterial color="#d9b24f" metalness={0.7} roughness={0.3} /></mesh>)}
          <mesh position={[0, 1.1, 0.28]}><boxGeometry args={[0.08, 0.55, 0.03]} /><meshStandardMaterial color="#d9b24f" metalness={0.7} roughness={0.3} /></mesh>
        </group>
      )}
      {walking && <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.34, 0.42, 24]} /><meshBasicMaterial color="#d8aa68" transparent opacity={0.48} /></mesh>}
    </group>
  )
}
