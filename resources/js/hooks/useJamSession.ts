import React, {
	useEffect,
	useMemo,
	useRef,
	useState,
	createContext,
	useContext,
	type ReactNode,
} from "react"
import axios from "axios"
import { usePlayer, type Track } from "@/hooks/usePlayer"

export type JamRole = "host" | "guest"

export type JamParticipant = {
	id: string
	name: string
	role: JamRole
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

type StartJamOptions = {
	tracks?: Track[]
	seedType?: string
	seedId?: string
}

type ApiParticipant = {
	id?: string | number
	name?: string
	role?: string
}

type ApiQueueItem = {
	position: number
	queue_item_id?: string
	track: any
}

type ApiJamResponse = {
	jam: {
		id: string
		seed_type: string
		seed_id: string
		allow_controls: boolean
		host_user_id: string | number
		queue_version?: number
	}
	participants?: ApiParticipant[]
	queue?: ApiQueueItem[]
	playback?: {
		position: number
		offset_ms: number
		is_playing: boolean
	} | null
}

type JamPlaybackState = {
	position: number
	offset_ms: number
	is_playing: boolean
	ts_ms?: number
	allow_controls?: boolean
}

type JamSessionValue = {
	sessionId: string | null
	isHost: boolean
	participants: JamParticipant[]
	inviteLink: string | null
	qrUrl: string | null
	status: ConnectionStatus
	allowControls: boolean
	setAllowControls: (value: boolean) => void
	sharedQueue: Track[]
	addToJamQueue: (tracks: Track[]) => Promise<void> | void
	removeFromQueue: (trackId: string) => Promise<void> | void
	startJam: (options?: StartJamOptions) => Promise<void> | void
	endJam: () => void
	joinJam: (id: string) => Promise<boolean>
	canControl: boolean
}

const JamSessionContext = createContext<JamSessionValue | null>(null)

const randomId = () => {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID()
	}
	return Math.random().toString(36).slice(2)
}

const isJamDebugEnabled = () => {
	if (typeof window === "undefined") return false
	try {
		return window.localStorage.getItem("jamDebug") === "1"
	} catch {
		return false
	}
}

const coerceBoolean = (value: any): boolean => {
	if (typeof value === "boolean") return value
	if (typeof value === "number") return value !== 0
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase()
		if (normalized === "true" || normalized === "1") return true
		if (normalized === "false" || normalized === "0" || normalized === "")
			return false
		return true
	}
	return Boolean(value)
}

// Normalise track objects coming from various backends (API, WS relay, storage)
// into the flat Player Track shape used by the player and Jam UI.
const normalizeTrackFromWire = (input: any): Track => {
	if (!input) {
		return {
			id: randomId(),
			name: "Unknown Track",
			artist: "Unknown Artist",
			artist_id: "",
			album: "Unknown Album",
			album_id: undefined,
			album_cover: undefined,
			duration: 0,
			audio: null,
		}
	}

	const raw = input as any
	const id =
		typeof raw.id === "string" || typeof raw.id === "number"
			? raw.id.toString()
			: randomId()

	const artistObj =
		raw.artist && typeof raw.artist === "object" ? (raw.artist as any) : null
	const albumObj =
		raw.album && typeof raw.album === "object" ? (raw.album as any) : null

	const artistName =
		typeof raw.artist === "string"
			? raw.artist
			: ((artistObj?.name as string | undefined) ?? "Unknown Artist")

	const albumName =
		typeof raw.album === "string"
			? raw.album
			: ((albumObj?.name as string | undefined) ?? "Unknown Album")

	const albumCover =
		raw.album_cover ?? albumObj?.cover ?? albumObj?.image_url ?? undefined

	const name =
		typeof raw.name === "string" && raw.name.trim().length > 0
			? raw.name
			: "Unknown Track"

	return {
		id,
		name,
		artist: artistName,
		artist_id: (raw.artist_id ?? artistObj?.id ?? "").toString(),
		album: albumName,
		album_id:
			typeof raw.album_id === "string" || typeof raw.album_id === "number"
				? raw.album_id.toString()
				: (albumObj?.id as string | undefined),
		album_cover: albumCover,
		duration: typeof raw.duration === "number" ? raw.duration : 0,
		audio:
			typeof raw.audio === "string" || raw.audio === null
				? raw.audio
				: typeof raw.audio_url === "string"
					? raw.audio_url
					: null,
		queue_item_id:
			typeof raw.queue_item_id === "string" ? raw.queue_item_id : undefined,
		position: typeof raw.position === "number" ? raw.position : undefined,
		deezer_track_id:
			typeof raw.deezer_track_id === "string" ||
			typeof raw.deezer_track_id === "number"
				? raw.deezer_track_id.toString()
				: undefined,
	}
}

