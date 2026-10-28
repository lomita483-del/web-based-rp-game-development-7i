'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  CITY_CHARACTERS,
  STARTING_PLAYER,
  WORLD_LOCATIONS,
  distanceBetween,
  getMissionDetails,
  playerReducer,
  type CharacterId,
  type GamePanel,
  type LocationId,
} from './game-data'
import { GameHud, GamePanels, NpcDialogue } from './game-hud'

const CityWorld = dynamic(() => import('./city-world').then((module) => module.CityWorld), {
  ssr: false,
  loading: () => <div className="world-loading" aria-hidden="true"><span /><span /><span /></div>,
})

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

type Position = { x: number; z: number }
type ToastState = { id: number; text: string } | null

export default function GameShell() {
  const [player, dispatch] = useReducer(playerReducer, STARTING_PLAYER)
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: -6, z: 4 })
  const [gameMinutes, setGameMinutes] = useState(21 * 60 + 42)
  const [activePanel, setActivePanel] = useState<GamePanel>('none')
  const [activeCharacter, setActiveCharacter] = useState<CharacterId | null>(null)
  const [pinnedWaypoint, setPinnedWaypoint] = useState<LocationId | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const keysRef = useRef(new Set<string>())
  const toastId = useRef(0)

  const nearbyCharacter = useMemo(() => {
    const closest = CITY_CHARACTERS
      .map((character) => ({ character, distance: distanceBetween(playerPosition, character) }))
      .sort((a, b) => a.distance - b.distance)[0]
    return closest && closest.distance < 4.8 ? closest.character : null
  }, [playerPosition])

  const nearbyLocation = useMemo(() => {
    const closest = WORLD_LOCATIONS
      .map((location) => ({ location, distance: distanceBetween(playerPosition, location) }))
      .sort((a, b) => a.distance - b.distance)[0]
    return closest && closest.distance < 7.5 ? closest.location : null
  }, [playerPosition])

  const mission = getMissionDetails(player.stage)
  const waypoint = pinnedWaypoint ?? mission.targetLocation
  const paused = activePanel !== 'none' || activeCharacter !== null

  const notify = useCallback((text: string) => {
    toastId.current += 1
    setToast({ id: toastId.current, text })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const timer = window.setInterval(() => setGameMinutes((minutes) => minutes + 1), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const openPanel = useCallback((panel: Exclude<GamePanel, 'none'>) => {
    keysRef.current.clear()
    setActiveCharacter(null)
    setActivePanel((current) => (current === panel ? 'none' : panel))
  }, [])

  const switchPanel = useCallback((panel: Exclude<GamePanel, 'none'>) => {
    keysRef.current.clear()
    setActiveCharacter(null)
    setActivePanel(panel)
  }, [])

  const closePanel = useCallback(() => {
    keysRef.current.clear()
    setActivePanel('none')
  }, [])

  const setMoveKey = useCallback((key: string, pressed: boolean) => {
    if (pressed) keysRef.current.add(key)
    else keysRef.current.delete(key)
  }, [])

  const handlePlayerPosition = useCallback((position: Position) => {
    setPlayerPosition(position)
  }, [])

  const handleLocationAction = useCallback((locationId: LocationId) => {
    if (locationId === 'hotel') {
      dispatch({ type: 'rest' })
      setGameMinutes((minutes) => minutes + 420)
      notify('You got a few hours of rest at Marina House.')
      return
    }
    if (locationId === 'market' || locationId === 'cafe') {
      if (player.cash < 90) {
        notify('You need ₦90 for a suya wrap.')
        return
      }
      dispatch({ type: 'buy-food' })
      notify('Suya wrap added to your bag.')
      return
    }
    if (locationId === 'garage') {
      if (player.ownsScooter) {
        dispatch({ type: 'toggle-vehicle' })
        notify(player.inVehicle ? 'Scooter parked.' : 'Scooter ready. Ride safe.')
        return
      }
      if (player.cash < 350) {
        notify('You need ₦350 to rent Kunle’s scooter.')
        return
      }
      dispatch({ type: 'rent-scooter' })
      notify('Scooter rented. The city just got smaller.')
      return
    }
    if (locationId === 'waterfront') {
      notify('The lagoon is quiet tonight. Take a moment and enjoy the view.')
      return
    }
    notify('The square is a good place to meet people.')
  }, [notify, player.cash, player.inVehicle, player.ownsScooter])

  const handleInteract = useCallback(() => {
    if (activeCharacter) return
    if (nearbyCharacter) {
      keysRef.current.clear()
      setActiveCharacter(nearbyCharacter.id)
      return
    }
    if (nearbyLocation) handleLocationAction(nearbyLocation.id)
  }, [activeCharacter, handleLocationAction, nearbyCharacter, nearbyLocation])

  const handleCharacterAction = useCallback(() => {
    if (!activeCharacter) return
    switch (activeCharacter) {
      case 'bisi':
        if (player.stage === 'meet-bisi') {
          dispatch({ type: 'meet-bisi' })
          setPinnedWaypoint(null)
          notify('Bisi showed you the ropes. Tunde has a courier run at the night market.')
        } else {
          notify('Bisi nods toward the night market. There is always work after dark.')
        }
        break
      case 'tunde':
        if (player.stage === 'delivery') {
          notify('The parcel is already in your bag. Ada is waiting at Afterglow.')
        } else if (player.stage === 'find-tunde' || player.stage === 'free-roam') {
          dispatch({ type: 'accept-delivery' })
          setPinnedWaypoint(null)
          notify('Courier run accepted. Follow the gold beacon to Afterglow.')
        }
        break
      case 'ada':
        if (player.stage === 'delivery') {
          dispatch({ type: 'complete-delivery' })
          setPinnedWaypoint(null)
          notify('Delivery complete. ₦480 and 25 reputation earned.')
        } else {
          notify('Ada says the rooftop has room for one more good story.')
        }
        break
      case 'kunle':
        if (player.ownsScooter) {
          dispatch({ type: 'toggle-vehicle' })
          notify(player.inVehicle ? 'Scooter parked.' : 'Scooter ready. Ride safe.')
        } else if (player.cash < 350) {
          notify('You need ₦350 to rent the scooter.')
        } else {
          dispatch({ type: 'rent-scooter' })
          notify('Scooter rented. The city just got smaller.')
        }
        break
      case 'sade':
        if (player.cash < 90) {
          notify('You need ₦90 for a suya wrap.')
        } else {
          dispatch({ type: 'buy-food' })
          notify('Suya wrap added to your bag.')
        }
        break
    }
    setActiveCharacter(null)
  }, [activeCharacter, notify, player.cash, player.inVehicle, player.ownsScooter, player.stage])

  const acceptDelivery = useCallback(() => {
    if (player.stage === 'meet-bisi') {
      setPinnedWaypoint('square')
      closePanel()
      notify('Meet Bisi first to unlock the courier board.')
      return
    }
    if (player.stage === 'delivery') {
      setPinnedWaypoint('club')
      closePanel()
      notify('Your route to Afterglow is marked in gold.')
      return
    }
    dispatch({ type: 'accept-delivery' })
    setPinnedWaypoint(null)
    closePanel()
    notify('Courier run accepted. Follow the gold beacon to Afterglow.')
  }, [closePanel, notify, player.stage])

  const buyFood = useCallback(() => {
    if (player.cash < 90) {
      notify('You need ₦90 for a suya wrap.')
      return
    }
    dispatch({ type: 'buy-food' })
    notify('Suya wrap added to your bag.')
  }, [notify, player.cash])

  const eatFood = useCallback(() => {
    const hasFood = player.inventory.some((item) => item.id === 'suya' && item.quantity > 0)
    if (!hasFood) {
      notify('There is no suya in your bag right now.')
      return
    }
    dispatch({ type: 'eat-food' })
    notify('A warm bite restores your energy.')
  }, [notify, player.inventory])

  const setWaypoint = useCallback((locationId: LocationId) => {
    setPinnedWaypoint(locationId)
    const location = WORLD_LOCATIONS.find((entry) => entry.id === locationId)
    if (location) notify(`Route pinned to ${location.name}.`)
  }, [notify])

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if (MOVEMENT_KEYS.has(key)) {
        if (event.cancelable) event.preventDefault()
        keysRef.current.add(key)
        return
      }
      if (event.repeat) return
      if (key === 'e' && !paused) {
        event.preventDefault()
        handleInteract()
      } else if (key === 'tab') {
        event.preventDefault()
        openPanel('map')
      } else if (key === 'm') {
        openPanel('map')
      } else if (key === 'j') {
        openPanel('jobs')
      } else if (key === 'i') {
        openPanel('inventory')
      } else if (key === 'o') {
        openPanel('online')
      } else if (key === 'escape') {
        keysRef.current.clear()
        setActiveCharacter(null)
        closePanel()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase())
    const onBlur = () => keysRef.current.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [closePanel, handleInteract, openPanel, paused])

  return (
    <main className="game-shell" aria-label="Eko After Hours roleplay game">
      <CityWorld
        keysRef={keysRef}
        onPlayerPosition={handlePlayerPosition}
        inVehicle={player.inVehicle}
        paused={paused}
        waypoint={waypoint}
      />
      <div className="world-vignette" aria-hidden="true" />
      <GameHud
        player={player}
        gameMinutes={gameMinutes}
        playerPosition={playerPosition}
        nearbyCharacter={nearbyCharacter}
        nearbyLocation={nearbyLocation}
        waypoint={waypoint}
        activePanel={activePanel}
        toast={toast}
        onOpenPanel={openPanel}
        onInteract={handleInteract}
        onMoveKey={setMoveKey}
      />
      {activePanel !== 'none' && (
        <GamePanels
          panel={activePanel}
          player={player}
          waypoint={waypoint}
          playerPosition={playerPosition}
          onClose={closePanel}
          onChangePanel={switchPanel}
          onAcceptDelivery={acceptDelivery}
          onBuyFood={buyFood}
          onEatFood={eatFood}
          onSetWaypoint={setWaypoint}
        />
      )}
      {activeCharacter && (
        <NpcDialogue
          characterId={activeCharacter}
          player={player}
          onClose={() => setActiveCharacter(null)}
          onAction={handleCharacterAction}
        />
      )}
    </main>
  )
}
