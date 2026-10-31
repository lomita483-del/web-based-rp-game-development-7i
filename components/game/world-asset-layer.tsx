'use client'

import { useLoader } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import * as THREE from 'three'
import { Group } from 'three'

const CAR_ASSETS = {
  car: '/assets/realistic-cars/Realistic Car Pack - Nov 2018/OBJ/NormalCar1.obj',
  taxi: '/assets/realistic-cars/Realistic Car Pack - Nov 2018/OBJ/Taxi.obj',
  suv: '/assets/realistic-cars/Realistic Car Pack - Nov 2018/OBJ/SUV.obj',
  sports: '/assets/realistic-cars/Realistic Car Pack - Nov 2018/OBJ/SportsCar.obj',
} as const

type AssetCarKind = keyof typeof CAR_ASSETS

function prepareModel(model: Group) {
  model.traverse((child) => {
    if ('isMesh' in child && child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return model
}

export function AssetTrafficVehicle({ kind, color, night = false }: { kind: 'car' | 'danfo' | 'truck'; color: string; night?: boolean }) {
  const url = kind === 'danfo' ? CAR_ASSETS.taxi : kind === 'truck' ? CAR_ASSETS.suv : CAR_ASSETS.car
  const source = useLoader(OBJLoader, url)
  const model = useMemo(() => prepareModel(source.clone(true)), [source])
  return (
    <group scale={0.72} position={[0, 0.03, 0]}>
      <primitive object={model} />
      <mesh position={[0, 1.1, 1.78]}>
        <boxGeometry args={[0.1, 0.1, 0.06]} />
        <meshBasicMaterial color={night ? '#fff0bd' : '#dad4c1'} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.74, -1.78]}>
        <boxGeometry args={[0.1, 0.08, 0.06]} />
        <meshBasicMaterial color="#d95b48" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.12, 0]} scale={[1.01, 0.05, 1.01]}>
        <boxGeometry args={[1.8, 0.02, 3.8]} />
        <meshStandardMaterial color={color} transparent opacity={0.06} roughness={0.6} />
      </mesh>
    </group>
  )
}

type AssetCharacterProps = {
  scale?: number
  gender?: 'male' | 'female'
  hairColor?: string
  outfitColor?: string
  skinTone?: string
  animation?: 'idle' | 'walk' | 'eat' | 'sleep' | 'bathe' | 'sit' | 'work'
}

export function AssetCharacter({
  scale = 1,
  gender = 'male',
  hairColor,
  outfitColor,
  skinTone,
  animation = 'idle',
}: AssetCharacterProps) {
  const group = useRef<THREE.Group>(null)
  const url = gender === 'female'
    ? '/assets/oasis/oasis-assets/models/characters/player_female.glb'
    : '/assets/oasis/oasis-assets/models/characters/player.glb'
  const { scene, animations } = useGLTF(url)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      if (!('isMesh' in child) || !child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      const mesh = child as THREE.Mesh
      const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      material.forEach((entry) => {
        const name = `${child.name} ${entry.name}`.toLowerCase()
        if (entry instanceof THREE.MeshStandardMaterial || entry instanceof THREE.MeshBasicMaterial || entry instanceof THREE.MeshPhongMaterial) {
          if (hairColor && (name.includes('hair') || name.includes('brow'))) entry.color.set(hairColor)
          if (outfitColor && (name.includes('shirt') || name.includes('cloth') || name.includes('outfit'))) entry.color.set(outfitColor)
          if (skinTone && (name.includes('skin') || name.includes('body') || name.includes('face'))) entry.color.set(skinTone)
        }
      })
    })
    return clone
  }, [hairColor, outfitColor, scene, skinTone])
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const preferred = Object.keys(actions).find((name) => name.toLowerCase().includes(animation))
      ?? Object.keys(actions).find((name) => name.toLowerCase().includes('idle'))
    if (!preferred) return
    const action = actions[preferred]
    action?.reset().fadeIn(0.2).play()
    return () => { action?.fadeOut(0.2) }
  }, [actions, animation])

  return <group ref={group} scale={scale} position={[0, 0.02, 0]}><primitive object={model} /></group>
}

useGLTF.preload('/assets/oasis/oasis-assets/models/characters/player.glb')
useGLTF.preload('/assets/oasis/oasis-assets/models/characters/player_female.glb')

function FarmProp({ path, position, scale = 1, rotation = 0 }: { path: string; position: [number, number, number]; scale?: number; rotation?: number }) {
  const source = useLoader(OBJLoader, path)
  const model = useMemo(() => prepareModel(source.clone(true)), [source])
  return <primitive object={model} position={position} rotation={[0, rotation, 0]} scale={scale} />
}

