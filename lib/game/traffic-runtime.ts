// A single shared traffic world so the vehicles, the signal lamps and ride bookings all read one clock.
import { createTrafficWorld, type TrafficWorld } from './traffic-sim'

let world: TrafficWorld | null = null
let worldDensity = 0.8

/** The shared world (created on first use). */
export function getTrafficWorld(): TrafficWorld {
  if (!world) world = createTrafficWorld(7, worldDensity)
  return world
}

/** Rebuilds the world only when the density setting actually changes, keeping the signal clock running. */
export function configureTraffic(density: number): TrafficWorld {
  if (!world || density !== worldDensity) {
    const time = world?.time ?? 0
    worldDensity = density
    world = createTrafficWorld(7, density)
    world.time = time
  }
  return world
}
