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
import { ServiceSheet } from './interior-ui'
import { AdminPanel } from './admin-panel'
import type { RideEvent, RideKind, RideState } from './ride-vehicle'
import { SettingsSheet } from './settings-sheet'
import type { AdminPowers, GraphicsQuality } from './city-world'

const CityWorld = dynamic(() => import('./city-world').then((module) => module.CityWorld), {
  ssr: false,
  loading: () => <div className="world-loading" aria-hidden="true"><span /><span /><span /></div>,
})

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'shiftleft', 'shiftright'])

type Position = GamePosition
type ToastState = { id: number; text: string } | null

const fetchGameSave = ([url]: readonly [string, string]) => gameFetcher<GameSaveResponse>(url)
const CITY_ROOM_ID = 'eko-mainland'
/** A full in-game day lasts 24 real minutes: 2 game minutes every 2 seconds. */
const RIDE_NAMES = { cab: 'Cab', bike: 'Okada', driver: 'Private driver' } as const
const START_GAME_MINUTES = 8 * 60 + 30
const CLOCK_STEP_MINUTES = 2
const CLOCK_TICK_MS = 2000
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
      fun: player.fun,
      hygiene: player.hygiene,
      bladder: player.bladder,
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
  const HOME_INTERIOR_ID = 'marina-apartments' as const
