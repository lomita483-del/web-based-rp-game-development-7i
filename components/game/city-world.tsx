
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
  const bodyLength = minibus ? 3.6 : isTruck ? 4.9 : isKeke ? 2.6 : isBike ? 1.65 : 3.2
  const bodyHeight = isBike ? 0.52 : isKeke ? 1.1 : minibus ? 1.18 : 0.74

  useFrame((_, delta) => {
    if (!vehicleRef.current) return
    const travel = Math.min(delta, 0.05) * speed
    const current = vehicleRef.current.position
    if (axis === 'x') {
      current.x += direction * travel
      if (current.x > 92) current.x = -92
      if (current.x < -92) current.x = 92
    } else {
      current.z += direction * travel
      if (current.z > 92) current.z = -92
      if (current.z < -92) current.z = 92
    }
    vehicleRef.current.rotation.y = axis === 'x' ? (direction > 0 ? Math.PI / 2 : -Math.PI / 2) : (direction > 0 ? 0 : Math.PI)
  })

  return (
    <group ref={vehicleRef} position={position}>
      <mesh position={[0, isBike ? 0.52 : 0.62, 0]} castShadow>
        <boxGeometry args={isBike ? [0.9, 0.38, 1.9] : [bodyLength, bodyHeight, isTruck ? 1.9 : minibus ? 2.1 : 1.65]} />
        <meshStandardMaterial color={color} metalness={0.18} roughness={0.58} />
      </mesh>
      <mesh position={[0, isBike ? 0.95 : 0.98, isTruck ? 0.18 : -0.02]} castShadow>
        <boxGeometry args={[isBike ? 0.65 : isTruck ? 2.8 : minibus ? 1.5 : 1.22, isBike ? 0.32 : 0.48, isTruck ? 1.28 : minibus ? 1.45 : 1.06]} />
        <meshStandardMaterial color={kind === 'danfo' ? '#516b7c' : kind === 'keke' ? '#9b8a4f' : '#4a5358'} metalness={0.24} roughness={0.45} />
      </mesh>
      {!isBike && (
        <>
          <mesh position={[0, 0.36, bodyLength * 0.46]}><boxGeometry args={[bodyLength * 0.72, 0.12, isTruck ? 0.15 : 0.12]} /><meshStandardMaterial color="#f3d49a" emissive="#c58e51" emissiveIntensity={0.72} /></mesh>
          {[-1, 1].map((side) => (
            <group key={`wheel-${side}`}>
              {[-1, 1].map((wheel) => (
                <mesh key={`wheel-${side}-${wheel}`} position={[side * (bodyLength * 0.33), 0.24, wheel * (isTruck ? 1.05 : 0.92)]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.24, 0.24, 0.15, 12]} />
                  <meshStandardMaterial color="#1c2124" roughness={0.96} />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )}
      {isBike && (
        <>
          {[[-0.44, 0.52], [0.44, 0.52], [-0.46, -0.52], [0.46, -0.52]].map(([x, z], index) => (
            <mesh key={`bike-wheel-${index}`} position={[x, 0.26, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.11, 12]} />
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

// ...existing code continues below
