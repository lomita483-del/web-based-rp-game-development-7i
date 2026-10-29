function TrafficSignal({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <boxGeometry args={[0.16, 5.6, 0.16]} />
        <meshStandardMaterial color="#4d4d4d" metalness={0.52} roughness={0.4} />
      </mesh>
      <mesh position={[0.38, 4.2, 0]}>
        <boxGeometry args={[0.7, 1.2, 0.22]} />
        <meshStandardMaterial color="#242b2d" roughness={0.74} />
      </mesh>
      <mesh position={[0.38, 4.75, 0.09]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#f0c87e" emissive="#d59d48" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.38, 4.1, 0.09]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#d45c51" emissive="#9d2d28" emissiveIntensity={0.75} />
      </mesh>
      <mesh position={[0.38, 3.45, 0.09]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#53b46d" emissive="#2e7a45" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function TrafficVehicle({
  position,
  color,
  speed,
  minibus = false,
  axis = 'x',
  direction = 1,
  kind = 'car',
}: {
  position: [number, number, number]
  color: string
  speed: number
  minibus?: boolean
  axis?: 'x' | 'z'
  direction?: 1 | -1
  kind?: 'car' | 'danfo' | 'keke' | 'truck' | 'bike'
}) {
  const vehicleRef = useRef<Group>(null!)
  const isBike = kind === 'bike'
  const isKeke = kind === 'keke'
  const isTruck = kind === 'truck'
  const vehicleLength = minibus ? 3.6 : isTruck ? 5.1 : isKeke ? 2.7 : isBike ? 1.7 : 3.2
  const vehicleHeight = isBike ? 0.52 : isKeke ? 1.08 : minibus ? 1.2 : 0.72

  useFrame((_, delta) => {
    if (!vehicleRef.current) return
    const travel = speed * Math.min(delta, 0.05)
    const current = vehicleRef.current.position
    if (axis === 'x') {
      current.x += direction * travel
      if (current.x > 92) current.x = -92
      if (current.x < -92) current.x = 92
      vehicleRef.current.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2
    } else {
      current.z += direction * travel
      if (current.z > 92) current.z = -92
      if (current.z < -92) current.z = 92
      vehicleRef.current.rotation.y = direction > 0 ? 0 : Math.PI
    }
  })

  return (
    <group ref={vehicleRef} position={position}>
      {!isBike && (
        <mesh position={[0, isKeke ? 0.82 : 0.62, 0]} castShadow>
          <boxGeometry args={[vehicleLength, vehicleHeight, isTruck ? 1.9 : minibus ? 2.1 : 1.65]} />
          <meshStandardMaterial color={color} metalness={0.18} roughness={0.58} />
        </mesh>
      )}
      {isBike && (
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[1.15, 0.42, 1.8]} />
          <meshStandardMaterial color={color} metalness={0.18} roughness={0.52} />
        </mesh>
      )}
      <mesh position={[0, isBike ? 0.94 : minibus ? 1.1 : isTruck ? 1.2 : 0.98, isTruck ? 0.15 : -0.04]} castShadow>
        <boxGeometry args={[isBike ? 0.72 : isTruck ? 2.8 : minibus ? 1.55 : 1.18, isBike ? 0.34 : 0.5, isTruck ? 1.25 : minibus ? 1.42 : 1.02]} />
        <meshStandardMaterial color={kind === 'danfo' ? '#566f86' : kind === 'keke' ? '#9b8a4f' : '#4e575d'} metalness={0.24} roughness={0.48} />
      </mesh>
      {!isBike && (
        <>
          <mesh position={[0, 0.35, vehicleLength * 0.45]}><boxGeometry args={[vehicleLength * 0.72, 0.12, isTruck ? 0.18 : 0.12]} /><meshStandardMaterial color="#f3d49a" emissive="#c58e51" emissiveIntensity={0.72} /></mesh>
          {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([xSide, zSide], index) => (
            <mesh key={`wheel-${index}`} position={[xSide * (vehicleLength * 0.28), 0.26, zSide * (isTruck ? 1.04 : 0.9)]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.16, 12]} />
              <meshStandardMaterial color="#1b2123" roughness={0.96} />
            </mesh>
          ))}
        </>
      )}
      {isBike && (
        <>
          {[[-0.44, 0.52], [0.44, 0.52], [-0.46, -0.52], [0.46, -0.52]].map(([xSide, zSide], index) => (
            <mesh key={`bike-wheel-${index}`} position={[xSide, 0.26, zSide]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
              <meshStandardMaterial color="#1d2325" roughness={0.96} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}

const CITY_TRAFFIC_FLOW = [
  { key: 'traffic-01', x: -82, z: -66, axis: 'x', direction: 1, speed: 10.2, color: '#d18f40', kind: 'car' },
  { key: 'traffic-02', x: -54, z: -42, axis: 'x', direction: -1, speed: 8.6, color: '#4c6a72', kind: 'danfo' },
  { key: 'traffic-03', x: -12, z: -18, axis: 'x', direction: 1, speed: 12.4, color: '#7a4d43', kind: 'car' },
  { key: 'traffic-04', x: 38, z: 18, axis: 'x', direction: -1, speed: 9.3, color: '#5d7a57', kind: 'keke' },
  { key: 'traffic-05', x: 66, z: 42, axis: 'x', direction: -1, speed: 8.3, color: '#8f6d55', kind: 'truck' },
  { key: 'traffic-06', x: 6, z: -66, axis: 'x', direction: 1, speed: 11.1, color: '#475b7c', kind: 'car' },
  { key: 'traffic-07', x: 28, z: 66, axis: 'x', direction: -1, speed: 7.8, color: '#d7a350', kind: 'bike' },
  { key: 'traffic-08', x: -35, z: 42, axis: 'x', direction: 1, speed: 9.6, color: '#a26145', kind: 'danfo' },
  { key: 'traffic-09', x: 52, z: -18, axis: 'x', direction: -1, speed: 12.2, color: '#567d87', kind: 'car' },
  { key: 'traffic-10', x: -72, z: 18, axis: 'x', direction: 1, speed: 10.9, color: '#7c6251', kind: 'car' },
  { key: 'traffic-11', x: -66, z: -42, axis: 'z', direction: 1, speed: 9.8, color: '#6d516a', kind: 'car' },
  { key: 'traffic-12', x: -18, z: -8, axis: 'z', direction: -1, speed: 8.7, color: '#5e7a5b', kind: 'danfo' },
  { key: 'traffic-13', x: -42, z: 14, axis: 'z', direction: 1, speed: 11.3, color: '#774d51', kind: 'car' },
  { key: 'traffic-14', x: 18, z: 40, axis: 'z', direction: -1, speed: 10.1, color: '#69798c', kind: 'car' },
  { key: 'traffic-15', x: 42, z: -32, axis: 'z', direction: 1, speed: 7.9, color: '#a7783d', kind: 'truck' },
  { key: 'traffic-16', x: 66, z: 24, axis: 'z', direction: -1, speed: 8.5, color: '#6d5d7a', kind: 'keke' },
  { key: 'traffic-17', x: -42, z: 62, axis: 'z', direction: -1, speed: 9.5, color: '#924f4b', kind: 'car' },
  { key: 'traffic-18', x: 42, z: -60, axis: 'z', direction: 1, speed: 10.7, color: '#d3ae60', kind: 'bike' },
  { key: 'traffic-19', x: 18, z: -8, axis: 'z', direction: -1, speed: 9.4, color: '#486a63', kind: 'danfo' },
  { key: 'traffic-20', x: -18, z: 52, axis: 'z', direction: 1, speed: 12.0, color: '#7d6556', kind: 'car' },
  { key: 'traffic-21', x: -78, z: -42, axis: 'x', direction: -1, speed: 12.4, color: '#525d73', kind: 'car' },
  { key: 'traffic-22', x: 74, z: -18, axis: 'x', direction: -1, speed: 10.8, color: '#c3723d', kind: 'danfo' },
  { key: 'traffic-23', x: 4, z: -18, axis: 'x', direction: 1, speed: 10.0, color: '#73937e', kind: 'car' },
  { key: 'traffic-24', x: -28, z: 66, axis: 'x', direction: -1, speed: 9.2, color: '#7f6756', kind: 'keke' },
  { key: 'traffic-25', x: -82, z: 42, axis: 'x', direction: 1, speed: 8.4, color: '#8d6d52', kind: 'truck' },
  { key: 'traffic-26', x: 80, z: 42, axis: 'x', direction: -1, speed: 11.6, color: '#4a7880', kind: 'car' },
  { key: 'traffic-27', x: -66, z: 66, axis: 'z', direction: -1, speed: 9.6, color: '#6a8e6d', kind: 'car' },
  { key: 'traffic-28', x: 66, z: 0, axis: 'z', direction: 1, speed: 10.5, color: '#b9754c', kind: 'danfo' },
  { key: 'traffic-29', x: -18, z: -66, axis: 'z', direction: -1, speed: 8.9, color: '#3f5f77', kind: 'car' },
  { key: 'traffic-30', x: 18, z: 66, axis: 'z', direction: 1, speed: 9.7, color: '#d0a265', kind: 'bike' },
  { key: 'traffic-31', x: 42, z: 56, axis: 'z', direction: -1, speed: 8.2, color: '#7e5b4f', kind: 'car' },
  { key: 'traffic-32', x: 18, z: -42, axis: 'z', direction: 1, speed: 11.2, color: '#4a6274', kind: 'car' },
  { key: 'traffic-33', x: -42, z: -18, axis: 'z', direction: -1, speed: 10.4, color: '#7a5a46', kind: 'danfo' },
  { key: 'traffic-34', x: 18, z: 18, axis: 'z', direction: 1, speed: 8.6, color: '#d08c43', kind: 'keke' },
  { key: 'traffic-35', x: 66, z: -66, axis: 'z', direction: -1, speed: 7.7, color: '#3f4d62', kind: 'truck' },
  { key: 'traffic-36', x: -66, z: 12, axis: 'z', direction: 1, speed: 8.4, color: '#887a60', kind: 'car' },
] as const

function collidesWithBuilding(x: number, z: number, radius: number) {
  return CITY_COLLISION_BLOCKS.some((block) =>
    Math.abs(x - block.x) < block.width / 2 + radius &&
    Math.abs(z - block.z) < block.depth / 2 + radius,
  )
}

function TrafficVehicleOld({ position, color, speed, minibus = false }: { position: [number, number, number]; color: string; speed: number; minibus?: boolean }) {
  const vehicleRef = useRef<Group>(null!)

  useFrame((_, delta) => {
    if (!vehicleRef.current) return
    vehicleRef.current.position.x += speed * Math.min(delta, 0.05)
    if (vehicleRef.current.position.x > 90) vehicleRef.current.position.x = -90
  })

  return (
    <group ref={vehicleRef} position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={minibus ? [1.85, 1.15, 3.6] : [1.72, 0.72, 3.4]} /><meshStandardMaterial color={color} metalness={0.15} roughness={0.58} /></mesh>
      <mesh position={[0, minibus ? 1.38 : 1.12, -0.08]} castShadow><boxGeometry args={minibus ? [1.55, 0.55, 2.4] : [1.38, 0.48, 1.75]} /><meshStandardMaterial color="#526a73" metalness={0.28} roughness={0.42} /></mesh>
      <mesh position={[0, 0.42, 1.73]}><boxGeometry args={[1.45, 0.16, 0.14]} /><meshStandardMaterial color="#4a4e50" metalness={0.34} roughness={0.48} /></mesh>
      {[-1, 1].map((side) => (
        <group key={`wheels-${side}`}>
          {[-1.1, 1.1].map((wheelZ) => <mesh key={wheelZ} position={[side * 0.86, 0.36, wheelZ]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.28, 0.28, 0.16, 12]} /><meshStandardMaterial color="#1d2328" roughness={0.96} /></mesh>)}
          <mesh position={[side * 0.58, 0.76, 1.68]}><boxGeometry args={[0.16, 0.2, 0.12]} /><meshStandardMaterial color="#f4d59a" emissive="#c58f51" emissiveIntensity={0.72} /></mesh>
        </group>
      ))}
      {minibus && <mesh position={[0, 1.05, 0.54]}><boxGeometry args={[1.88, 0.13, 0.12]} /><meshStandardMaterial color="#e9d08c" roughness={0.75} /></mesh>}
    </group>
  )
}

