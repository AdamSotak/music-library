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

const isJamDebugEnabled = () => {
	if (typeof window === "undefined") return false
	try {
		return window.localStorage.getItem("jamDebug") === "1"
	} catch {
		return false
	}
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
	queue_item_id?: string
	track: any
}

type JamPlaybackState = {
	queue_item_id: string | null
	offset_ms: number
	is_playing: boolean
	ts_ms: number
	allow_controls?: boolean
	index?: number
	trackId?: string
}

export type JamCommand =
	| { type: "REQUEST_SEEK"; queue_item_id: string; offset_ms: number }
	| { type: "REQUEST_PLAY_QUEUE_ITEM"; queue_item_id: string }
	| { type: "REQUEST_PLAY_PAUSE"; is_playing: boolean }
	| { type: "REQUEST_ADD_TRACKS"; tracks: Track[] }

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

	const duration =
		typeof raw.duration === "number"
			? raw.duration
			: typeof raw.duration_ms === "number"
				? Math.round(raw.duration_ms / 1000)
				: 0

	const queueItemId =
		typeof raw.queue_item_id === "string" ||
		typeof raw.queue_item_id === "number"
			? raw.queue_item_id.toString()
			: undefined

	const deezerTrackId =
		typeof raw.deezer_track_id === "string" ||
		typeof raw.deezer_track_id === "number"
			? raw.deezer_track_id.toString()
			: undefined

	const position =
		typeof raw.position === "number" && raw.position >= 0
			? raw.position
			: undefined

	return {
		id,
		name,
		artist: artistName,
		artist_id:
			typeof raw.artist_id === "string" || typeof raw.artist_id === "number"
				? raw.artist_id.toString()
				: ((artistObj?.id as string | number | undefined)?.toString?.() ?? ""),
		album: albumName,
		album_id:
			typeof raw.album_id === "string" || typeof raw.album_id === "number"
				? raw.album_id.toString()
				: (albumObj?.id as string | number | undefined)?.toString?.(),
		album_cover: albumCover,
		duration,
		audio: (raw.audio ?? raw.audio_url ?? null) as string | null,
		queue_item_id: queueItemId,
		position,
		deezer_track_id: deezerTrackId,
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
	sendCommand: (cmd: JamCommand) => void
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
	const [allowControls, setAllowControlsState] = useState(true)
	const [sharedQueue, setSharedQueue] = useState<Track[]>([])
	const currentIndexRef = useRef<number>(0)
	const canControl = useMemo(
		// The host is always allowed to control playback. When allowControls
		// is true, guests may also control playback; otherwise the host is
		// the single authoritative controller.
		() => isHost || allowControls,
		[isHost, allowControls],
	)

	const wsRef = useRef<WebSocket | null>(null)
	const bcRef = useRef<BroadcastChannel | null>(null)
	const wsReconnectTimerRef = useRef<number | null>(null)
	const wsReconnectAttemptsRef = useRef<number>(0)
	const wsManualCloseRef = useRef<boolean>(false)
	const lastConnectArgsRef = useRef<{
		id: string
		role: JamRole
		self: JamParticipant
	} | null>(null)
	const sharedQueueRef = useRef<Track[]>([])
	const storageKeyRef = useRef<string | null>(null)
	const clientIdRef = useRef<string>(randomId())
	const lastPlaybackTsRef = useRef<number>(0)
	const lastPositionMsRef = useRef<number>(0)
	const lastAppliedIsPlayingRef = useRef<boolean>(false)
	const player = usePlayer()
	const currentQueueItemIdRef = useRef<string | null>(null)

	// Wrapper used by UI to toggle the "allow others to control playback"
	// switch. This updates local state and broadcasts the new mode to other
	// participants; remote updates use setAllowControlsState directly.
	const setAllowControls = (value: boolean) => {
		if (!sessionId) {
			setAllowControlsState(value)
			return
		}
		if (!isHost) return

		const next = Boolean(value)
		const prev = allowControls
		setAllowControlsState(next)
		axios
			.patch(`/api/jams/${sessionId}/controls`, { allow_controls: next })
			.then(() => {
				emit({
					type: "controls_mode",
					jamId: sessionId,
					allow_controls: next,
				})
			})
			.catch((err: any) => {
				console.error("Failed to update Jam controls mode", err)
				setAllowControlsState(prev)
			})
	}

	useEffect(() => {
		sharedQueueRef.current = sharedQueue
	}, [sharedQueue])

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
				? sharedQueue.findIndex((t) => t.queue_item_id === current.queue_item_id)
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
		if (wsReconnectTimerRef.current != null && typeof window !== "undefined") {
			window.clearTimeout(wsReconnectTimerRef.current)
			wsReconnectTimerRef.current = null
		}
		wsManualCloseRef.current = true
		wsRef.current?.close()
		wsRef.current = null
		bcRef.current?.close()
		bcRef.current = null
	}

	const emit = (payload: Record<string, unknown>) => {
		const wsReady =
			wsRef.current != null && wsRef.current.readyState === WebSocket.OPEN
		if (wsReady) {
			wsRef.current?.send(JSON.stringify(payload))
			return
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

	const sendCommand = (cmd: JamCommand) => {
		if (!sessionId) return
		if (isJamDebugEnabled()) {
			console.log("[jam] sendCommand", { sessionId, isHost, cmd })
		}
		emit({ type: "jam_command", jamId: sessionId, fromUserId: currentUserId, cmd })
	}

	const parsePlaybackState = (msg: any): JamPlaybackState | null => {
		if (!msg) return null
		if (msg.clientId && msg.clientId === clientIdRef.current) return null

		const raw = msg.state ?? msg
		if (!raw) return null

		if (typeof raw.allow_controls === "boolean") {
			setAllowControlsState(raw.allow_controls)
		} else if (typeof msg.allow_controls === "boolean") {
			setAllowControlsState(msg.allow_controls)
		}

		const queueItemId =
			typeof raw.queue_item_id === "string"
				? raw.queue_item_id
				: typeof raw.queueItemId === "string"
					? raw.queueItemId
					: null

		const offsetMs =
			typeof raw.offset_ms === "number"
				? raw.offset_ms
				: typeof raw.offsetMs === "number"
					? raw.offsetMs
					: 0

		const isPlaying =
			typeof raw.is_playing === "boolean"
				? raw.is_playing
				: typeof raw.isPlaying === "boolean"
					? raw.isPlaying
					: false

		const tsMs =
			typeof raw.ts_ms === "number"
				? raw.ts_ms
				: typeof raw.ts === "number"
					? raw.ts
					: typeof raw.updatedAt === "number"
						? raw.updatedAt
						: Date.now()

		return {
			queue_item_id: queueItemId,
			offset_ms: Math.max(0, Number(offsetMs) || 0),
			is_playing: Boolean(isPlaying),
			ts_ms: Math.max(0, Number(tsMs) || Date.now()),
			allow_controls:
				typeof raw.allow_controls === "boolean" ? raw.allow_controls : undefined,
			index: typeof raw.index === "number" ? raw.index : undefined,
			trackId: typeof raw.trackId === "string" ? raw.trackId : undefined,
		}
	}

	const applyPlaybackState = (state: JamPlaybackState) => {
		if (state.ts_ms <= lastPlaybackTsRef.current) return
		lastPlaybackTsRef.current = state.ts_ms

		const queue = sharedQueueRef.current
		if (!queue.length) return

		let idx = -1
		if (state.queue_item_id) {
			idx = queue.findIndex((t) => t.queue_item_id === state.queue_item_id)
		}
		if (idx === -1 && state.trackId) {
			idx = queue.findIndex((t) => t.id === state.trackId)
		}
		if (idx === -1 && typeof state.index === "number") {
			const safeIndex = Math.floor(state.index)
			if (safeIndex >= 0 && safeIndex < queue.length) idx = safeIndex
		}
		if (idx === -1) return

		currentIndexRef.current = idx
		currentQueueItemIdRef.current = queue[idx]?.queue_item_id ?? null
		const track = queue[idx]

		const current = usePlayer.getState().currentTrack
		const currentQueueItemId = current?.queue_item_id ?? null
		if (currentQueueItemId !== track.queue_item_id) {
			player.setCurrentTrack(track, queue, idx, {
				suppressListeners: true,
				autoplay: state.is_playing,
			})
		} else {
			player.setIsPlaying(state.is_playing, { suppressListeners: true })
		}
		lastAppliedIsPlayingRef.current = state.is_playing

		let offsetMs = Math.max(0, state.offset_ms)
		if (state.is_playing) {
			const drift = Date.now() - state.ts_ms
			if (drift > 0) offsetMs += drift
		}

		const trackDurationMs =
			typeof track.duration === "number" && track.duration > 0
				? track.duration * 1000
				: 0
		if (trackDurationMs > 0 && offsetMs > trackDurationMs) {
			offsetMs = Math.max(0, trackDurationMs - 500)
		}

		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("jam:apply-playback", {
						detail: {
							trackId: track.id,
							offsetMs,
							isPlaying: state.is_playing,
							tsMs: state.ts_ms,
						},
					}),
				)
			} catch {
				// ignore
			}
			}
		}

		const appendQueueItems = (items: Track[]) => {
			setSharedQueue((prev) => {
				const seen = new Set<string>()
				prev.forEach((t) => seen.add(t.queue_item_id ?? t.id))
				const deduped = items.filter((t) => !seen.has(t.queue_item_id ?? t.id))
				return deduped.length ? [...prev, ...deduped] : prev
			})
		}

	const handleIncomingCommand = (cmd: JamCommand, fromUserId?: string) => {
		if (!isHost) return
		if (isJamDebugEnabled()) {
			console.log("[jam] handleIncomingCommand", { sessionId, cmd, fromUserId })
		}
		// Guests may always request queue additions. Playback changes are gated by allowControls.
		if (cmd.type !== "REQUEST_ADD_TRACKS" && !allowControls) {
			if (!fromUserId || fromUserId !== currentUserId) return
		}

			switch (cmd.type) {
				case "REQUEST_SEEK":
					{
						const queue = sharedQueueRef.current
					const idx = queue.findIndex((t) => t.queue_item_id === cmd.queue_item_id)
					if (idx === -1) return
					const track = queue[idx]
					const isPlaying = usePlayer.getState().isPlaying

					lastPositionMsRef.current = cmd.offset_ms
					currentIndexRef.current = idx
					currentQueueItemIdRef.current = cmd.queue_item_id

					player.setCurrentTrack(track, queue, idx, {
						suppressListeners: true,
						autoplay: isPlaying,
					})
					player.setIsPlaying(isPlaying, { suppressListeners: true })

					if (typeof window !== "undefined") {
						try {
							window.dispatchEvent(
								new CustomEvent("jam:apply-playback", {
									detail: { trackId: track.id, offsetMs: cmd.offset_ms },
								}),
							)
						} catch {
							// ignore
						}
					}

					sendPlaybackState(track, idx, isPlaying, {
						queueItemId: cmd.queue_item_id,
						offsetMs: cmd.offset_ms,
					})
				}
				break
			case "REQUEST_PLAY_QUEUE_ITEM":
				{
					const queue = sharedQueueRef.current
					const idx = queue.findIndex((t) => t.queue_item_id === cmd.queue_item_id)
					if (idx === -1) return
					const track = queue[idx]

					lastPositionMsRef.current = 0
					currentIndexRef.current = idx
					currentQueueItemIdRef.current = cmd.queue_item_id

					player.setCurrentTrack(track, queue, idx, {
						suppressListeners: true,
						autoplay: true,
					})
					player.setIsPlaying(true, { suppressListeners: true })

					sendPlaybackState(track, idx, true, {
						queueItemId: cmd.queue_item_id,
						offsetMs: 0,
					})
				}
				break
			case "REQUEST_PLAY_PAUSE":
				player.setIsPlaying(cmd.is_playing)
				break
			case "REQUEST_ADD_TRACKS":
				void addToJamQueue(cmd.tracks)
				break
			default:
				break
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
			} else if (msg?.type === "controls_mode") {
				setAllowControlsState(Boolean(msg.allow_controls))
			} else if (
				(msg?.type === "queue" || msg?.type === "queue_snapshot") &&
				Array.isArray(msg.tracks || msg.queue)
			) {
				const raw = (msg.tracks as any[]) ?? (msg.queue as any[])
				// Never allow an empty snapshot to wipe out a non-empty queue that
				// we already hydrated from the API.
				if (!raw.length && sharedQueueRef.current.length) return
				const incoming = raw.map((item) => {
					const base = item?.track || item
					const merged = {
						...(base ?? {}),
						queue_item_id:
							item?.queue_item_id ?? base?.queue_item_id ?? undefined,
						position:
							typeof item?.position === "number"
								? item.position
								: base?.position,
					}
					return normalizeTrackFromWire(merged)
				})
				setSharedQueue(incoming)
			} else if (msg?.type === "queue_add" && Array.isArray(msg.items)) {
				const items = (msg.items as any[]).map((it) => {
					const base = it?.track || it
					const merged = {
						...(base ?? {}),
						queue_item_id:
							it?.queue_item_id ?? base?.queue_item_id ?? undefined,
						position:
							typeof it?.position === "number" ? it.position : base?.position,
					}
					return normalizeTrackFromWire(merged)
				})
				appendQueueItems(items)
			} else if (msg?.type === "playback_state") {
				const state = parsePlaybackState(msg)
				if (state) applyPlaybackState(state)
			} else if (msg?.type === "jam_command" && msg.cmd) {
				handleIncomingCommand(msg.cmd as JamCommand, msg.fromUserId as string)
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
		lastConnectArgsRef.current = { id, role, self }
		const wsUrl = `ws://localhost:3002/ws/jam/${id}`
		setStatus("connecting")
		try {
			const ws = new WebSocket(wsUrl)
			wsManualCloseRef.current = false
			wsRef.current = ws
			ws.onopen = () => {
				setStatus("connected")
				wsReconnectAttemptsRef.current = 0
				wsManualCloseRef.current = false
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
			ws.onclose = () => {
				if (wsManualCloseRef.current) return
				setStatus("disconnected")

				// If the relay is restarted (common during dev), attempt to reconnect.
				// Without this, guests appear "disabled" (no WS, no BC).
				if (wsReconnectAttemptsRef.current >= 5) {
					teardown()
					connectBroadcastChannel(id, self, role)
					return
				}

				wsReconnectAttemptsRef.current += 1
				wsRef.current = null
				if (typeof window !== "undefined") {
					wsReconnectTimerRef.current = window.setTimeout(() => {
						const last = lastConnectArgsRef.current
						if (!last) return
						connectWebSocket(last.id, last.role, last.self)
					}, 400)
				}
			}
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
					} else if (msg.type === "controls_mode") {
						setAllowControlsState(Boolean(msg.allow_controls))
					} else if (
						(msg.type === "queue" || msg.type === "queue_snapshot") &&
						Array.isArray(msg.tracks || msg.queue)
					) {
						const raw = (msg.tracks as any[]) ?? (msg.queue as any[])
						if (!raw.length && sharedQueueRef.current.length) return
						const incoming = raw.map((item) => {
							const base = item?.track || item
							const merged = {
								...(base ?? {}),
								queue_item_id:
									item?.queue_item_id ?? base?.queue_item_id ?? undefined,
								position:
									typeof item?.position === "number"
										? item.position
										: base?.position,
							}
							return normalizeTrackFromWire(merged)
						})
						setSharedQueue(incoming)
					} else if (msg.type === "queue_add" && Array.isArray(msg.items)) {
						const items = (msg.items as any[]).map((it) => {
							const base = it?.track || it
							const merged = {
								...(base ?? {}),
								queue_item_id:
									it?.queue_item_id ?? base?.queue_item_id ?? undefined,
								position:
									typeof it?.position === "number"
										? it.position
										: base?.position,
							}
							return normalizeTrackFromWire(merged)
						})
						appendQueueItems(items)
					} else if (msg.type === "playback_state") {
						const state = parsePlaybackState(msg)
						if (state) applyPlaybackState(state)
					} else if (msg.type === "jam_command" && msg.cmd) {
						handleIncomingCommand(msg.cmd as JamCommand, msg.fromUserId as string)
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
			// Use the backend's canonical allow_controls value so the host
			// UI accurately reflects who may control playback.
			setAllowControlsState(Boolean(data.jam.allow_controls))
			setParticipants(
				dedupeParticipants(
					(data.participants?.map((p: ApiParticipant) => mapParticipant(p)) ?? [
						self,
					]) as JamParticipant[],
				),
			)
			const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
			const initialQueueSource =
				apiQueueItems.length > 0
					? apiQueueItems.map((item) =>
							normalizeTrackFromWire({
								...(item.track ?? {}),
								queue_item_id: item.queue_item_id,
								position: item.position,
							}),
						)
					: baseQueue.map((t) => normalizeTrackFromWire(t))

			const initialQueue = initialQueueSource
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
			const hostUserId = data?.jam?.host_user_id?.toString?.() ?? null
			const amHost = hostUserId != null && hostUserId === currentUserId
			const self: JamParticipant = {
				id: currentUserId ?? randomId(),
				name: currentUserName ?? "You",
				role: amHost ? "host" : "guest",
			}
			setSessionId(id)
			setIsHost(amHost)
			setAllowControlsState(Boolean(data.jam.allow_controls))
			setParticipants(
				dedupeParticipants(
					(data.participants?.map((p: ApiParticipant) => mapParticipant(p)) ?? [
						self,
					]) as JamParticipant[],
				),
			)
			const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
			const queueFromApi =
				apiQueueItems.length > 0
					? apiQueueItems.map((item) =>
							normalizeTrackFromWire({
								...(item.track ?? {}),
								queue_item_id: item.queue_item_id,
								position: item.position,
							}),
						)
					: []
			setSharedQueue(queueFromApi)
			// Do not auto-start playback on join; wait for the next PLAYBACK_STATE
			// from the host so we avoid offset drift.
			connectWebSocket(id, amHost ? "host" : "guest", self)
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
		if (!sessionId || !isHost) return

		const normalised = queue.map((t) => normalizeTrackFromWire(t))
		setSharedQueue(normalised)

		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue`, {
				tracks: normalised, // Send full objects
			})
			const data = response.data
			const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
			const updatedQueue =
				apiQueueItems.length > 0
					? apiQueueItems.map((item) =>
							normalizeTrackFromWire({
								...(item.track ?? {}),
								queue_item_id: item.queue_item_id,
								position: item.position,
							}),
						)
					: normalised
			setSharedQueue(updatedQueue)
		} catch (err) {
			console.error("Error syncing Jam queue", err)
		}
	}

	const addToJamQueue = async (tracks: Track[]) => {
		if (!sessionId || !tracks.length) return

		const normalised = tracks.map((t) => normalizeTrackFromWire(t))
		if (!isHost) {
			sendCommand({ type: "REQUEST_ADD_TRACKS", tracks: normalised })
			return
		}
		const current = sharedQueueRef.current

		// Optimistic update locally
		const optimistic = [...current, ...normalised]
		setSharedQueue(optimistic)

		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue/add`, {
				tracks: normalised, // Send full objects
			})
			const data = response.data
			const apiQueueItems = (data.queue as ApiQueueItem[] | undefined) ?? []
			const updatedQueue =
				apiQueueItems.length > 0
					? apiQueueItems.map((item) =>
							normalizeTrackFromWire({
								...(item.track ?? {}),
								queue_item_id: item.queue_item_id,
								position: item.position,
							}),
						)
					: optimistic
			setSharedQueue(updatedQueue)
		} catch (err) {
			console.error("Error adding tracks to Jam queue", err)
		}
	}

	const removeFromQueue = async (trackId: string) => {
		if (!sessionId || !isHost) return

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
		options?: { offsetMs?: number; queueItemId?: string | null },
	) => {
		if (!sessionId || !isHost) return

		const queue = sharedQueueRef.current
		let effectiveIndex =
			typeof index === "number" && index >= 0 ? index : currentIndexRef.current

		let queueItemId =
			options?.queueItemId ?? track?.queue_item_id ?? currentQueueItemIdRef.current

		if (!queueItemId && track) {
			const byId = queue.find((t) => t.id === track.id && t.queue_item_id)
			if (byId?.queue_item_id) queueItemId = byId.queue_item_id
		}

			if (!queueItemId && typeof effectiveIndex === "number") {
				if (effectiveIndex >= 0 && effectiveIndex < queue.length) {
					queueItemId = queue[effectiveIndex]?.queue_item_id ?? null
				}
			}

		if (queueItemId) {
			const idx = queue.findIndex((t) => t.queue_item_id === queueItemId)
			if (idx >= 0) effectiveIndex = idx
			currentQueueItemIdRef.current = queueItemId
		}

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

		const payload: JamPlaybackState & { index?: number; trackId?: string } = {
			queue_item_id: queueItemId ?? null,
			offset_ms: offsetMs,
			is_playing: isPlaying,
			ts_ms: ts,
			allow_controls: allowControls,
			index: typeof effectiveIndex === "number" ? effectiveIndex : undefined,
			trackId: queueItemId
				? queue.find((t) => t.queue_item_id === queueItemId)?.id
				: track?.id,
		}

		emit({
			type: "playback_state",
			jamId: sessionId,
			state: payload,
			clientId: clientIdRef.current,
		})

		if (isHost) {
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
			if (!state.currentTrack || state.currentTrack.id !== detail.trackId)
				return
			if (!canControl) return
			if (isHost) {
				sendPlaybackState(
					state.currentTrack,
					state.currentIndex,
					state.isPlaying,
					{
						offsetMs: detail.currentTimeMs,
					},
				)
			} else {
				// Guests send a command; host will emit the canonical playback_state
				if (currentQueueItemIdRef.current) {
					sendCommand({
						type: "REQUEST_SEEK",
						queue_item_id: currentQueueItemIdRef.current,
						offset_ms: detail.currentTimeMs,
					})
				}
			}
		}
		window.addEventListener("jam:seek", handler as EventListener)
		return () =>
			window.removeEventListener("jam:seek", handler as EventListener)
	}, [sessionId, canControl])

	// Emit playback_state on player events (host), and prevent guests from entering
	// private playback while participating in a Jam.
	useEffect(() => {
		if (!sessionId) {
			player.setListeners({})
			return
		}

		const onTrackChange = async (track: Track | null, index: number) => {
			if (!track) return

			if (!isHost) {
				const currentQueue = sharedQueueRef.current
				const target = currentQueue.find((t) => t.id === track.id)
				const targetQueueItemId = target?.queue_item_id

				if (allowControls && targetQueueItemId) {
					sendCommand({
						type: "REQUEST_PLAY_QUEUE_ITEM",
						queue_item_id: targetQueueItemId,
					})
				} else if (allowControls && !targetQueueItemId) {
					// If the track isn't in the Jam queue, treat this as a request to add.
					sendCommand({ type: "REQUEST_ADD_TRACKS", tracks: [track] })
				}

				// Revert to last known Jam playback state.
				const fallbackQueueItemId = currentQueueItemIdRef.current
				const fallbackIndex =
					fallbackQueueItemId != null
						? currentQueue.findIndex((t) => t.queue_item_id === fallbackQueueItemId)
						: currentIndexRef.current

				const safeIndex =
					fallbackIndex >= 0 && fallbackIndex < currentQueue.length
						? fallbackIndex
						: 0

				if (currentQueue.length) {
					player.setCurrentTrack(currentQueue[safeIndex], currentQueue, safeIndex, {
						suppressListeners: true,
						autoplay: lastAppliedIsPlayingRef.current,
					})
				}
				player.setIsPlaying(lastAppliedIsPlayingRef.current, {
					suppressListeners: true,
				})

				return
			}

			// Host path
			let effectiveTrack: Track = track
			let effectiveIndex = index

			const currentQueue = sharedQueueRef.current
			let existingIndex = currentQueue.findIndex(
				(t) => t.id === track.id && t.queue_item_id,
			)

			if (existingIndex === -1) {
				// If this client is not the host, we do not allow it to
				// introduce new tracks into the Jam queue. The user can still
				// control playback of existing Jam tracks.
				if (!isHost) {
					return
				}

				// Host path: track is not yet part of the Jam queue; add it and
				// wait for the queue to be synchronised with the backend.
				try {
					await addToJamQueue([track])
				} catch {
					return
				}

				const updatedQueue = sharedQueueRef.current
				existingIndex = updatedQueue.findIndex(
					(t) => t.id === track.id && t.queue_item_id,
				)
				if (existingIndex === -1) {
					return
				}
				effectiveIndex = existingIndex
				effectiveTrack = updatedQueue[existingIndex]
			} else {
				effectiveIndex = existingIndex
				effectiveTrack = currentQueue[existingIndex]
			}

			currentIndexRef.current = effectiveIndex
			// New explicit track selection always starts from the beginning.
			lastPositionMsRef.current = 0
			sendPlaybackState(effectiveTrack, effectiveIndex, true, { offsetMs: 0 })
		}

		const onPlayStateChange = (isPlaying: boolean) => {
			if (!sessionId) return

			if (!isHost) {
				if (allowControls) {
					sendCommand({ type: "REQUEST_PLAY_PAUSE", is_playing: isPlaying })
				}
				// Revert local play state until host broadcasts canonical state.
				player.setIsPlaying(lastAppliedIsPlayingRef.current, {
					suppressListeners: true,
				})
				return
			}

			const state = usePlayer.getState()
			sendPlaybackState(state.currentTrack, state.currentIndex, isPlaying)
		}

		player.setListeners({ onTrackChange, onPlayStateChange })
		// cleanup happens when deps change
	}, [sessionId, isHost, allowControls])

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
				} else if (msg.type === "controls_mode") {
					setAllowControlsState(Boolean(msg.allow_controls))
				} else if (
					(msg.type === "queue" || msg.type === "queue_snapshot") &&
					Array.isArray(msg.queue)
				) {
					const raw = msg.queue as any[]
					if (!raw.length && sharedQueueRef.current.length) return
					const incoming = raw.map((item) =>
						normalizeTrackFromWire(item?.track ?? item),
					)
					setSharedQueue(incoming)
				} else if (msg.type === "queue_add" && Array.isArray(msg.items)) {
					const items = (msg.items as any[]).map((it) =>
						normalizeTrackFromWire(it.track ?? it),
					)
					appendQueueItems(items)
				} else if (msg.type === "playback_state") {
					const state = parsePlaybackState(msg)
					if (state) applyPlaybackState(state)
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
		sendCommand,
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