const mapParticipant = (p: ApiParticipant): JamParticipant => ({
	id: p.id != null ? p.id.toString() : randomId(),
	name: p.name ?? "Guest",
	role: p.role === "host" ? "host" : "guest",
})

function useJamSessionInternal(
	currentUserId: string | null,
	currentUserName: string | null,
): JamSessionValue {
	const player = usePlayer()

	const [sessionId, setSessionId] = useState<string | null>(null)
	const [isHost, setIsHost] = useState(false)
	const [participants, setParticipants] = useState<JamParticipant[]>([])
	const [status, setStatus] = useState<ConnectionStatus>("disconnected")
	const [allowControls, setAllowControlsState] = useState(false)
	const [sharedQueue, setSharedQueue] = useState<Track[]>([])

	const canControl = useMemo(
		() => isHost || allowControls,
		[isHost, allowControls],
	)

	const wsRef = useRef<WebSocket | null>(null)
	const wsManualCloseRef = useRef(false)
	const wsReconnectAttemptsRef = useRef(0)
	const wsReconnectTimerRef = useRef<number | null>(null)

	const sharedQueueRef = useRef<Track[]>([])
	const queueVersionRef = useRef<number>(0)

	const currentIndexRef = useRef<number>(0)
	const lastPositionMsRef = useRef<number>(0)
	const lastPositionTrackIdRef = useRef<string | null>(null)
	const lastPlaybackRef = useRef<JamPlaybackState>({
		position: 0,
		offset_ms: 0,
		is_playing: false,
		ts_ms: 0,
	})

	const pendingPlaybackRef = useRef<JamPlaybackState | null>(null)

	useEffect(() => {
		sharedQueueRef.current = sharedQueue
	}, [sharedQueue])

	const inviteLink = useMemo(() => {
		if (!sessionId || typeof window === "undefined") return null
		return `${window.location.origin}/jam/${sessionId}`
	}, [sessionId])

	const qrUrl = useMemo(() => {
		if (!inviteLink) return null
		return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
			inviteLink,
		)}`
	}, [inviteLink])

	const teardownWs = () => {
		if (wsReconnectTimerRef.current != null && typeof window !== "undefined") {
			window.clearTimeout(wsReconnectTimerRef.current)
			wsReconnectTimerRef.current = null
		}
		wsManualCloseRef.current = true
		wsRef.current?.close()
		wsRef.current = null
	}

	const applyPlaybackState = (state: JamPlaybackState) => {
		const queue = sharedQueueRef.current
		if (!queue.length) {
			pendingPlaybackRef.current = state
			return
		}

		const safeIndex =
			typeof state.position === "number" &&
			state.position >= 0 &&
			state.position < queue.length
				? state.position
				: 0

		currentIndexRef.current = safeIndex
		lastPlaybackRef.current = state

		let effectiveOffsetMs = Math.max(0, Number(state.offset_ms) || 0)
		if (state.is_playing && state.ts_ms) {
			const drift = Date.now() - state.ts_ms
			if (drift > 0) effectiveOffsetMs += drift
		}
		lastPositionMsRef.current = effectiveOffsetMs

		const track = queue[safeIndex]
		lastPositionTrackIdRef.current = track?.id ?? null
		const keepPlaying = Boolean(state.is_playing)

		player.setCurrentTrack(track, queue, safeIndex, {
			suppressListeners: true,
			autoplay: keepPlaying,
		})
		player.setIsPlaying(keepPlaying, { suppressListeners: true })

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("jam:apply-playback", {
						detail: {
							trackId: track.id,
							offsetMs: effectiveOffsetMs,
							isPlaying: keepPlaying,
							tsMs: state.ts_ms ?? Date.now(),
						},
					}),
				)
			} catch {
				// ignore
			}
		}
	}

	const hydrateFromApi = (data: ApiJamResponse) => {
		const jamId = data.jam?.id?.toString?.() ?? null
		if (!jamId) return

		const hostUserId = data.jam.host_user_id?.toString?.() ?? null
		const amHost = hostUserId != null && hostUserId === currentUserId

		setSessionId(jamId)
		setIsHost(amHost)
		setAllowControlsState(coerceBoolean(data.jam.allow_controls))
		queueVersionRef.current = Number(data.jam.queue_version ?? 0) || 0

		setParticipants((data.participants ?? []).map(mapParticipant))

		const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
		const queue =
			apiQueueItems.length > 0
				? apiQueueItems.map((item) =>
						normalizeTrackFromWire({
							...(item.track ?? {}),
							queue_item_id: item.queue_item_id,
							position: item.position,
						}),
					)
				: []
		sharedQueueRef.current = queue
		setSharedQueue(queue)

		const playback = data.playback
		if (playback && typeof playback.position === "number") {
			applyPlaybackState({
				position: playback.position,
				offset_ms: playback.offset_ms ?? 0,
				is_playing: coerceBoolean(playback.is_playing),
				ts_ms: Date.now(),
				allow_controls: coerceBoolean(data.jam.allow_controls),
			})
		} else if (queue.length) {
			applyPlaybackState({
				position: 0,
				offset_ms: 0,
				is_playing: false,
				ts_ms: Date.now(),
				allow_controls: coerceBoolean(data.jam.allow_controls),
			})
		}

		if (typeof window !== "undefined") {
			try {
				window.localStorage.setItem("activeJamId", jamId)
			} catch {
				// ignore
			}
		}
	}

	const connectWebSocket = (id: string, role: JamRole) => {
		if (typeof window === "undefined") return
		if (!currentUserId) return

		const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws"
		const wsHost = window.location.hostname || "localhost"
		const rawPort = (import.meta as any)?.env?.VITE_JAM_WS_PORT
		const wsPort =
			typeof rawPort === "string" && rawPort.trim().length > 0
				? Number(rawPort)
				: 3002
		const wsUrl = `${wsProtocol}://${wsHost}:${Number.isFinite(wsPort) ? wsPort : 3002}`
		setStatus("connecting")

		try {
			const ws = new WebSocket(wsUrl)
			wsManualCloseRef.current = false
			wsRef.current = ws

			ws.onopen = () => {
				setStatus("connected")
				wsReconnectAttemptsRef.current = 0
				ws.send(
					JSON.stringify({
						type: "announce",
						jamId: id,
						userId: currentUserId,
						name: currentUserName ?? "You",
						role,
					}),
				)
			}

			ws.onerror = () => {
				setStatus("error")
			}

			ws.onclose = () => {
				if (wsManualCloseRef.current) return
				setStatus("disconnected")
				wsRef.current = null

				// Reconnect when the relay restarts during dev.
				if (wsReconnectAttemptsRef.current >= 10) return
				wsReconnectAttemptsRef.current += 1

				if (typeof window !== "undefined") {
					wsReconnectTimerRef.current = window.setTimeout(() => {
						if (!sessionId) return
						connectWebSocket(id, role)
					}, 400)
				}
			}

			ws.onmessage = (ev) => {
				let msg: any
				try {
					msg = JSON.parse(ev.data)
				} catch {
					return
				}

				if (msg?.type === "participants" && Array.isArray(msg.participants)) {
					setParticipants(
						msg.participants.map((p: any) => ({
							id: (p.id ?? p.userId ?? randomId()).toString(),
							name: p.name ?? "Guest",
							role: p.role === "host" ? "host" : "guest",
						})),
					)
					return
				}

				if (msg?.type === "controls_mode") {
					setAllowControlsState(coerceBoolean(msg.allow_controls))
					return
				}

				if (
					(msg?.type === "queue_snapshot" || msg?.type === "queue") &&
					Array.isArray(msg.tracks || msg.queue)
				) {
					const version = typeof msg.version === "number" ? msg.version : null
					if (version != null && version <= queueVersionRef.current) return
					if (version != null) queueVersionRef.current = version

					const raw = (msg.tracks as any[]) ?? (msg.queue as any[])
					const incoming = raw.map((item) => {
						const base = item?.track || item
						return normalizeTrackFromWire({
							...(base ?? {}),
							queue_item_id:
								item?.queue_item_id ?? base?.queue_item_id ?? undefined,
							position:
								typeof item?.position === "number"
									? item.position
									: base?.position,
						})
					})
					sharedQueueRef.current = incoming
					setSharedQueue(incoming)

					const pending = pendingPlaybackRef.current
					if (pending) {
						pendingPlaybackRef.current = null
						applyPlaybackState(pending)
					}
					return
				}

				if (msg?.type === "queue_add" && Array.isArray(msg.items)) {
					const version = typeof msg.version === "number" ? msg.version : null
					if (version != null && version <= queueVersionRef.current) return
					if (version != null) queueVersionRef.current = version

					const incoming = (msg.items as any[]).map((it) => {
						const base = it?.track || it
						return normalizeTrackFromWire({
							...(base ?? {}),
							queue_item_id:
								it?.queue_item_id ?? base?.queue_item_id ?? undefined,
							position:
								typeof it?.position === "number" ? it.position : base?.position,
						})
					})

					setSharedQueue((prev) => {
						const seen = new Set(prev.map((t) => t.queue_item_id ?? t.id))
						const deduped = incoming.filter(
							(t) => !seen.has(t.queue_item_id ?? t.id),
						)
						return deduped.length ? [...prev, ...deduped] : prev
					})
					return
				}

				if (msg?.type === "playback_state") {
					const raw = msg.state ?? msg
					if (typeof raw?.allow_controls === "boolean") {
						setAllowControlsState(raw.allow_controls)
					} else if (raw?.allow_controls != null) {
						setAllowControlsState(coerceBoolean(raw.allow_controls))
					}
					const state: JamPlaybackState = {
						position:
							typeof raw.position === "number"
								? raw.position
								: typeof raw.index === "number"
									? raw.index
									: 0,
						offset_ms:
							typeof raw.offset_ms === "number"
								? raw.offset_ms
								: typeof raw.offsetMs === "number"
									? raw.offsetMs
									: 0,
						is_playing:
							typeof raw.is_playing === "boolean"
								? raw.is_playing
								: typeof raw.isPlaying === "boolean"
									? raw.isPlaying
									: false,
						ts_ms:
							typeof raw.ts_ms === "number"
								? raw.ts_ms
								: typeof raw.ts === "number"
									? raw.ts
									: Date.now(),
						allow_controls:
							raw.allow_controls != null
								? coerceBoolean(raw.allow_controls)
								: undefined,
					}
					applyPlaybackState(state)
				}
			}
		} catch {
			setStatus("error")
		}
	}

	const setAllowControls = (value: boolean) => {
		if (!sessionId) {
			setAllowControlsState(Boolean(value))
			return
		}
		if (!isHost) return

		const next = Boolean(value)
		const prev = allowControls
		setAllowControlsState(next)
		axios
			.patch(`/api/jams/${sessionId}/controls`, { allow_controls: next })
			.catch(() => {
				setAllowControlsState(prev)
			})
	}

	const startJam = async (options?: StartJamOptions) => {
		if (!currentUserId) return

		const baseQueue =
			(options?.tracks?.length ? options.tracks : undefined) ??
			(player.queue.length ? player.queue : undefined) ??
			(player.currentTrack ? [player.currentTrack] : undefined)

		if (!baseQueue || !baseQueue.length) return

		try {
			const response = await axios.post("/api/jams", {
				seed_type: options?.seedType ?? "manual",
				seed_id: options?.seedId ?? "local-queue",
				allow_controls: allowControls,
				tracks: baseQueue,
			})

			const data = response.data as ApiJamResponse
			hydrateFromApi(data)
			connectWebSocket(data.jam.id.toString(), "host")
		} catch (err) {
			console.error("Failed to start Jam", err)
		}
	}

	const joinJam = async (id: string): Promise<boolean> => {
		if (!id) return false
		if (!currentUserId) return false
		try {
			const response = await axios.post(`/api/jams/${id}/join`, {})
			const data = response.data as ApiJamResponse
			hydrateFromApi(data)
			const hostUserId = data.jam.host_user_id?.toString?.() ?? null
			const amHost = hostUserId != null && hostUserId === currentUserId
			connectWebSocket(data.jam.id.toString(), amHost ? "host" : "guest")
			return true
		} catch (err) {
			console.error("Failed to join Jam", err)
			return false
		}
	}

	const endJam = () => {
		teardownWs()
		player.setListeners({})
		player.clearQueue()
		setSessionId(null)
		setIsHost(false)
		setParticipants([])
		setAllowControlsState(false)
		setSharedQueue([])
		setStatus("disconnected")
		queueVersionRef.current = 0
		pendingPlaybackRef.current = null
		lastPlaybackRef.current = {
			position: 0,
			offset_ms: 0,
			is_playing: false,
			ts_ms: 0,
		}
		if (typeof window !== "undefined") {
			try {
				window.localStorage.removeItem("activeJamId")
			} catch {
				// ignore
			}
		}
	}

	const addToJamQueue = async (tracks: Track[]) => {
		if (!sessionId || !tracks.length) return

		const normalised = tracks.map((t) => normalizeTrackFromWire(t))
		if (isJamDebugEnabled()) {
			console.log("[jam] queue/add", {
				sessionId,
				tracks: normalised.map((t) => ({ id: t.id, name: t.name })),
			})
		}
		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue/add`, {
				tracks: normalised,
			})
			const data = response.data as ApiJamResponse
			queueVersionRef.current =
				Number(data.jam.queue_version ?? queueVersionRef.current) || 0
			const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
			const queue =
				apiQueueItems.length > 0
					? apiQueueItems.map((item) =>
							normalizeTrackFromWire({
								...(item.track ?? {}),
								queue_item_id: item.queue_item_id,
								position: item.position,
							}),
						)
					: sharedQueueRef.current
			sharedQueueRef.current = queue
			setSharedQueue(queue)
		} catch (err) {
			console.error("Failed to add to Jam queue", err)
		}
	}

	const removeFromQueue = async (trackId: string) => {
		if (!sessionId || !trackId) return

		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue/remove`, {
				track_id: trackId,
			})
			const data = response.data as ApiJamResponse
			queueVersionRef.current =
				Number(data.jam.queue_version ?? queueVersionRef.current) || 0
			const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
			const queue =
				apiQueueItems.length > 0
					? apiQueueItems.map((item) =>
							normalizeTrackFromWire({
								...(item.track ?? {}),
								queue_item_id: item.queue_item_id,
								position: item.position,
							}),
						)
					: []
			sharedQueueRef.current = queue
			setSharedQueue(queue)
		} catch (err) {
			console.error("Failed to remove from Jam queue", err)
		}
	}

	const updatePlayback = async (
		payload: Partial<JamPlaybackState> & { position: number },
	) => {
		if (!sessionId) return

		if (isJamDebugEnabled()) {
			console.log("[jam] playback/update", { sessionId, payload })
		}
		try {
			await axios.post(`/api/jams/${sessionId}/playback`, {
				position: payload.position,
				offset_ms: payload.offset_ms,
				is_playing: payload.is_playing,
			})
		} catch (err: any) {
			if (isJamDebugEnabled()) {
				console.warn(
					"[jam] playback update rejected",
					err?.response?.status,
					err,
				)
			}
			// Revert to last known Jam state.
			applyPlaybackState(lastPlaybackRef.current)
		}
	}

	// Keep the local player's queue aligned with the canonical Jam queue so that
	// next/prev controls operate on the same ordering for host + guests.
	useEffect(() => {
		if (!sessionId) return
		if (!sharedQueue.length) return

		const state = usePlayer.getState()
		const current = state.currentTrack
		const keepPlaying = state.isPlaying
		const localQueue = state.queue ?? []

		const fingerprint = (queue: Track[]) =>
			queue
				.map((t) => (t.queue_item_id ? `q:${t.queue_item_id}` : `t:${t.id}`))
				.join("|")

		if (fingerprint(localQueue) === fingerprint(sharedQueue)) return

		const byQueueItemId =
			current?.queue_item_id != null
				? sharedQueue.findIndex(
						(t) => t.queue_item_id === current.queue_item_id,
					)
				: -1
		const byId =
			byQueueItemId === -1 && current?.id
				? sharedQueue.findIndex((t) => t.id === current.id)
				: -1
		const idx = byQueueItemId !== -1 ? byQueueItemId : byId
		const safeIndex = idx >= 0 ? idx : 0

		player.setCurrentTrack(sharedQueue[safeIndex], sharedQueue, safeIndex, {
			suppressListeners: true,
			autoplay: keepPlaying,
		})
		player.setIsPlaying(keepPlaying, { suppressListeners: true })
	}, [sessionId, sharedQueue])

	// Track audio position so pause/resume requests preserve offset.
	useEffect(() => {
		if (typeof window === "undefined") return
		const handler = (event: Event) => {
			const custom = event as CustomEvent
			const detail = custom.detail as
				| { currentTimeMs?: number; trackId?: string }
				| undefined
			if (!detail || typeof detail.currentTimeMs !== "number") return
			if (detail.trackId) {
				lastPositionTrackIdRef.current = detail.trackId
			}
			lastPositionMsRef.current = detail.currentTimeMs
		}
		window.addEventListener("jam:position", handler as EventListener)
		return () =>
			window.removeEventListener("jam:position", handler as EventListener)
	}, [])

	// Seek events (debounced by the UI) update canonical playback.
	useEffect(() => {
		if (typeof window === "undefined") return

		const handler = (event: Event) => {
			if (!sessionId) return

			const custom = event as CustomEvent
			const detail = custom.detail as
				| { currentTimeMs?: number; trackId?: string }
				| undefined
			if (!detail || typeof detail.currentTimeMs !== "number") return

			if (!canControl) {
				applyPlaybackState(lastPlaybackRef.current)
				return
			}

			if (detail.trackId) {
				lastPositionTrackIdRef.current = detail.trackId
			}
			lastPositionMsRef.current = detail.currentTimeMs

			const position = currentIndexRef.current
			updatePlayback({
				position,
				offset_ms: detail.currentTimeMs,
				is_playing: usePlayer.getState().isPlaying,
			})
		}

		window.addEventListener("jam:seek", handler as EventListener)
		return () =>
			window.removeEventListener("jam:seek", handler as EventListener)
	}, [sessionId, canControl])

	// Global Jam playback guard: route local player actions into Jam HTTP calls
	// (or revert if the user is not allowed to control playback).
	useEffect(() => {
		if (!sessionId) {
			player.setListeners({})
			return
		}

		const onTrackChange = (track: Track | null) => {
			if (!track) return
			if (isJamDebugEnabled()) {
				console.log("[jam] local/track-change", {
					sessionId,
					trackId: track.id,
					queueItemId: track.queue_item_id,
					canControl,
					allowControls,
				})
			}

			// Reset position tracking when switching tracks so the subsequent
			// autoplay-triggered onPlayStateChange doesn't reuse the previous track's offset.
			lastPositionMsRef.current = 0
			lastPositionTrackIdRef.current = track.id

			const queue = sharedQueueRef.current
			const idxByQueueItemId =
				track.queue_item_id != null
					? queue.findIndex((t) => t.queue_item_id === track.queue_item_id)
					: -1
			const idxById =
				idxByQueueItemId === -1 ? queue.findIndex((t) => t.id === track.id) : -1

			const idx = idxByQueueItemId !== -1 ? idxByQueueItemId : idxById

			if (idx === -1) {
				// Track isn't in Jam queue. In shared-control mode, treat this as "add + play".
				if (allowControls) {
					void (async () => {
						await addToJamQueue([track])
						const updated = sharedQueueRef.current
						const pos = updated.findIndex((t) => t.id === track.id)
						if (pos >= 0) {
							updatePlayback({ position: pos, offset_ms: 0, is_playing: true })
						}
					})()
					return
				}

				applyPlaybackState(lastPlaybackRef.current)
				return
			}

			if (!canControl) {
				applyPlaybackState(lastPlaybackRef.current)
				return
			}

			currentIndexRef.current = idx
			updatePlayback({ position: idx, offset_ms: 0, is_playing: true })
		}

		const onPlayStateChange = (isPlaying: boolean) => {
			if (isJamDebugEnabled()) {
				console.log("[jam] local/play-state", {
					sessionId,
					isPlaying,
					canControl,
				})
			}
			if (!canControl) {
				player.setIsPlaying(lastPlaybackRef.current.is_playing, {
					suppressListeners: true,
				})
				return
			}

			const currentTrackId = usePlayer.getState().currentTrack?.id ?? null
			const offsetMs =
				currentTrackId && lastPositionTrackIdRef.current === currentTrackId
					? Math.max(0, Math.round(lastPositionMsRef.current))
					: 0

			updatePlayback({
				position: currentIndexRef.current,
				offset_ms: offsetMs,
				is_playing: isPlaying,
			})
		}

		player.setListeners({ onTrackChange, onPlayStateChange })
	}, [sessionId, canControl, allowControls])

	// On mount, try to rejoin an active Jam from localStorage.
	useEffect(() => {
		if (typeof window === "undefined") return
		if (sessionId) return
		const storedId = window.localStorage.getItem("activeJamId")
		if (!storedId) return
		void joinJam(storedId)
	}, [sessionId])

	// Reliability fallback: poll canonical Jam state periodically.
	// This protects against missed WS broadcasts or relay restarts and ensures
	// guest-originated changes still reach hosts even if a WS message is dropped.
	useEffect(() => {
		if (typeof window === "undefined") return
		if (!sessionId) return

		let cancelled = false
		const poll = async () => {
			if (cancelled) return
			try {
				const response = await axios.get(`/api/jams/${sessionId}`)
				const data = response.data as ApiJamResponse
				if (!data?.jam?.id) return

				const allow = coerceBoolean(data.jam.allow_controls)
				setAllowControlsState(allow)

				const version = Number(data.jam.queue_version ?? 0) || 0
				if (version > queueVersionRef.current) {
					queueVersionRef.current = version
					const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
					const queue =
						apiQueueItems.length > 0
							? apiQueueItems.map((item) =>
									normalizeTrackFromWire({
										...(item.track ?? {}),
										queue_item_id: item.queue_item_id,
										position: item.position,
									}),
								)
							: []
					sharedQueueRef.current = queue
					setSharedQueue(queue)
				}

				const playback = data.playback
				if (playback && typeof playback.position === "number") {
					const next: JamPlaybackState = {
						position: playback.position,
						offset_ms: playback.offset_ms ?? 0,
						is_playing: coerceBoolean(playback.is_playing),
						ts_ms: Date.now(),
						allow_controls: allow,
					}
					const prev = lastPlaybackRef.current
					const changed =
						prev.position !== next.position ||
						prev.offset_ms !== next.offset_ms ||
						prev.is_playing !== next.is_playing
					if (changed) {
						if (isJamDebugEnabled()) {
							console.log("[jam] poll/apply", { sessionId, next })
						}
						applyPlaybackState(next)
					}
				}
			} catch (_err) {
				// ignore poll errors (Jam may have ended)
			}
		}

		const interval = window.setInterval(poll, 3500)
		// Kick one immediate poll after join/start.
		void poll()

		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [sessionId])

	useEffect(() => () => teardownWs(), [])

	return {
		sessionId,
		isHost,
		participants,
		inviteLink,
		qrUrl,
		status,
		allowControls,
		setAllowControls,
		sharedQueue,
		addToJamQueue,
		removeFromQueue,
		startJam,
		endJam,
		joinJam,
		canControl,
	}
}

export function JamSessionProvider({
	currentUserId,
	currentUserName,
	children,
}: {
	currentUserId: string | null
	currentUserName: string | null
	children: ReactNode
}) {
	const value = useJamSessionInternal(currentUserId, currentUserName)
	return React.createElement(JamSessionContext.Provider, { value }, children)
}

export function useJamSession(
	_currentUserId: string | null,
	_currentUserName: string | null,
): JamSessionValue {
	const ctx = useContext(JamSessionContext)
	if (!ctx) {
		throw new Error("useJamSession must be used within JamSessionProvider")
	}
	return ctx
}
