import React, {
	useEffect,
	useMemo,
	useRef,
	useState,
	createContext,
	useContext,
	type ReactNode,
} from "react"
import type { Track } from "@/hooks/usePlayer"
import { usePlayer } from "@/hooks/usePlayer"
import axios from "axios"

export type JamRole = "host" | "guest"

export type JamParticipant = {
	id: string
	name: string
	role: JamRole
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

const randomId = () => {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID()
	}
	return Math.random().toString(36).slice(2)
}

const dedupeParticipants = (list: JamParticipant[]) => {
	const map = new Map<string, JamParticipant>()
	list.forEach((p) => {
		if (!map.has(p.id)) map.set(p.id, p)
	})
	return Array.from(map.values())
}

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
	track: Track
}

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
	const seen = new Set<string>()
	const out: T[] = []
	for (const item of items) {
		if (seen.has(item.id)) continue
		seen.add(item.id)
		out.push(item)
	}
	return out
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
			: (artistObj?.name as string | undefined) ?? "Unknown Artist"

	const albumName =
		typeof raw.album === "string"
			? raw.album
			: (albumObj?.name as string | undefined) ?? "Unknown Album"

	const albumCover =
		raw.album_cover ?? albumObj?.cover ?? albumObj?.image_url ?? undefined

	const name =
		typeof raw.name === "string" && raw.name.trim().length > 0
			? raw.name
			: "Unknown Track"

	const duration =
		typeof raw.duration === "number"
			? raw.duration
			: typeof raw.duration_ms === "number"
				? Math.round(raw.duration_ms / 1000)
				: 0

	return {
		id,
		name,
		artist: artistName,
		artist_id:
			typeof raw.artist_id === "string" || typeof raw.artist_id === "number"
				? raw.artist_id.toString()
				: (artistObj?.id as string | number | undefined)?.toString?.() ?? "",
		album: albumName,
		album_id:
			typeof raw.album_id === "string" || typeof raw.album_id === "number"
				? raw.album_id.toString()
				: (albumObj?.id as string | number | undefined)?.toString?.(),
		album_cover: albumCover,
		duration,
		audio: (raw.audio ?? raw.audio_url ?? null) as string | null,
	}
}

const mapParticipant = (input: ApiParticipant): JamParticipant => ({
	id: input.id?.toString() ?? randomId(),
	name: input.name ?? "Guest",
	role: input.role === "host" ? "host" : "guest",
})

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
	syncQueue: (queue: Track[]) => Promise<void> | void
	addToJamQueue: (tracks: Track[]) => Promise<void> | void
	startJam: (options?: StartJamOptions) => Promise<void> | void
	endJam: () => void
	joinJam: (id: string) => Promise<boolean>
	sendPlaybackState: (
		track: Track | null,
		index: number | undefined,
		isPlaying?: boolean,
		options?: { offsetMs?: number },
	) => void
	canControl: boolean
	removeFromQueue: (trackId: string) => Promise<void> | void
}

const JamSessionContext = createContext<JamSessionValue | null>(null)

