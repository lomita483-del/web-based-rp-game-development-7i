'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { authClient } from '@/lib/auth-client'
import { gameFetcher, gameMutation } from '@/lib/game/client-api'
import type {
  GamePosition,
  GameSaveAck,
  GameSavePayload,
  GameSaveResponse,
  GameSessionResponse,
  PresenceMutation,
  PresenceResponse,
  PresenceUpdate,
  SaveStatus,
} from '@/lib/game/types'
import {
  CITY_BUILDINGS,
  CITY_CHARACTERS,
  CITY_FACTIONS,
  CITY_HOMES,
  CITY_JOBS,
  STARTING_PLAYER,
  WORLD_LOCATIONS,
  distanceBetween,
  estimateRideFare,
  formatNaira,
  getBuildingEntrancePosition,
  getInteriorDefinition,
  getLocationEntrancePosition,
  getMissionDetails,
  playerReducer,
  type CharacterId,
  type FactionId,
  type GamePanel,
  type HomeId,
  type JobId,
  type LocationId,
  type PlayerState,
  type InteriorDefinition,
  type RideBooking,
  type RideBookingStatus,
  type RideVehicleType,
} from './game-data'
import { GameHud, GamePanels, NpcDialogue, type TravelMode } from './game-hud'

const CityWorld = dynamic(() => import('./city-world').then((module) => module.CityWorld), {
  ssr: false,
  loading: () => <div className="world-loading" aria-hidden="true"><span /><span /><span /></div>,
})

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'shiftleft', 'shiftright'])

type Position = GamePosition
type ToastState = { id: number; text: string } | null

const fetchGameSave = ([url]: readonly [string, string]) => gameFetcher<GameSaveResponse>(url)
const fetchPresence = ([url]: readonly [string, string]) => gameFetcher<PresenceResponse>(url)

const ENTERABLE_INTERIORS = [
  ...CITY_BUILDINGS.map((building) => ({
    interior: getInteriorDefinition(building.id),
    entrance: getBuildingEntrancePosition(building),
  })),
  ...WORLD_LOCATIONS.map((location) => ({
    interior: getInteriorDefinition(location.id),
    entrance: getLocationEntrancePosition(location.id),
  })),
].filter((entry): entry is { interior: InteriorDefinition; entrance: Position } => Boolean(entry.interior && entry.entrance))

function createGameSavePayload(player: PlayerState, position: Position, gameMinutes: number): GameSavePayload {
  return {
    playerState: {
      gender: player.gender,
      cash: player.cash,
      bankBalance: player.bankBalance,
      reputation: player.reputation,
      level: player.level,
      energy: player.energy,
      hunger: player.hunger,
      educationCredits: player.educationCredits,
      stage: player.stage,
      inventory: player.inventory.map((item) => ({ ...item })),
      ownsScooter: player.ownsScooter,
      inVehicle: player.inVehicle,
      completedRuns: player.completedRuns,
      completedShifts: player.completedShifts,
      shiftStarted: player.shiftStarted,
      completedShiftTasks: [...player.completedShiftTasks],
      currentInteriorId: player.currentInteriorId,
      returnPosition: player.returnPosition ? { ...player.returnPosition } : null,
      job: player.job,
      faction: player.faction,
      home: player.home,
      voterRegistered: player.voterRegistered,
      wantedLevel: player.wantedLevel,
    },
    position,
    gameMinutes,
  }
}

