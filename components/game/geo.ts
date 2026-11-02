import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type Part = {
  geometry: BufferGeometry
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  color: string
}

const tmpMatrix = new Matrix4()
const tmpQuat = new Quaternion()
const tmpEuler = new Euler()
const tmpColor = new Color()

/** Merges many small primitives into one vertex-coloured geometry so a whole prop costs a single draw call. */
export function mergeParts(parts: Part[]): BufferGeometry {
  const geometries = parts.map((part) => {
    const geometry = part.geometry.clone()
    tmpEuler.set(...(part.rotation ?? [0, 0, 0]))
    tmpQuat.setFromEuler(tmpEuler)
    tmpMatrix.compose(
      new Vector3(...(part.position ?? [0, 0, 0])),
      tmpQuat,
      new Vector3(...(part.scale ?? [1, 1, 1])),
    )
    geometry.applyMatrix4(tmpMatrix)
    tmpColor.set(part.color)
    const count = geometry.getAttribute('position').count
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      colors[i * 3] = tmpColor.r
      colors[i * 3 + 1] = tmpColor.g
      colors[i * 3 + 2] = tmpColor.b
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    // Normalise attributes so every part can be merged (UVs are not needed for vertex-coloured props).
    if (geometry.hasAttribute('uv')) geometry.deleteAttribute('uv')
    return geometry
  })
  const merged = mergeGeometries(geometries, false)
  geometries.forEach((geometry) => geometry.dispose())
  part_cleanup(parts)
  return merged
}

function part_cleanup(parts: Part[]) {
  parts.forEach((part) => part.geometry.dispose())
}

export const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d)
export const cyl = (top: number, bottom: number, height: number, segments = 8) => new CylinderGeometry(top, bottom, height, segments)
export const sphere = (radius: number, w = 8, h = 6) => new SphereGeometry(radius, w, h)

export const IDENTITY_SCALE: [number, number, number] = [1, 1, 1]