export function FarmDistrict() {
  return (
    <group name="open-map-farm-district">
      <mesh position={[70, -0.04, -68]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[38, 30]} />
        <meshStandardMaterial color="#7d9b52" roughness={1} />
      </mesh>
      <FarmProp path="/assets/farm-buildings/OBJ/BigBarn.obj" position={[62, 0, -67]} scale={0.58} />
      <FarmProp path="/assets/farm-buildings/OBJ/Silo.obj" position={[78, 0, -63]} scale={0.52} />
      <FarmProp path="/assets/farm-buildings/OBJ/WaterTower.obj" position={[80, 0, -76]} scale={0.48} />
      <FarmProp path="/assets/farm-buildings/OBJ/Windmill.obj" position={[62, 0, -78]} scale={0.5} />
      <FarmProp path="/assets/farm-buildings/OBJ/ChickenCoop.obj" position={[76, 0, -76]} scale={0.42} />
      {[-2, 0, 2].map((offset) => <FarmProp key={offset} path="/assets/farm-buildings/OBJ/Fence.obj" position={[67 + offset * 2.5, 0, -81]} scale={0.55} rotation={Math.PI / 2} />)}
    </group>
  )
}

const STREET_ASSETS = {
  straight: '/assets/street-pack/OBJ/Street_Straight.obj',
  curve: '/assets/street-pack/OBJ/Street_Curve.obj',
  fourWay: '/assets/street-pack/OBJ/Street_4Way.obj',
  threeWay: '/assets/street-pack/OBJ/Street_3Way.obj',
  light: '/assets/street-pack/OBJ/Streetlight_Single.obj',
} as const

const HOUSE_ASSETS = Array.from({ length: 21 }, (_, index) => `/assets/street-pack/city-kit/Models/OBJ format/house_type${String(index + 1).padStart(2, '0')}.obj`)

export function AssetCityReplacement() {
  const straight = useLoader(OBJLoader, STREET_ASSETS.straight)
  const curve = useLoader(OBJLoader, STREET_ASSETS.curve)
  const fourWay = useLoader(OBJLoader, STREET_ASSETS.fourWay)
  const threeWay = useLoader(OBJLoader, STREET_ASSETS.threeWay)
  const light = useLoader(OBJLoader, STREET_ASSETS.light)
  const houses = useLoader(OBJLoader, HOUSE_ASSETS)
  const models = useMemo(() => ({
    straight: prepareModel(straight.clone(true)),
    curve: prepareModel(curve.clone(true)),
    fourWay: prepareModel(fourWay.clone(true)),
    threeWay: prepareModel(threeWay.clone(true)),
    light: prepareModel(light.clone(true)),
    houses: houses.map((house) => prepareModel(house.clone(true))),
  }), [curve, fourWay, houses, light, straight, threeWay])
  const roads = [-66, -42, -18, 18, 42, 66]
  const roadPieces = roads.flatMap((z, row) => roads.map((x, column) => ({ x, z, row, column })))

  return (
    <group name="provided-asset-city">
      {roadPieces.map(({ x, z, row, column }) => {
        const isIntersection = Math.abs(x) <= 66 && Math.abs(z) <= 66
        const roadModel = row === column ? models.curve : isIntersection ? models.fourWay : models.straight
        return <primitive key={`provided-road-${x}-${z}`} object={roadModel.clone(true)} position={[x, -0.2, z]} scale={4} />
      })}
      {roads.flatMap((offset) => [-76, -52, -28, -4, 20, 44, 68].map((cross) => (
        <primitive key={`provided-light-${offset}-${cross}`} object={models.light.clone(true)} position={[cross, 0, offset]} scale={4} />
      )))}
      {Array.from({ length: 21 }, (_, index) => {
        const building = models.houses[index % models.houses.length]
        const x = -72 + (index % 7) * 24
        const z = -78 + Math.floor(index / 7) * 34
        return <primitive key={`provided-house-${index}`} object={building.clone(true)} position={[x, 0, z]} scale={6} />
      })}
    </group>
  )
}

export function CityBuilderDressing() {
  const building = useLoader(FBXLoader, '/assets/kaykit-city/KayKit_City_Builder_Bits_1.0_FREE/Assets/fbx/building_A.fbx')
  const bench = useLoader(FBXLoader, '/assets/kaykit-city/KayKit_City_Builder_Bits_1.0_FREE/Assets/fbx/bench.fbx')
  const buildingModel = useMemo(() => prepareModel(building.clone(true)), [building])
  const benchModel = useMemo(() => prepareModel(bench.clone(true)), [bench])
  return (
    <group name="kaykit-city-dressing">
      <primitive object={buildingModel.clone(true)} position={[-67, 0, -48]} scale={0.035} />
      <primitive object={buildingModel.clone(true)} position={[-58, 0, -48]} rotation={[0, Math.PI / 2, 0]} scale={0.035} />
      <primitive object={benchModel.clone(true)} position={[-52, 0, -42]} scale={0.04} />
      <primitive object={benchModel.clone(true)} position={[-52, 0, -46]} rotation={[0, Math.PI, 0]} scale={0.04} />
    </group>
  )
}

export const assetCarPaths: Record<AssetCarKind, string> = CAR_ASSETS