export default function GameShell() {
  const [player, dispatch] = useReducer(playerReducer, STARTING_PLAYER)
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: -6, z: 4 })
  const [spawnPosition, setSpawnPosition] = useState<Position>({ x: -6, z: 4 })
  const [gameMinutes, setGameMinutes] = useState(21 * 60 + 42)
  const [activePanel, setActivePanel] = useState<GamePanel>('none')
  const [activeCharacter, setActiveCharacter] = useState<CharacterId | null>(null)
  const [pinnedWaypoint, setPinnedWaypoint] = useState<LocationId | null>(null)
  const [autoWalkTarget, setAutoWalkTarget] = useState<LocationId | null>(null)
  const [rideBooking, setRideBooking] = useState<RideBooking | null>(null)
  const [worldTransitioning, setWorldTransitioning] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const keysRef = useRef(new Set<string>())
  const toastId = useRef(0)
  const rideSequenceRef = useRef(0)
  const rideTimerIdsRef = useRef<number[]>([])
  const transitionTimerRef = useRef<number | null>(null)
  const { data: sessionResponse, isLoading: sessionLoading, mutate: refreshSession } = useSWR<GameSessionResponse>(
    '/api/game/session',
    gameFetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const currentUser = sessionResponse?.user ?? null
  const currentUserId = currentUser?.id ?? null
  const saveKey = currentUserId ? (['/api/game/save', currentUserId] as const) : null
  const {
    data: savedGame,
    error: saveLoadError,
    isLoading: saveLoading,
  } = useSWR(saveKey, fetchGameSave, { revalidateOnFocus: false, revalidateOnReconnect: true })
  const presenceRoomId = player.currentInteriorId ? `interior:${player.currentInteriorId}` : 'eko-mainland'
  const presenceKey = currentUserId
    ? ([`/api/game/presence?roomId=${encodeURIComponent(presenceRoomId)}`, currentUserId] as const)
    : null
  const {
    data: presenceResponse,
    error: presenceLoadError,
  } = useSWR(presenceKey, fetchPresence, {
    refreshInterval: 3_000,
    dedupingInterval: 2_000,
    revalidateOnFocus: true,
  })
  const { trigger: writeGameSave, isMutating: isSaving } = useSWRMutation<
    GameSaveAck,
    Error,
    string,
    GameSavePayload
  >('/api/game/save', gameMutation)
  const { trigger: changePresence } = useSWRMutation<
    { online: boolean },
    Error,
    string,
    PresenceMutation
  >('/api/game/presence', gameMutation)
  const [saveReadyUserId, setSaveReadyUserId] = useState<string | null>(null)
  const [saveWriteFailed, setSaveWriteFailed] = useState(false)
  const [presenceWriteFailed, setPresenceWriteFailed] = useState(false)
  const hydratedUserIdRef = useRef<string | null>(null)
  const lastAccountUserIdRef = useRef<string | null>(null)
  const saveInFlightRef = useRef(false)
  const lastSavedPayloadRef = useRef('')
  const latestSavePayloadRef = useRef<GameSavePayload>(
    createGameSavePayload(STARTING_PLAYER, { x: -6, z: 4 }, 21 * 60 + 42),
  )
  const latestPresenceRef = useRef<PresenceUpdate>({ x: -6, z: 4, inVehicle: false, roomId: 'eko-mainland' })

  useEffect(() => {
    if (!currentUserId) {
      hydratedUserIdRef.current = null
      setSaveReadyUserId(null)
      setSaveWriteFailed(false)
      setPresenceWriteFailed(false)
      return
    }
    if (saveLoadError || saveLoading || !savedGame || hydratedUserIdRef.current === currentUserId) return

    const previousAccountId = lastAccountUserIdRef.current
    if (savedGame.save) {
      const restoredPosition = { ...savedGame.save.position }
      const restoredPlayer = { ...savedGame.save.playerState, name: currentUser?.name ?? STARTING_PLAYER.name }
      dispatch({ type: 'restore', player: restoredPlayer })
      setPlayerPosition(restoredPosition)
      setSpawnPosition(restoredPosition)
      setGameMinutes(savedGame.save.gameMinutes)
      lastSavedPayloadRef.current = JSON.stringify(
        createGameSavePayload(restoredPlayer, restoredPosition, savedGame.save.gameMinutes),
      )
    } else if (previousAccountId && previousAccountId !== currentUserId) {
      const resetPosition = { x: -6, z: 4 }
      const resetPlayer = { ...STARTING_PLAYER, name: currentUser?.name ?? STARTING_PLAYER.name }
      dispatch({ type: 'restore', player: resetPlayer })
      setPlayerPosition(resetPosition)
      setSpawnPosition(resetPosition)
      setGameMinutes(21 * 60 + 42)
      setPinnedWaypoint(null)
      lastSavedPayloadRef.current = ''
    } else {
      dispatch({ type: 'rename', name: currentUser?.name ?? STARTING_PLAYER.name })
      lastSavedPayloadRef.current = ''
    }

    hydratedUserIdRef.current = currentUserId
    lastAccountUserIdRef.current = currentUserId
    setSaveWriteFailed(false)
    setSaveReadyUserId(currentUserId)
  }, [currentUser?.name, currentUserId, saveLoadError, saveLoading, savedGame])

  useEffect(() => {
    latestSavePayloadRef.current = createGameSavePayload(player, playerPosition, gameMinutes)
  }, [gameMinutes, player, playerPosition])

  useEffect(() => {
    latestPresenceRef.current = {
      ...playerPosition,
      inVehicle: player.inVehicle,
      roomId: player.currentInteriorId ? `interior:${player.currentInteriorId}` : 'eko-mainland',
    }
  }, [player.currentInteriorId, player.inVehicle, playerPosition])

  const saveCurrentGame = useCallback(async () => {
    if (!currentUserId || saveReadyUserId !== currentUserId || saveInFlightRef.current) return
    const payload = latestSavePayloadRef.current
    const serializedPayload = JSON.stringify(payload)
    if (serializedPayload === lastSavedPayloadRef.current) return

    saveInFlightRef.current = true
    try {
      await writeGameSave(payload)
      lastSavedPayloadRef.current = serializedPayload
      setSaveWriteFailed(false)
    } catch {
      setSaveWriteFailed(true)
    } finally {
      saveInFlightRef.current = false
    }
  }, [currentUserId, saveReadyUserId, writeGameSave])

  useEffect(() => {
    if (!currentUserId || saveReadyUserId !== currentUserId) return
    void saveCurrentGame()
    const interval = window.setInterval(() => void saveCurrentGame(), 15_000)
    return () => window.clearInterval(interval)
  }, [currentUserId, saveCurrentGame, saveReadyUserId])

  useEffect(() => {
    if (!currentUserId || saveReadyUserId !== currentUserId) return
    const timeout = window.setTimeout(() => void saveCurrentGame(), 900)
    return () => window.clearTimeout(timeout)
  }, [currentUserId, gameMinutes, player, saveCurrentGame, saveReadyUserId])

  const publishCurrentPresence = useCallback(async () => {
    if (!currentUserId) return
    try {
      await changePresence(latestPresenceRef.current)
      setPresenceWriteFailed(false)
    } catch {
      setPresenceWriteFailed(true)
    }
  }, [changePresence, currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    void publishCurrentPresence()
    const interval = window.setInterval(() => void publishCurrentPresence(), 3_000)
    return () => window.clearInterval(interval)
  }, [currentUserId, publishCurrentPresence])

  const onlinePlayers = presenceResponse?.players ?? []
  const remotePlayers = useMemo(
    () => onlinePlayers.filter((onlinePlayer) => onlinePlayer.userId !== currentUserId),
    [currentUserId, onlinePlayers],
  )
  const saveStatus: SaveStatus = !currentUser
    ? 'local'
    : saveLoadError || saveWriteFailed
      ? 'error'
      : saveLoading || saveReadyUserId !== currentUserId
        ? 'loading'
        : isSaving
          ? 'saving'
          : 'saved'

  const handleAuthenticated = useCallback(async () => {
    await refreshSession()
  }, [refreshSession])

  const handleSignOut = useCallback(async () => {
    try {
      await changePresence({ method: 'DELETE' })
    } catch {
      setPresenceWriteFailed(true)
    }

    const result = await authClient.signOut()
    if (result.error) throw new Error('Sign-out failed')
    await refreshSession()
  }, [changePresence, refreshSession])

  const activeInterior = useMemo(
    () => player.currentInteriorId ? getInteriorDefinition(player.currentInteriorId) : null,
    [player.currentInteriorId],
  )
  const nearbyEntry = useMemo(() => {
    if (activeInterior) return null
    const closest = ENTERABLE_INTERIORS
      .map((entry) => ({ ...entry, distance: distanceBetween(playerPosition, entry.entrance) }))
      .sort((a, b) => a.distance - b.distance)[0]
    return closest && closest.distance < 3.5 ? closest : null
  }, [activeInterior, playerPosition])
  const nearbyInterior = nearbyEntry?.interior ?? null
  const nearbyCharacter = useMemo(() => {
    if (activeInterior) return null
    const closest = CITY_CHARACTERS
      .map((character) => ({ character, distance: distanceBetween(playerPosition, character) }))
      .sort((a, b) => a.distance - b.distance)[0]
    return closest && closest.distance < 4.8 ? closest.character : null
  }, [activeInterior, playerPosition])

  const nearbyLocation = useMemo(() => {
    if (activeInterior) return null
    const closest = WORLD_LOCATIONS
      .map((location) => ({ location, distance: distanceBetween(playerPosition, location) }))
      .sort((a, b) => a.distance - b.distance)[0]
    return closest && closest.distance < 7.5 ? closest.location : null
  }, [activeInterior, playerPosition])
  const nearInteriorAction = Boolean(activeInterior && distanceBetween(playerPosition, activeInterior.actionPoint) < 1.8)
  const prioritizeEntry = Boolean(nearbyEntry && (!nearbyCharacter || nearbyEntry.distance <= distanceBetween(playerPosition, nearbyCharacter)))
  const canExitInterior = Boolean(activeInterior && distanceBetween(playerPosition, activeInterior.exitPoint) < 2.35)

  const mission = getMissionDetails(player.stage)
  const waypoint = pinnedWaypoint ?? mission.targetLocation
  const paused = activePanel !== 'none' || activeCharacter !== null || worldTransitioning || Boolean(rideBooking && rideBooking.status !== 'arrived')

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

  useEffect(() => () => {
    rideTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId))
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
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

  const runWorldTransition = useCallback((updateWorld: () => void) => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
    setWorldTransitioning(true)
    transitionTimerRef.current = window.setTimeout(() => {
      updateWorld()
      transitionTimerRef.current = window.setTimeout(() => {
        setWorldTransitioning(false)
        transitionTimerRef.current = null
      }, 220)
    }, 150)
  }, [])

  const scheduleRideTimer = useCallback((delay: number, callback: () => void) => {
    const timerId = window.setTimeout(() => {
      rideTimerIdsRef.current = rideTimerIdsRef.current.filter((currentId) => currentId !== timerId)
      callback()
    }, delay)
    rideTimerIdsRef.current.push(timerId)
  }, [])

  const setMoveKey = useCallback((key: string, pressed: boolean) => {
    if (pressed) keysRef.current.add(key)
    else keysRef.current.delete(key)
  }, [])

  const handlePlayerPosition = useCallback((position: Position) => {
    setPlayerPosition(position)
  }, [])

  const handleLocationAction = useCallback((locationId: LocationId) => {
    if (locationId === 'polling') {
      if (player.voterRegistered) {
        notify('Your Ward 08 voter registration is already active.')
      } else {
        dispatch({ type: 'register-voter' })
        notify('Voter registration complete. +5 REP for taking part in city life.')
      }
      return
    }
    if (locationId === 'court') {
      if (player.wantedLevel > 0) {
        const fine = player.wantedLevel * 300
        if (player.cash < fine) {
          notify(`You need ${formatNaira(fine)} to settle the court fine.`)
          return
        }
        dispatch({ type: 'resolve-court' })
        notify(`Court fine settled · ${formatNaira(fine)}. Your record is clear.`)
      } else {
        notify('The public docket is clear. Your civic record is in good standing.')
      }
      return
    }
    if (locationId === 'police') {
      notify('The front desk is open. Community patrol shifts are on the Work board.')
      return
    }
    if (locationId === 'hospital') {
      dispatch({ type: 'rest' })
      setGameMinutes((minutes) => minutes + 180)
      notify('Amina helped you recover at Mainland General Hospital.')
      return
    }
    const home = CITY_HOMES.find((entry) => entry.id === player.home)
    if (home?.locationId === locationId || locationId === 'hotel') {
      dispatch({ type: 'rest' })
      setGameMinutes((minutes) => minutes + 420)
      notify(home ? `You rested at ${home.name}.` : 'You got a few hours of rest at Marina House.')
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
    const location = WORLD_LOCATIONS.find((entry) => entry.id === locationId)
    if (location) notify(`${location.name}: ${location.description}`)
  }, [notify, player.cash, player.inVehicle, player.ownsScooter, player.home, player.voterRegistered, player.wantedLevel])

  const handleInteract = useCallback(() => {
    if (activeCharacter || worldTransitioning) return
    if (activeInterior) {
      if (nearInteriorAction) {
        const location = WORLD_LOCATIONS.find((entry) => entry.id === activeInterior.id)
        if (location) handleLocationAction(location.id)
        else notify(`${activeInterior.name}: ${activeInterior.actionLabel} is available on site.`)
        return
      }
      if (!canExitInterior) {
        notify(`Walk to the service marker or front door in ${activeInterior.name}.`)
        return
      }
      const outsidePosition = player.returnPosition ?? playerPosition
      keysRef.current.clear()
      setAutoWalkTarget(null)
      runWorldTransition(() => {
        dispatch({ type: 'exit-interior' })
        setSpawnPosition(outsidePosition)
        setPlayerPosition(outsidePosition)
        notify(`You stepped outside ${activeInterior.name}.`)
      })
      return
    }
    if (nearbyCharacter && !prioritizeEntry) {
      keysRef.current.clear()
      setActiveCharacter(nearbyCharacter.id)
      return
    }
    if (nearbyEntry) {
      keysRef.current.clear()
      setAutoWalkTarget(null)
      const insidePosition = { x: 0, z: 3.2 }
      runWorldTransition(() => {
        dispatch({ type: 'enter-interior', interiorId: nearbyEntry.interior.id, returnPosition: nearbyEntry.entrance })
        setSpawnPosition(insidePosition)
        setPlayerPosition(insidePosition)
        notify(`You entered ${nearbyEntry.interior.name}. Press E at the front door to step outside.`)
      })
      return
    }
    if (nearbyLocation) handleLocationAction(nearbyLocation.id)
  }, [activeCharacter, activeInterior, canExitInterior, handleLocationAction, nearbyCharacter, nearbyEntry, nearbyLocation, nearInteriorAction, notify, player.returnPosition, playerPosition, prioritizeEntry, runWorldTransition, worldTransitioning])

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
      default: {
        const character = CITY_CHARACTERS.find((entry) => entry.id === activeCharacter)
        notify(character ? `${character.name}: ${character.intro}` : 'The city is full of stories.')
      }
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

  const handleTravel = useCallback((locationId: LocationId, mode: TravelMode) => {
    const location = WORLD_LOCATIONS.find((entry) => entry.id === locationId)
    if (!location) return
    setPinnedWaypoint(locationId)

    if (mode === 'walk') {
      setAutoWalkTarget(locationId)
      closePanel()
      notify(`Walking to ${location.name}. Your route leads to its entrance; use the controls to take over.`)
      return
    }

    if (mode === 'drive') {
      setAutoWalkTarget(null)
      closePanel()
      if (!player.ownsScooter) {
        setPinnedWaypoint('garage')
        notify('Visit Mainland Motors to rent a scooter before self-driving.')
        return
      }
      if (!player.inVehicle) dispatch({ type: 'toggle-vehicle' })
      notify(`Scooter ready. Follow the marked route to ${location.name}.`)
      return
    }

    if (rideBooking && rideBooking.status !== 'arrived') {
      notify('Your current ride is already on the way.')
      return
    }

    const fare = estimateRideFare(distanceBetween(playerPosition, location), mode)
    if (player.cash < fare) {
      notify(`You need ${formatNaira(fare)} for this ride.`)
      return
    }

    setAutoWalkTarget(null)
    keysRef.current.clear()
    closePanel()
    const rideId = rideSequenceRef.current + 1
    rideSequenceRef.current = rideId
    dispatch({ type: 'pay-ride', amount: fare })
    const rideName = mode === 'bike' ? 'Okada' : mode === 'danfo' ? 'Danfo' : mode === 'driver' ? 'Private driver' : 'City cab'
    setRideBooking({ id: rideId, destinationId: locationId, mode, fare, status: 'dispatching' })
    notify(`${rideName} requested for ${formatNaira(fare)}. A driver is finding your pickup.`)

    const updateStatus = (status: RideBookingStatus) => {
      setRideBooking((current) => current?.id === rideId ? { ...current, status } : current)
    }
    scheduleRideTimer(1400, () => updateStatus('approaching'))
    scheduleRideTimer(2600, () => updateStatus('boarding'))
    scheduleRideTimer(4100, () => updateStatus('en-route'))
    scheduleRideTimer(6600, () => {
      const destination = getLocationEntrancePosition(locationId) ?? { x: location.x, z: location.z }
      runWorldTransition(() => {
        setSpawnPosition(destination)
        setPlayerPosition(destination)
        updateStatus('arrived')
        notify(`You arrived at ${location.name}. Fare paid: ${formatNaira(fare)}.`)
      })
    })
    scheduleRideTimer(10800, () => {
      setRideBooking((current) => current?.id === rideId ? null : current)
    })
  }, [closePanel, notify, player.cash, player.inVehicle, player.ownsScooter, playerPosition, rideBooking, runWorldTransition, scheduleRideTimer])

  const applyJob = useCallback((jobId: JobId) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    if (!job) return
    dispatch({ type: 'apply-job', jobId })
    setPinnedWaypoint(job.locationId)
    notify(`You are on the roster at ${job.employer}. Route marked.`)
  }, [notify])

  const completeShift = useCallback((jobId: JobId) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    const workplace = job && WORLD_LOCATIONS.find((entry) => entry.id === job.locationId)
    if (!job || !workplace || player.job !== jobId) return
    if (distanceBetween(playerPosition, workplace) > 8) {
      setPinnedWaypoint(job.locationId)
      notify(`Clock in at ${job.employer} to complete the shift.`)
      return
    }
    dispatch({ type: 'complete-shift', jobId })
    setGameMinutes((minutes) => minutes + 120)
    notify(`Shift complete · +${formatNaira(job.pay)} · +${job.reputation} REP.`)
  }, [notify, player.job, playerPosition])

  const joinFaction = useCallback((factionId: FactionId | null) => {
    if (factionId && !CITY_FACTIONS.some((faction) => faction.id === factionId)) return
    dispatch({ type: 'join-faction', factionId })
    const faction = CITY_FACTIONS.find((entry) => entry.id === factionId)
    notify(faction ? `You joined ${faction.name}.` : 'You left your faction and are independent again.')
  }, [notify])

  const leaseHome = useCallback((homeId: HomeId) => {
    const home = CITY_HOMES.find((entry) => entry.id === homeId)
    if (!home) return
    if (player.home) {
      notify('You already have a home registered. Visit it to rest.')
      return
    }
    if (player.cash < home.price) {
      notify(`You need ${formatNaira(home.price)} to secure this home.`)
      return
    }
    dispatch({ type: 'lease-home', homeId })
    setPinnedWaypoint(home.locationId)
    notify(`${home.name} is yours. Its address is marked on the map.`)
  }, [notify, player.cash, player.home])

  const registerVoter = useCallback(() => {
    if (player.voterRegistered) {
      notify('Your Ward 08 voter registration is already active.')
      return
    }
    const pollingUnit = WORLD_LOCATIONS.find((location) => location.id === 'polling')
    if (!pollingUnit || distanceBetween(playerPosition, pollingUnit) > 8) {
      setPinnedWaypoint('polling')
      notify('Visit Ward 08 Polling Unit to register.')
      return
    }
    dispatch({ type: 'register-voter' })
    notify('Voter registration complete. +5 REP for taking part in city life.')
  }, [notify, player.voterRegistered, playerPosition])

  const resolveCourt = useCallback(() => {
    if (player.wantedLevel < 1) {
      setPinnedWaypoint('court')
      notify('Your civic record is clear. The public docket is at Lagos High Court.')
      return
    }
    const court = WORLD_LOCATIONS.find((location) => location.id === 'court')
    if (!court || distanceBetween(playerPosition, court) > 8) {
      setPinnedWaypoint('court')
      notify('Attend the hearing at Lagos High Court to settle the open case.')
      return
    }
    const fine = player.wantedLevel * 300
    if (player.cash < fine) {
      notify(`You need ${formatNaira(fine)} to settle the court fine.`)
      return
    }
    dispatch({ type: 'resolve-court' })
    notify(`Court fine settled · ${formatNaira(fine)}. Your record is clear.`)
  }, [notify, player.cash, player.wantedLevel, playerPosition])

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
      } else if (key === 'p') {
        openPanel('life')
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
        rideVehicle={rideBooking && (rideBooking.status === 'boarding' || rideBooking.status === 'en-route') ? rideBooking.mode : null}
        gender={player.gender}
        activeInterior={activeInterior}
        paused={paused}
        waypoint={waypoint}
        autoWalkTarget={autoWalkTarget}
        spawnPosition={spawnPosition}
        remotePlayers={remotePlayers}
        gameMinutes={gameMinutes}
      />
      <div className={`world-transition${worldTransitioning ? ' is-active' : ''}`} aria-hidden="true" />
      <div className="world-vignette" aria-hidden="true" />
      <GameHud
        player={player}
        isOnline={Boolean(currentUser)}
        gameMinutes={gameMinutes}
        playerPosition={playerPosition}
        nearbyCharacter={nearbyCharacter}
        nearbyLocation={nearbyLocation}
        nearbyInterior={nearbyInterior}
        prioritizeInterior={prioritizeEntry}
        activeInterior={activeInterior}
        nearInteriorAction={nearInteriorAction}
        canExitInterior={canExitInterior}
        rideBooking={rideBooking}
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
          onTravel={handleTravel}
          onApplyJob={applyJob}
          onCompleteShift={completeShift}
          onJoinFaction={joinFaction}
          onLeaseHome={leaseHome}
          onRegisterVoter={registerVoter}
          onResolveCourt={resolveCourt}
          user={currentUser}
          sessionLoading={sessionLoading}
          players={onlinePlayers}
          presenceError={Boolean(currentUser && (presenceLoadError || presenceWriteFailed))}
          saveStatus={saveStatus}
          onAuthenticated={handleAuthenticated}
          onSignOut={handleSignOut}
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
