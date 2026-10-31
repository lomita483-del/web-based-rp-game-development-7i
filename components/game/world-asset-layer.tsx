'use client'

import { useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
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

export function AssetCharacter({ scale = 1 }: { scale?: number }) {
  const { scene } = useGLTF('/assets/oasis/oasis-assets/models/characters/player.glb')
  return <primitive object={scene.clone(true)} scale={scale} position={[0, 0.02, 0]} />
}

useGLTF.preload('/assets/oasis/oasis-assets/models/characters/player.glb')

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