const HOME_INTERIOR_POSITION: Position = { x: 0, z: 3.2 }
const HOME_CITY_POSITION: Position = { x: -76, z: -48.9 }

  const [playerPosition, setPlayerPosition] = useState<Position>(HOME_INTERIOR_POSITION)
  const [spawnPosition, setSpawnPosition] = useState<Position>(HOME_INTERIOR_POSITION)
  const [gameMinutes, setGameMinutes] = useState(START_GAME_MINUTES)
  const [activePanel, setActivePanel] = useState<GamePanel>('none')
  const [activeCharacter, setActiveCharacter] = useState<CharacterId | null>(null)
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false)
  const [pinnedWaypoint, setPinnedWaypoint] = useState<LocationId | null>(null)
  const [autoWalkTarget, setAutoWalkTarget] = useState<LocationId | null>(null)
  const [rideBooking, setRideBooking] = useState<RideBooking | null>(null)
  const [worldTransitioning, setWorldTransitioning] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [fadeActive, setFadeActive] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ride, setRide] = useState<RideState | null>(null)
  const rideIdRef = useRef(0)
  const [adminOpen, setAdminOpen] = useState(false)
  const [quality, setQuality] = useState<GraphicsQuality>('medium')
  const [lookSensitivity, setLookSensitivity] = useState(1)
  const [adminPowers, setAdminPowers] = useState<AdminPowers>({ speed: 1, noclip: false, fly: false })
  const [godMode, setGodMode] = useState(false)
  const [invisible, setInvisible] = useState(false)
  const adminPowersRef = useRef<AdminPowers>({ speed: 1, noclip: false, fly: false })
  const lastAnnouncementRef = useRef<string | null>(null)
  const fadeRef = useRef(false)
  const transitionTimers = useRef<number[]>([])
  const joystickRef = useRef({ x: 0, y: 0 })
  const invisibleRef = useRef(false)
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
  const isAdmin = Boolean(currentUser?.isAdmin)
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
    createGameSavePayload(STARTING_PLAYER, HOME_INTERIOR_POSITION, 21 * 60 + 42),
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
      const homeSpawn = !restoredPlayer.currentInteriorId && !restoredPlayer.returnPosition
      if (homeSpawn) {
        restoredPlayer.currentInteriorId = HOME_INTERIOR_ID
        restoredPlayer.returnPosition = HOME_CITY_POSITION
      }
      const effectivePosition = homeSpawn ? HOME_INTERIOR_POSITION : restoredPosition
      dispatch({ type: 'restore', player: restoredPlayer })
      setPlayerPosition(effectivePosition)
      setSpawnPosition(effectivePosition)
      setGameMinutes(savedGame.save.gameMinutes)
      lastSavedPayloadRef.current = JSON.stringify(
        createGameSavePayload(restoredPlayer, effectivePosition, savedGame.save.gameMinutes),
      )
    } else if (previousAccountId && previousAccountId !== currentUserId) {
      const resetPosition = HOME_INTERIOR_POSITION
      const resetPlayer = { ...STARTING_PLAYER, name: currentUser?.name ?? STARTING_PLAYER.name }
      dispatch({ type: 'restore', player: resetPlayer })
      setPlayerPosition(resetPosition)
      setSpawnPosition(resetPosition)
      setGameMinutes(START_GAME_MINUTES)
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
    if (!currentUserId || invisibleRef.current) return
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
    const paused = activePanel !== 'none' || activeCharacter !== null || serviceSheetOpen || worldTransitioning || Boolean(rideBooking && rideBooking.status !== 'arrived')

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
    // Two in-game minutes pass every two real seconds: one full day takes 24 minutes.
    const timer = window.setInterval(() => {
      setGameMinutes((minutes) => (minutes + CLOCK_STEP_MINUTES) % (24 * 60))
      dispatch({ type: 'decay-needs' })
    }, CLOCK_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    rideTimerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId))
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
  }, [])

  const openPanel = useCallback((panel: Exclude<GamePanel, 'none'>) => {
    keysRef.current.clear()
    setActiveCharacter(null)
    setServiceSheetOpen(false)
    setActivePanel((current) => (current === panel ? 'none' : panel))
  }, [])

  const switchPanel = useCallback((panel: Exclude<GamePanel, 'none'>) => {
    keysRef.current.clear()
    setActiveCharacter(null)
    setServiceSheetOpen(false)
    setActivePanel(panel)
  }, [])

  const closePanel = useCallback(() => {
    keysRef.current.clear()
    setActivePanel('none')
    setServiceSheetOpen(false)
  }, [])

  const closeServiceSheet = useCallback(() => {
    keysRef.current.clear()
    setServiceSheetOpen(false)
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

  const handleInteriorServiceAction = useCallback(() => {
    if (!activeInterior) return
    const location = WORLD_LOCATIONS.find((entry) => entry.id === activeInterior.id)
    if (location) handleLocationAction(location.id)
    else notify(`${activeInterior.name}: ${activeInterior.actionLabel} is available on site.`)
  }, [activeInterior, handleLocationAction, notify])

  const changeQuality = useCallback((next: GraphicsQuality) => {
    setQuality(next)
    try { window.localStorage.setItem('eko-quality', next) } catch { /* storage may be unavailable */ }
  }, [])

  const changeLookSensitivity = useCallback((next: number) => {
    setLookSensitivity(next)
    try { window.localStorage.setItem('eko-look', String(next)) } catch { /* storage may be unavailable */ }
  }, [])

  useEffect(() => {
    try {
      const savedQuality = window.localStorage.getItem('eko-quality')
      if (savedQuality === 'low' || savedQuality === 'medium' || savedQuality === 'high') setQuality(savedQuality)
      else if (window.matchMedia('(max-width: 760px)').matches) setQuality('low')
      const savedLook = Number(window.localStorage.getItem('eko-look'))
      if (Number.isFinite(savedLook) && savedLook >= 0.4 && savedLook <= 2) setLookSensitivity(savedLook)
    } catch { /* storage may be unavailable */ }
  }, [])

  useEffect(() => { adminPowersRef.current = isAdmin ? adminPowers : { speed: 1, noclip: false, fly: false } }, [adminPowers, isAdmin])

  const teleportTo = useCallback((x: number, z: number) => {
    keysRef.current.clear()
    setAutoWalkTarget(null)
    setServiceOpen(false)
    if (player.currentInteriorId) dispatch({ type: 'exit-interior' })
    setSpawnPosition({ x, z })
    setPlayerPosition({ x, z })
  }, [player.currentInteriorId])

  // God mode keeps an admin's vitals topped up.
  useEffect(() => {
    if (!isAdmin || !godMode) return
    const interval = window.setInterval(() => dispatch({ type: 'admin-adjust', restore: true }), 1500)
    return () => window.clearInterval(interval)
  }, [godMode, isAdmin])

  useEffect(() => {
    invisibleRef.current = invisible
    if (invisible && currentUserId) void changePresence({ method: 'DELETE' }).catch(() => undefined)
  }, [changePresence, currentUserId, invisible])

  // Poll for admin actions aimed at this player and for city announcements.
  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    const poll = async () => {
      try {
        const response = await fetch('/api/game/commands', { cache: 'no-store' })
        if (!response.ok || cancelled) return
        const data = (await response.json()) as import('@/lib/game/types').CommandsResponse
        if (data.announcement && data.announcement.id !== lastAnnouncementRef.current) {
          const first = lastAnnouncementRef.current === null && Date.now() - new Date(data.announcement.createdAt).getTime() > 60_000
          lastAnnouncementRef.current = data.announcement.id
          if (!first) notify(`📢 City announcement: ${data.announcement.message}`)
        }
        for (const command of data.commands) {
          const payload = command.payload
          if (command.type === 'give-cash' && typeof payload.amount === 'number') {
            dispatch({ type: 'admin-adjust', cash: payload.amount })
            notify(`An admin ${payload.amount >= 0 ? 'sent you' : 'took'} ${formatNaira(Math.abs(payload.amount))}.`)
          } else if (command.type === 'heal') {
            dispatch({ type: 'admin-adjust', restore: true })
            notify('An admin restored your energy and hunger.')
          } else if (command.type === 'teleport' && typeof payload.x === 'number' && typeof payload.z === 'number') {
            teleportTo(payload.x, payload.z)
            notify('An admin moved you.')
          } else if (command.type === 'set-time' && typeof payload.minutes === 'number') {
            setGameMinutes(payload.minutes)
            notify('An admin changed the time of day.')
          } else if (command.type === 'notify' && typeof payload.message === 'string') {
            notify(`Admin: ${payload.message}`)
          } else if (command.type === 'kick' && typeof payload.message === 'string') {
            notify(payload.message)
            void changePresence({ method: 'DELETE' }).catch(() => undefined)
          }
        }
      } catch {
        /* the next poll will try again */
      }
    }
    void poll()
    const interval = window.setInterval(() => void poll(), 6000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [changePresence, currentUserId, notify, teleportTo])

  const handleRideEvent = useCallback((event: RideEvent) => {
    if (event.type === 'arrived') {
      setRide((current) => (current && current.phase === 'arriving' ? { ...current, phase: 'waiting', pickup: event.at } : current))
      notify('Your ride has arrived. Walk to it and press E to board.')
    } else if (event.type === 'completed') {
      setRide((current) => {
        if (!current) return current
        setSpawnPosition({ x: current.destination.x, z: current.destination.z + 1.6 })
        setPlayerPosition({ x: current.destination.x, z: current.destination.z + 1.6 })
        return null
      })
      notify('You have arrived. Thanks for riding.')
    } else {
      setRide(null)
      notify('The driver could not find a route and the booking was cancelled.')
    }
  }, [notify])

  const cancelRide = useCallback(() => {
    setRide((current) => (current && current.phase !== 'riding' ? null : current))
    notify('Ride cancelled.')
  }, [notify])

  const nearWaitingRide = ride?.phase === 'waiting' && ride.pickup !== null && distanceBetween(playerPosition, ride.pickup) < 7

  const handleApartmentAction = useCallback((action: 'rest' | 'shower' | 'toilet' | 'food' | 'cook' | 'tv' | 'study') => {
    if (activeInterior?.id !== HOME_INTERIOR_ID || worldTransitioning) return
    const actions = {
      rest: { type: 'rest' as const, message: 'You rested at home. Energy restored.' },
      shower: { type: 'shower' as const, message: 'You took a refreshing shower. Hygiene restored.' },
      toilet: { type: 'use-toilet' as const, message: 'Bathroom used. You are ready to go.' },
      food: { type: 'buy-food' as const, message: player.cash >= 90 ? 'Food added to your home inventory for ₦90.' : 'You need ₦90 to buy food.' },
      cook: { type: 'eat-food' as const, message: player.inventory.some((item) => item.id === 'suya' && item.quantity > 0) ? 'You prepared a meal. Hunger and energy restored.' : 'There is no food in your inventory. Use the fridge to buy food.' },
      tv: { type: 'socialize' as const, message: 'You relaxed with a TV programme. Fun increased.' },
      study: { type: 'attend-lecture' as const, message: player.energy >= 12 && player.hunger >= 5 ? 'You completed a study session.' : 'You need more energy and food before studying.' },
    }[action]
    dispatch({ type: actions.type } as Parameters<typeof dispatch>[0])
    notify(actions.message)
  }, [activeInterior, notify, player.cash, player.energy, player.hunger, player.inventory, worldTransitioning])

  const handleGoOutside = useCallback(() => {
    if (!activeInterior || activeInterior.id !== HOME_INTERIOR_ID || worldTransitioning) return
    const outsidePosition = player.returnPosition ?? HOME_CITY_POSITION
    keysRef.current.clear()
    setAutoWalkTarget(null)
    runWorldTransition(() => {
      dispatch({ type: 'exit-interior' })
      setSpawnPosition(outsidePosition)
      setPlayerPosition(outsidePosition)
      notify('Welcome outside. The city is yours to explore.')
    })
  }, [activeInterior, notify, player.returnPosition, runWorldTransition, worldTransitioning])

  const handleInteract = useCallback(() => {
    if (activeCharacter || worldTransitioning) return
    if (activeInterior) {
      if (nearInteriorAction) {
        keysRef.current.clear()
        setServiceSheetOpen(true)
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
    if (nearWaitingRide) {
      keysRef.current.clear()
      setRide((current) => (current ? { ...current, phase: 'riding' } : current))
      notify('Boarded. Sit back and enjoy the ride.')
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
        setServiceSheetOpen(false)
        dispatch({ type: 'enter-interior', interiorId: nearbyEntry.interior.id, returnPosition: nearbyEntry.entrance })
        setSpawnPosition(insidePosition)
        setPlayerPosition(insidePosition)
        notify(`You entered ${nearbyEntry.interior.name}. Press E at the front door to step outside.`)
      })
      return
    }
    if (nearbyLocation) handleLocationAction(nearbyLocation.id)
  }, [activeCharacter, activeInterior, canExitInterior, handleLocationAction, nearInteriorAction, nearWaitingRide, nearbyCharacter, nearbyEntry, nearbyLocation, notify, player.returnPosition, playerPosition, prioritizeEntry, runWorldTransition])

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

  const depositBank = useCallback((amount: number) => {
    if (!activeInterior || activeInterior.kind !== 'bank') return
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      notify('Enter a positive whole-naira amount.')
      return
    }
    if (amount > player.cash) {
      notify('There is not enough cash in your wallet for that deposit.')
      return
    }
    if (player.bankBalance + amount > 1_000_000) {
      notify('Your bank account has a ₦1,000,000 balance limit.')
      return
    }
    dispatch({ type: 'deposit-bank', amount })
    notify(`Deposited ${formatNaira(amount)} into your account.`)
  }, [activeInterior, notify, player.bankBalance, player.cash])

  const withdrawBank = useCallback((amount: number) => {
    if (!activeInterior || activeInterior.kind !== 'bank') return
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      notify('Enter a positive whole-naira amount.')
      return
    }
    if (amount > player.bankBalance) {
      notify('Your bank balance is too low for that withdrawal.')
      return
    }
    if (player.cash + amount > 1_000_000) {
      notify('Your wallet has a ₦1,000,000 cash limit.')
      return
    }
    dispatch({ type: 'withdraw-bank', amount })
    notify(`Withdrew ${formatNaira(amount)} to your wallet.`)
  }, [activeInterior, notify, player.bankBalance, player.cash])

  const attendLecture = useCallback(() => {
    if (!activeInterior || (activeInterior.kind !== 'university' && activeInterior.kind !== 'school')) return
    if (player.energy < 12 || player.hunger < 5) {
      notify('You need at least 12 energy and 5 hunger to study.')
      return
    }
    dispatch({ type: 'attend-lecture' })
    setGameMinutes((minutes) => minutes + 60)
    notify('Class complete · +1 study credit · +8 REP.')
  }, [activeInterior, notify, player.energy, player.hunger])

  const restAtInterior = useCallback(() => {
    if (!activeInterior) return
    const home = CITY_HOMES.find((entry) => entry.id === player.home)
    const isHospital = activeInterior.kind === 'hospital'
    const isHotel = activeInterior.kind === 'hotel'
    const isOwnedHome = home?.locationId === activeInterior.id
    if (!isHospital && !isHotel && !isOwnedHome) return

    dispatch({ type: 'rest' })
    setGameMinutes((minutes) => minutes + (isHospital ? 180 : 420))
    notify(isHospital ? `Recovery complete at ${activeInterior.name}.` : isOwnedHome ? `You rested at ${home.name}.` : 'You got a few hours of rest at Marina House.')
  }, [activeInterior, notify, player.home])

  const startInteriorShift = useCallback((jobId: JobId) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    if (!job || !activeInterior || job.locationId !== activeInterior.id) return
    if (player.job !== jobId) {
      notify('Apply for this role from the Work Board before starting a shift.')
      return
    }
    if (player.shiftStarted) {
      notify('Your current shift is already underway.')
      return
    }
    dispatch({ type: 'start-shift', jobId })
    notify(`Shift started at ${job.employer}. Complete all ${job.tasks.length} tasks before clocking out.`)
  }, [activeInterior, notify, player.job, player.shiftStarted])

  const completeInteriorTask = useCallback((jobId: JobId, taskIndex: number) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    if (!job || !activeInterior || job.locationId !== activeInterior.id || player.job !== jobId || !player.shiftStarted) return
    if (!Number.isSafeInteger(taskIndex) || taskIndex < 0 || taskIndex >= job.tasks.length || player.completedShiftTasks.includes(taskIndex)) return
    dispatch({ type: 'complete-work-task', jobId, taskIndex })
    notify(`Work task complete: ${job.tasks[taskIndex]}.`)
  }, [activeInterior, notify, player.completedShiftTasks, player.job, player.shiftStarted])

  const clockOutInteriorShift = useCallback((jobId: JobId) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    if (!job || !activeInterior || job.locationId !== activeInterior.id || player.job !== jobId || !player.shiftStarted) return
    const completedTaskCount = job.tasks.filter((_, index) => player.completedShiftTasks.includes(index)).length
    if (completedTaskCount !== job.tasks.length) {
      notify(`Complete all shift tasks before clocking out (${completedTaskCount}/${job.tasks.length}).`)
      return
    }
    dispatch({ type: 'complete-shift', jobId })
    setGameMinutes((minutes) => minutes + 120)
    setPinnedWaypoint(null)
    closeServiceSheet()
    notify(`Shift complete · +${formatNaira(job.pay)} · +${job.reputation} REP.`)
  }, [activeInterior, closeServiceSheet, notify, player.completedShiftTasks, player.job, player.shiftStarted])

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
    setAutoWalkTarget(null)
    if (mode === 'cab' || mode === 'bike' || mode === 'driver') {
      if (ride) {
        notify('You already have a ride booked. Cancel it first to book another.')
        return
      }
      if (player.currentInteriorId) {
        notify('Step outside before booking a ride.')
        return
      }
      const destination = getLocationEntrancePosition(locationId) ?? location
      rideIdRef.current += 1
      setRide({ id: rideIdRef.current, kind: mode as RideKind, phase: 'arriving', destination: { x: destination.x, z: destination.z }, pickup: null })
      closePanel()
      notify(`${RIDE_NAMES[mode]} booked. Watch the road: your driver is on the way. Stay where you are.`)
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
    notify(messages[mode])
  }, [closePanel, notify, player.currentInteriorId, ride])

  const applyJob = useCallback((jobId: JobId) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    if (!job) return
    if (player.shiftStarted) {
      notify('Finish your current shift before changing roles.')
      return
    }
    dispatch({ type: 'apply-job', jobId })
    setPinnedWaypoint(job.locationId)
    notify(`You are on the roster at ${job.employer}. Route marked.`)
  }, [notify, player.shiftStarted])

  const completeShift = useCallback((jobId: JobId) => {
    const job = CITY_JOBS.find((entry) => entry.id === jobId)
    const workplace = job && WORLD_LOCATIONS.find((entry) => entry.id === job.locationId)
    if (!job || !workplace || player.job !== jobId) return
    const isAtWork = activeInterior
      ? activeInterior.id === job.locationId
      : distanceBetween(playerPosition, workplace) <= 8
    if (!isAtWork) {
      setPinnedWaypoint(job.locationId)
      notify(`Clock in at ${job.employer} to complete the shift.`)
      return
    }
    const completedTaskCount = job.tasks.reduce(
      (count, _, index) => count + Number(player.completedShiftTasks.includes(index)),
      0,
    )
    if (!player.shiftStarted) {
      closePanel()
      notify(`Use the on-site service desk at ${job.employer} to start your shift.`)
      return
    }
    if (completedTaskCount < job.tasks.length) {
      closePanel()
      notify(`Complete the work checklist at ${job.employer} before clocking out (${completedTaskCount}/${job.tasks.length}).`)
      return
    }
    dispatch({ type: 'complete-shift', jobId })
    setGameMinutes((minutes) => minutes + 120)
    setPinnedWaypoint(null)
    closePanel()
    notify(`Shift complete · +${formatNaira(job.pay)} · +${job.reputation} REP.`)
  }, [activeInterior, closePanel, notify, player.completedShiftTasks, player.job, player.shiftStarted, playerPosition])

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
      const key = event.key.toLowerCase()
      if (key === 'escape') {
        if (event.repeat) return
        keysRef.current.clear()
        if (serviceSheetOpen) closeServiceSheet()
        else {
          setActiveCharacter(null)
          closePanel()
        }
        return
      }
      if (serviceSheetOpen || isTyping(event.target)) return
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
        setServiceOpen(false)
        setSettingsOpen(false)
        setAdminOpen(false)
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
  }, [closePanel, closeServiceSheet, handleInteract, openPanel, paused, serviceSheetOpen])

  return (
    <main className="game-shell" aria-label="Eko After Hours roleplay game">
      <CityWorld
        keysRef={keysRef}
        joystickRef={joystickRef}
        quality={quality}
        ride={ride}
        onRideEvent={handleRideEvent}
        isAdmin={isAdmin}
        adminPowersRef={adminPowersRef}
        lookSensitivity={lookSensitivity}
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
        onGoOutside={handleGoOutside}
        onApartmentAction={handleApartmentAction}
        rideBooking={rideBooking}
        waypoint={waypoint}
        activePanel={activePanel}
        toast={toast}
        onOpenPanel={openPanel}
        onInteract={handleInteract}
        onMoveKey={setMoveKey}
        joystickRef={joystickRef}
        rideStatus={ride ? (ride.phase === 'arriving' ? 'Your ride is on its way' : ride.phase === 'waiting' ? (nearWaitingRide ? 'Your ride is here: press E to board' : 'Your ride is waiting nearby') : 'On the way to your destination') : null}
        canCancelRide={ride !== null && ride.phase !== 'riding'}
        onCancelRide={cancelRide}
        nearWaitingRide={nearWaitingRide}
        isAdmin={isAdmin}
        onOpenSettings={() => { keysRef.current.clear(); setSettingsOpen(true) }}
      />
      {activePanel !== 'none' && activePanel !== 'admin' && (
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
      {settingsOpen && (
        <SettingsSheet
          quality={quality}
          lookSensitivity={lookSensitivity}
          isAdmin={isAdmin}
          onQuality={changeQuality}
          onLookSensitivity={changeLookSensitivity}
          onOpenAdmin={() => { setSettingsOpen(false); setAdminOpen(true) }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {adminOpen && isAdmin && (
        <AdminPanel
          onClose={() => setAdminOpen(false)}
          playerPosition={playerPosition}
          gameMinutes={gameMinutes}
          powers={adminPowers}
          godMode={godMode}
          invisible={invisible}
          onPowers={(next) => setAdminPowers((current) => ({ ...current, ...next }))}
          onGodMode={setGodMode}
          onInvisible={setInvisible}
          onTeleport={teleportTo}
          onGiveSelf={(cash) => { dispatch({ type: 'admin-adjust', cash }); notify(`Added ${formatNaira(cash)}.`) }}
          onRestoreSelf={() => { dispatch({ type: 'admin-adjust', restore: true }); notify('Vitals restored.') }}
          onSetOwnTime={(minutes) => { setGameMinutes(minutes); notify('Time changed for you.') }}
          notify={notify}
        />
      )}
      {serviceOpen && activeInterior && (
        <ServiceSheet
          key={activeInterior.id}
          interior={activeInterior}
          player={player}
          onClose={closeServiceSheet}
          onServiceAction={handleInteriorServiceAction}
          onBuyFood={buyFood}
          onRest={restAtInterior}
          onAttendLecture={attendLecture}
          onDeposit={depositBank}
          onWithdraw={withdrawBank}
          onStartShift={startInteriorShift}
          onCompleteTask={completeInteriorTask}
          onClockOut={clockOutInteriorShift}
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