function useJamSessionInternal(
	currentUserId: string | null,
	currentUserName: string | null,
): JamSessionValue {
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [isHost, setIsHost] = useState(false)
	const [participants, setParticipants] = useState<JamParticipant[]>([])
	const [status, setStatus] = useState<ConnectionStatus>("disconnected")
	const [allowControls, setAllowControls] = useState(true)
	const [sharedQueue, setSharedQueue] = useState<Track[]>([])
	const currentIndexRef = useRef<number>(0)
	const canControl = useMemo(
		() => isHost || allowControls,
		[isHost, allowControls],
	)

	const wsRef = useRef<WebSocket | null>(null)
	const bcRef = useRef<BroadcastChannel | null>(null)
	const sharedQueueRef = useRef<Track[]>([])
	const storageKeyRef = useRef<string | null>(null)
	const clientIdRef = useRef<string>(randomId())
	const lastPlaybackTsRef = useRef<number>(0)
	const lastPositionMsRef = useRef<number>(0)
	const player = usePlayer()

	useEffect(() => {
		sharedQueueRef.current = sharedQueue
	}, [sharedQueue])
	// Listen for position updates from the audio player
	useEffect(() => {
		if (typeof window === "undefined") return
		const handler = (event: Event) => {
			const custom = event as CustomEvent
			const detail = custom.detail as
				| { currentTimeMs?: number; trackId?: string }
				| undefined
			if (!detail || typeof detail.currentTimeMs !== "number") return
			lastPositionMsRef.current = detail.currentTimeMs
		}
		window.addEventListener("jam:position", handler as EventListener)
		return () =>
			window.removeEventListener("jam:position", handler as EventListener)
	}, [])

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

	const teardown = () => {
		wsRef.current?.close()
		wsRef.current = null
		bcRef.current?.close()
		bcRef.current = null
	}

	const emit = (payload: Record<string, unknown>) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(payload))
		}
		if (bcRef.current) {
			bcRef.current.postMessage(payload)
		}
		if (storageKeyRef.current && typeof window !== "undefined") {
			try {
				const envelope = { ...((payload as object) ?? {}), ts: Date.now() }
				window.localStorage.setItem(
					storageKeyRef.current,
					JSON.stringify(envelope),
				)
				// clean up to avoid storage bloat; remove triggers another event but harmless
				window.localStorage.removeItem(storageKeyRef.current)
			} catch {
				// ignore storage failures
			}
		}
	}

	const broadcastParticipants = (list: JamParticipant[]) =>
		emit({ type: "participants", jamId: sessionId, participants: list })
	const broadcastQueue = (queue: Track[]) =>
		emit({ type: "queue_snapshot", jamId: sessionId, tracks: queue, index: 0 })

	const applyIncomingPlayback = (raw: any) => {
		const msg = raw ?? {}
		if (msg.clientId && msg.clientId === clientIdRef.current) return
		if (typeof msg.ts === "number" && msg.ts < lastPlaybackTsRef.current) return
		lastPlaybackTsRef.current = msg.ts ?? Date.now()

		const queue = sharedQueueRef.current
		if (!queue.length) return

		let idx = -1
		const trackId = typeof msg.trackId === "string" ? msg.trackId : undefined

		if (trackId) {
			idx = queue.findIndex((t) => t.id === trackId)
		}

		if (idx < 0 && typeof msg.index === "number" && msg.index >= 0) {
			const safeIndex = Math.floor(msg.index)
			if (safeIndex >= 0 && safeIndex < queue.length) {
				idx = safeIndex
			}
		}

		if (idx < 0 || !queue[idx]) return

		currentIndexRef.current = idx
		const track = queue[idx]

		player.setCurrentTrack(track, queue, idx, {
			suppressListeners: true,
		})

		if (typeof msg.isPlaying === "boolean") {
			player.setIsPlaying(msg.isPlaying, { suppressListeners: true })
		}

		const offsetMs =
			typeof msg.offsetMs === "number"
				? msg.offsetMs
				: typeof msg.offset_ms === "number"
					? msg.offset_ms
					: 0

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("jam:apply-playback", {
						detail: {
							trackId: track.id,
							offsetMs,
							isPlaying: Boolean(msg.isPlaying),
						},
					}),
				)
			} catch {
				// ignore
			}
		}
	}

	const connectBroadcastChannel = (
		id: string,
		self: JamParticipant,
		role: JamRole,
	) => {
		if (typeof BroadcastChannel === "undefined") {
			setStatus("error")
			return
		}

		const channel = new BroadcastChannel(`jam-${id}`)
		bcRef.current = channel
		setStatus("connected")

		channel.onmessage = (ev) => {
			const msg = ev.data
			if (msg?.type === "participants" && Array.isArray(msg.participants)) {
				setParticipants(
					dedupeParticipants(
						msg.participants.map(
							(p: Partial<JamParticipant> & { userId?: string }) => ({
								id: p.id ?? p.userId ?? randomId(),
								name: p.name ?? "Guest",
								role: p.role === "host" ? "host" : "guest",
							}),
						),
					),
				)
			} else if (msg?.type === "announce" && msg.participant) {
				setParticipants((prev) => {
					const exists = prev.find((p) => p.id === msg.participant.id)
					const next = exists ? prev : [...prev, msg.participant]
					broadcastParticipants(next)
					if (role === "host" && sharedQueueRef.current.length) {
						broadcastQueue(sharedQueueRef.current)
					}
					return next
				})
			} else if (
				(msg?.type === "queue" || msg?.type === "queue_snapshot") &&
				Array.isArray(msg.tracks || msg.queue)
			) {
				const raw = (msg.tracks as any[]) ?? (msg.queue as any[])
				// Never allow an empty snapshot to wipe out a non-empty queue that
				// we already hydrated from the API.
				if (!raw.length && sharedQueueRef.current.length) return
				const incoming = raw.map((item) =>
					normalizeTrackFromWire(item?.track ?? item),
				)
				setSharedQueue(dedupeById(incoming))
			} else if (msg?.type === "queue_add" && Array.isArray(msg.items)) {
				const items = (msg.items as any[]).map((it) =>
					normalizeTrackFromWire(it.track ?? it),
				)
				setSharedQueue((prev) => dedupeById([...prev, ...items]))
			} else if (msg?.type === "playback_state") {
				applyIncomingPlayback(msg)
			}
		}

		setParticipants((prev) => {
			const exists = prev.find((p) => p.id === self.id)
			const next = exists ? prev : [...prev, self]
			broadcastParticipants(next)
			return next
		})

		channel.postMessage({ type: "announce", jamId: id, participant: self })
		if (role === "host" && sharedQueueRef.current.length) {
			broadcastQueue(sharedQueueRef.current)
		}
	}

	const connectWebSocket = (
		id: string,
		role: JamRole,
		self: JamParticipant,
	) => {
		if (typeof window === "undefined") return
		const wsUrl = `ws://localhost:3002/ws/jam/${id}`
		setStatus("connecting")
		try {
			const ws = new WebSocket(wsUrl)
			wsRef.current = ws
			ws.onopen = () => {
				setStatus("connected")
				ws.send(
					JSON.stringify({
						type: "announce",
						jamId: id,
						userId: self.id,
						name: self.name,
						role: self.role,
					}),
				)
			}
			ws.onerror = () => {
				setStatus("error")
				teardown()
				connectBroadcastChannel(id, self, role)
			}
			ws.onclose = () => setStatus("disconnected")
			ws.onmessage = (ev) => {
				try {
					const msg = JSON.parse(ev.data)
					if (msg.type === "participants" && Array.isArray(msg.participants)) {
						setParticipants(
							dedupeParticipants(
								msg.participants.map(
									(p: Partial<JamParticipant> & { userId?: string }) => ({
										id: p.id ?? p.userId ?? randomId(),
										name: p.name ?? "Guest",
										role: p.role === "host" ? "host" : "guest",
									}),
								),
							),
						)
					} else if (msg.type === "announce" && msg.participant) {
						setParticipants((prev) => {
							const exists = prev.find((p) => p.id === msg.participant.id)
							const next = dedupeParticipants(
								exists ? prev : [...prev, msg.participant],
							)
							ws.send(
								JSON.stringify({
									type: "participants",
									jamId: id,
									participants: next,
								}),
							)
							if (role === "host" && sharedQueueRef.current.length) {
								ws.send(
									JSON.stringify({
										type: "queue_snapshot",
										jamId: id,
										tracks: sharedQueueRef.current,
									}),
								)
							}
							return next
						})
					} else if (
						(msg.type === "queue" || msg.type === "queue_snapshot") &&
						Array.isArray(msg.tracks || msg.queue)
					) {
						const raw = (msg.tracks as any[]) ?? (msg.queue as any[])
						if (!raw.length && sharedQueueRef.current.length) return
						const incoming = raw.map((item) =>
							normalizeTrackFromWire(item?.track ?? item),
						)
						setSharedQueue(dedupeById(incoming))
					} else if (msg.type === "queue_add" && Array.isArray(msg.items)) {
						const items = (msg.items as any[]).map((it) =>
							normalizeTrackFromWire(it.track ?? it),
						)
						setSharedQueue((prev) => dedupeById([...prev, ...items]))
					} else if (msg.type === "playback_state") {
						applyIncomingPlayback(msg)
					}
				} catch (err) {
					console.warn("Bad WS message", err)
				}
			}
		} catch (_err) {
			setStatus("error")
			connectBroadcastChannel(id, self, role)
		}
	}

	const startJam = async (options?: StartJamOptions) => {
		if (!currentUserId) {
			console.warn("Must be logged in to start a Jam")
			return
		}
		const baseQueue =
			(options?.tracks?.length ? options.tracks : undefined) ??
			(player.queue.length ? player.queue : undefined) ??
			(player.currentTrack ? [player.currentTrack] : undefined)

		if (!baseQueue || !baseQueue.length) {
			console.warn("Cannot start Jam without a queue")
			return
		}
		const payload = {
			seed_type: options?.seedType ?? "manual",
			seed_id: options?.seedId ?? "local-queue",
			allow_controls: allowControls,
			tracks: baseQueue, // Send full track objects, not just IDs
		}

		try {
			const response = await axios.post("/api/jams", payload)
			const data = response.data
			const id = data.jam.id as string
			storageKeyRef.current = `jam-${id}-relay`
			const self: JamParticipant = {
				id: currentUserId ?? randomId(),
				name: currentUserName ?? "You",
				role: "host",
			}
			setSessionId(id)
			setIsHost(true)
			setParticipants(
				dedupeById(
					(data.participants?.map((p: ApiParticipant) => mapParticipant(p)) ?? [
						self,
					]) as JamParticipant[],
				),
			)
			const initialQueueRaw =
				(data.queue as ApiQueueItem[] | undefined)?.map((item) => item.track) ??
				baseQueue
			const initialQueue = initialQueueRaw.map((t) => normalizeTrackFromWire(t))
			setSharedQueue(initialQueue)
			if (initialQueue.length) {
				const playbackIndex =
					typeof data.playback?.position === "number"
						? data.playback.position
						: 0
				const safeIndex =
					playbackIndex >= 0 && playbackIndex < initialQueue.length
						? playbackIndex
						: 0
				currentIndexRef.current = safeIndex
				player.setCurrentTrack(initialQueue[safeIndex], initialQueue, safeIndex)
			}
			if (typeof window !== "undefined") {
				try {
					window.localStorage.setItem("activeJamId", id)
				} catch {
					// ignore
				}
			}
			connectWebSocket(id, "host", self)
		} catch (error: any) {
			console.error("Failed to create jam session", error)
		}
	}

	const endJam = () => {
		teardown()
		player.setListeners({})
		player.clearQueue()
		sharedQueueRef.current = []
		currentIndexRef.current = 0
		lastPlaybackTsRef.current = 0
		storageKeyRef.current = null
		setSessionId(null)
		setParticipants([])
		setIsHost(false)
		setSharedQueue([])
		setStatus("disconnected")
		if (typeof window !== "undefined") {
			try {
				window.localStorage.removeItem("activeJamId")
			} catch {
				// ignore
			}
		}
	}

	const joinJam = async (id: string): Promise<boolean> => {
		if (!id) return false
		if (!currentUserId) {
			console.warn("Must be logged in to join a Jam")
			return false
		}
		storageKeyRef.current = `jam-${id}-relay`
		try {
			const response = await axios.post(`/api/jams/${id}/join`, {})
			const data = response.data
			const self: JamParticipant = {
				id: currentUserId ?? randomId(),
				name: currentUserName ?? "You",
				role: "guest",
			}
			setSessionId(id)
			setIsHost(false)
			setParticipants(
				dedupeById(
					(data.participants?.map((p: ApiParticipant) => mapParticipant(p)) ?? [
						self,
					]) as JamParticipant[],
				),
			)
			const queueFromApiRaw =
				(data.queue as ApiQueueItem[] | undefined)?.map((item) => item.track) ??
				[]
			const queueFromApi = queueFromApiRaw.map((t) => normalizeTrackFromWire(t))
			setSharedQueue(queueFromApi)
			if (queueFromApi.length) {
				const playbackIndex =
					typeof data.playback?.position === "number"
						? data.playback.position
						: 0
				const safeIndex =
					playbackIndex >= 0 && playbackIndex < queueFromApi.length
						? playbackIndex
						: 0
				currentIndexRef.current = safeIndex
				const activeTrack = queueFromApi[safeIndex]
				player.setCurrentTrack(activeTrack, queueFromApi, safeIndex)
				const offsetMs =
					typeof data.playback?.offset_ms === "number"
						? data.playback.offset_ms
						: 0
				const isPlaying =
					typeof data.playback?.is_playing === "boolean"
						? data.playback.is_playing
						: false
				if (typeof window !== "undefined") {
					try {
						window.dispatchEvent(
							new CustomEvent("jam:apply-playback", {
								detail: {
									trackId: activeTrack.id,
									offsetMs,
									isPlaying,
								},
							}),
						)
					} catch {
						// ignore
					}
				}
			}
			connectWebSocket(id, "guest", self)
			if (typeof window !== "undefined") {
				try {
					window.localStorage.setItem("activeJamId", id)
				} catch {
					// ignore
				}
			}
			return true
		} catch (error) {
			console.error("Unable to join jam", id, error)
			if (typeof window !== "undefined") {
				try {
					window.localStorage.removeItem("activeJamId")
				} catch {
					// ignore
				}
			}
			return false
		}
	}

	const syncQueue = async (queue: Track[]) => {
		const normalised = dedupeById(queue.map((t) => normalizeTrackFromWire(t)))
		setSharedQueue(normalised)
		if (!sessionId) return

		emit({
			type: "queue_snapshot",
			jamId: sessionId,
			tracks: normalised,
			index: currentIndexRef.current ?? 0,
		})

		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue`, {
				tracks: normalised, // Send full objects
			})
			const data = response.data
			const updatedQueue = dedupeById(
				(data.queue as ApiQueueItem[] | undefined)
					?.map((item) => normalizeTrackFromWire(item.track))
					?? normalised,
			)
			setSharedQueue(updatedQueue)
		} catch (err) {
			console.error("Error syncing Jam queue", err)
		}
	}

	const addToJamQueue = async (tracks: Track[]) => {
		if (!sessionId || !tracks.length) return

		const normalised = tracks.map((t) => normalizeTrackFromWire(t))
		const current = sharedQueueRef.current
		const deduped = normalised.filter(
			(t) => !current.some((p) => p.id === t.id),
		)
		if (!deduped.length) return

		// Optimistic update locally
		const optimistic = dedupeById([...current, ...deduped])
		setSharedQueue(optimistic)

		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue/add`, {
				tracks: deduped, // Send full objects
			})
			const data = response.data
			const updatedQueue = dedupeById(
				(data.queue as ApiQueueItem[] | undefined)?.map((item) => item.track) ??
					optimistic,
			)
			setSharedQueue(updatedQueue)
		} catch (err) {
			console.error("Error adding tracks to Jam queue", err)
		}
	}

	const removeFromQueue = async (trackId: string) => {
		if (!sessionId) return

		// Optimistic update
		const current = sharedQueueRef.current
		const optimistic = current.filter((t) => t.id !== trackId)
		setSharedQueue(optimistic)

		try {
			await axios.post(`/api/jams/${sessionId}/queue/remove`, {
				track_id: trackId,
			})
		} catch (err) {
			console.error("Error removing track from Jam queue", err)
			// Revert on error? For now, we rely on next broadcast to fix state if needed
		}
	}

	const sendPlaybackState = (
		track: Track | null,
		index: number | undefined,
		isPlaying = true,
		options?: { offsetMs?: number },
	) => {
		if (!sessionId) return

		const effectiveIndex =
			typeof index === "number" && index >= 0 ? index : currentIndexRef.current
		currentIndexRef.current = effectiveIndex ?? 0
		const hasExplicitOffset =
			typeof options?.offsetMs === "number" && options.offsetMs >= 0
		const offsetMs = hasExplicitOffset
			? Math.round(options?.offsetMs as number)
			: typeof lastPositionMsRef.current === "number" &&
					lastPositionMsRef.current >= 0
				? Math.round(lastPositionMsRef.current)
				: 0
		const ts = Date.now()

		emit({
			type: "playback_state",
			jamId: sessionId,
			trackId: track?.id,
			index: effectiveIndex,
			offsetMs,
			isPlaying,
			ts,
			clientId: clientIdRef.current,
		})

		axios
			.post(`/api/jams/${sessionId}/playback`, {
				position: typeof effectiveIndex === "number" ? effectiveIndex : 0,
				offset_ms: offsetMs,
				is_playing: isPlaying,
			})
			.catch((err: any) => {
				console.error("Failed to persist Jam playback state", err)
			})
	}

	// Emit playback_state when the local user seeks within the current track.
	useEffect(() => {
		if (typeof window === "undefined") return
		const handler = (event: Event) => {
			if (!sessionId) return
			const custom = event as CustomEvent
			const detail = custom.detail as
				| { currentTimeMs?: number; trackId?: string }
				| undefined
			if (!detail || typeof detail.currentTimeMs !== "number") return
			const state = usePlayer.getState()
			if (!state.currentTrack || state.currentTrack.id !== detail.trackId) return
			if (!canControl) return
			sendPlaybackState(state.currentTrack, state.currentIndex, state.isPlaying, {
				offsetMs: detail.currentTimeMs,
			})
		}
		window.addEventListener("jam:seek", handler as EventListener)
		return () =>
			window.removeEventListener("jam:seek", handler as EventListener)
	}, [sessionId, canControl])

	// Host: emit playback_state on player events
	useEffect(() => {
		if (!sessionId) {
			player.setListeners({})
			return
		}

		const onTrackChange = (track: Track | null, index: number) => {
			if (!canControl) return
			if (track && !sharedQueueRef.current.some((t) => t.id === track.id)) {
				addToJamQueue([track])
			}
			// New track should start from the beginning
			sendPlaybackState(track, index, true, { offsetMs: 0 })
		}

		const onPlayStateChange = (isPlaying: boolean) => {
			if (!canControl) return
			const state = usePlayer.getState()
			sendPlaybackState(state.currentTrack, state.currentIndex, isPlaying)
		}

		player.setListeners({ onTrackChange, onPlayStateChange })
		// cleanup happens when deps change
	}, [sessionId, isHost, allowControls, canControl])

	useEffect(() => {
		if (typeof window === "undefined") return
		const onStorage = (ev: StorageEvent) => {
			if (
				!storageKeyRef.current ||
				ev.key !== storageKeyRef.current ||
				!ev.newValue
			)
				return
			try {
				const msg = JSON.parse(ev.newValue)
				if (msg.type === "participants" && Array.isArray(msg.participants)) {
					setParticipants(dedupeParticipants(msg.participants))
				} else if (msg.type === "announce" && msg.participant) {
					setParticipants((prev) => {
						const exists = prev.find((p) => p.id === msg.participant.id)
						const next = dedupeParticipants(
							exists ? prev : [...prev, msg.participant],
						)
						broadcastParticipants(next)
						if (isHost && sharedQueueRef.current.length) {
							broadcastQueue(sharedQueueRef.current)
						}
						return next
					})
				} else if (
					(msg.type === "queue" || msg.type === "queue_snapshot") &&
					Array.isArray(msg.queue)
				) {
					const raw = msg.queue as any[]
					if (!raw.length && sharedQueueRef.current.length) return
					const incoming = raw.map((item) =>
						normalizeTrackFromWire(item?.track ?? item),
					)
					setSharedQueue(dedupeById(incoming))
				} else if (msg.type === "queue_add" && Array.isArray(msg.items)) {
					const items = (msg.items as any[]).map((it) =>
						normalizeTrackFromWire(it.track ?? it),
					)
					setSharedQueue((prev) => dedupeById([...prev, ...items]))
				} else if (msg.type === "playback_state") {
					applyIncomingPlayback(msg)
				}
			} catch {
				// ignore bad payload
			}
		}
		window.addEventListener("storage", onStorage)
		return () => window.removeEventListener("storage", onStorage)
	}, [isHost])

	useEffect(() => () => teardown(), [])

	// On mount, try to rejoin an active Jam from localStorage
	useEffect(() => {
		if (typeof window === "undefined") return
		if (sessionId) return
		const storedId = window.localStorage.getItem("activeJamId")
		if (!storedId) return
		void joinJam(storedId)
	}, [sessionId])

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
		syncQueue,
		addToJamQueue,
		startJam,
		endJam,
		joinJam,
		sendPlaybackState,
		canControl,
		removeFromQueue,
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
	return React.createElement(
		JamSessionContext.Provider,
		{ value },
		children,
	)
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
