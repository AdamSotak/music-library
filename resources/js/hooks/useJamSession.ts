import { useEffect, useMemo, useRef, useState } from "react"
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

const mapParticipant = (input: ApiParticipant): JamParticipant => ({
	id: input.id?.toString() ?? randomId(),
	name: input.name ?? "Guest",
	role: input.role === "host" ? "host" : "guest",
})

export function useJamSession(
	currentUserId: string | null,
	currentUserName: string | null,
) {
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
	const player = usePlayer()

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
				const incoming = (msg.tracks as Track[]) ?? (msg.queue as Track[])
				setSharedQueue(dedupeById(incoming))
			} else if (msg?.type === "queue_add" && Array.isArray(msg.items)) {
				const items = msg.items
					.map((it: any) => it.track ?? it)
					.filter(Boolean) as Track[]
				setSharedQueue((prev) => dedupeById([...prev, ...items]))
			} else if (msg?.type === "playback_state") {
				if (msg.clientId && msg.clientId === clientIdRef.current) return
				if (typeof msg.ts === "number" && msg.ts < lastPlaybackTsRef.current)
					return
				lastPlaybackTsRef.current = msg.ts ?? Date.now()
				const queue = sharedQueueRef.current
				if (!queue.length) return
				const idx =
					typeof msg.index === "number" && msg.index >= 0
						? msg.index
						: queue.findIndex((t) => t.id === msg.trackId)
				if (idx >= 0 && queue[idx]) {
					currentIndexRef.current = idx
					player.setCurrentTrack(queue[idx], queue, idx, {
						suppressListeners: true,
					})
					if (typeof msg.isPlaying === "boolean") {
						player.setIsPlaying(msg.isPlaying, { suppressListeners: true })
					}
				}
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
						const incoming = (msg.tracks as Track[]) ?? (msg.queue as Track[])
						setSharedQueue(dedupeById(incoming))
					} else if (msg.type === "queue_add" && Array.isArray(msg.items)) {
						const items = msg.items
							.map((it: any) => it.track ?? it)
							.filter(Boolean) as Track[]
						setSharedQueue((prev) => dedupeById([...prev, ...items]))
					} else if (msg.type === "playback_state") {
						if (msg.clientId && msg.clientId === clientIdRef.current) return
						if (
							typeof msg.ts === "number" &&
							msg.ts < lastPlaybackTsRef.current
						)
							return
						lastPlaybackTsRef.current = msg.ts ?? Date.now()
						const queue = sharedQueueRef.current
						if (!queue.length) return
						const idx =
							typeof msg.index === "number" && msg.index >= 0
								? msg.index
								: queue.findIndex((t) => t.id === msg.trackId)
						if (idx >= 0 && queue[idx]) {
							currentIndexRef.current = idx
							player.setCurrentTrack(queue[idx], queue, idx, {
								suppressListeners: true,
							})
							if (typeof msg.isPlaying === "boolean") {
								player.setIsPlaying(msg.isPlaying, {
									suppressListeners: true,
								})
							}
							// TODO: seek to msg.offsetMs when a seek helper is available
						}
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
			const initialQueue =
				(data.queue as ApiQueueItem[] | undefined)?.map((item) => item.track) ??
				baseQueue
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
			connectWebSocket(id, "host", self)
		} catch (error: any) {
			console.error("Failed to create jam session", error)
		}
	}

	const endJam = () => {
		teardown()
		player.setListeners({})
		setSessionId(null)
		setParticipants([])
		setIsHost(false)
		setSharedQueue([])
		setStatus("disconnected")
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
			const queueFromApi =
				(data.queue as ApiQueueItem[] | undefined)?.map((item) => item.track) ??
				[]
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
				player.setCurrentTrack(queueFromApi[safeIndex], queueFromApi, safeIndex)
			}
			connectWebSocket(id, "guest", self)
			return true
		} catch (error) {
			console.error("Unable to join jam", id, error)
			return false
		}
	}

	const syncQueue = async (queue: Track[]) => {
		setSharedQueue(dedupeById(queue))
		if (!sessionId) return

		emit({
			type: "queue_snapshot",
			jamId: sessionId,
			tracks: queue,
			index: currentIndexRef.current ?? 0,
		})

		try {
			const response = await axios.post(`/api/jams/${sessionId}/queue`, {
				tracks: queue, // Send full objects
			})
			const data = response.data
			const updatedQueue = dedupeById(
				(data.queue as ApiQueueItem[] | undefined)?.map((item) => item.track) ??
					queue,
			)
			setSharedQueue(updatedQueue)
		} catch (err) {
			console.error("Error syncing Jam queue", err)
		}
	}

	const addToJamQueue = async (tracks: Track[]) => {
		if (!sessionId || !tracks.length) return

		const current = sharedQueueRef.current
		const deduped = tracks.filter((t) => !current.some((p) => p.id === t.id))
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
	) => {
		if (!sessionId) return

		const effectiveIndex =
			typeof index === "number" && index >= 0 ? index : currentIndexRef.current
		currentIndexRef.current = effectiveIndex ?? 0

		emit({
			type: "playback_state",
			jamId: sessionId,
			trackId: track?.id,
			index: effectiveIndex,
			offsetMs: 0,
			isPlaying,
			ts: Date.now(),
			clientId: clientIdRef.current,
		})

		axios
			.post(`/api/jams/${sessionId}/playback`, {
				position: typeof effectiveIndex === "number" ? effectiveIndex : 0,
				offset_ms: 0,
				is_playing: isPlaying,
			})
			.catch((err: any) => {
				console.error("Failed to persist Jam playback state", err)
			})
	}

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
			sendPlaybackState(track, index, true)
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
				} else if (msg.type === "queue" && Array.isArray(msg.queue)) {
					setSharedQueue(msg.queue)
				} else if (msg.type === "queue_add" && Array.isArray(msg.items)) {
					const items = msg.items
						.map((it: any) => it.track ?? it)
						.filter(Boolean) as Track[]
					setSharedQueue((prev) => [...prev, ...items])
				} else if (msg.type === "playback_state") {
					if (msg.clientId && msg.clientId === clientIdRef.current) return
					if (typeof msg.ts === "number" && msg.ts < lastPlaybackTsRef.current)
						return
					lastPlaybackTsRef.current = msg.ts ?? Date.now()
					const queue = sharedQueueRef.current
					if (!queue.length) return
					const idx =
						typeof msg.index === "number" && msg.index >= 0
							? msg.index
							: queue.findIndex((t) => t.id === msg.trackId)
					if (idx >= 0 && queue[idx]) {
						currentIndexRef.current = idx
						player.setCurrentTrack(queue[idx], queue, idx, {
							suppressListeners: true,
						})
						if (typeof msg.isPlaying === "boolean") {
							player.setIsPlaying(msg.isPlaying, {
								suppressListeners: true,
							})
						}
					}
				}
			} catch {
				// ignore bad payload
			}
		}
		window.addEventListener("storage", onStorage)
		return () => window.removeEventListener("storage", onStorage)
	}, [isHost])

	useEffect(() => () => teardown(), [])

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
