import { useEffect, useMemo, useRef, useState } from "react"

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

/**
 * Lightweight jam session manager.
 * - Tries WebSocket at ws://<host>:3002/ws/jam/{id} (external tiny node server)
 * - Falls back to BroadcastChannel for local-tab collaboration (so QR/link works when app already open)
 */
export function useJamSession(currentUserName: string | null) {
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [isHost, setIsHost] = useState(false)
	const [participants, setParticipants] = useState<JamParticipant[]>([])
	const [status, setStatus] = useState<ConnectionStatus>("disconnected")
	const [allowControls, setAllowControls] = useState(true)
	const wsRef = useRef<WebSocket | null>(null)
	const bcRef = useRef<BroadcastChannel | null>(null)

	const inviteLink = useMemo(() => {
		if (!sessionId || typeof window === "undefined") return null
		return `${window.location.origin}/jam/${sessionId}`
	}, [sessionId])

	const qrUrl = useMemo(() => {
		if (!inviteLink) return null
		return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteLink)}`
	}, [inviteLink])

	const teardown = () => {
		wsRef.current?.close()
		wsRef.current = null
		bcRef.current?.close()
		bcRef.current = null
	}

	const broadcastParticipants = (list: JamParticipant[]) => {
		if (bcRef.current) {
			bcRef.current.postMessage({ type: "participants", participants: list })
		}
	}

	const connectBroadcastChannel = (id: string, self: JamParticipant) => {
		if (typeof BroadcastChannel === "undefined") {
			setStatus("error")
			return
		}
		bcRef.current = new BroadcastChannel(`jam-${id}`)
		setStatus("connected")
		bcRef.current.onmessage = (ev) => {
			const msg = ev.data
			if (msg?.type === "participants" && Array.isArray(msg.participants)) {
				setParticipants(msg.participants)
			}
			if (msg?.type === "announce" && msg.participant) {
				setParticipants((prev) => {
					const exists = prev.find((p) => p.id === msg.participant.id)
					const next = exists ? prev : [...prev, msg.participant]
					broadcastParticipants(next)
					return next
				})
			}
		}
		// announce ourselves
		setParticipants((prev) => {
			const base = prev.find((p) => p.id === self.id) ? prev : [...prev, self]
			broadcastParticipants(base)
			return base
		})
		bcRef.current.postMessage({ type: "announce", participant: self })
	}

	const connectWebSocket = (
		id: string,
		role: JamRole,
		self: JamParticipant,
	) => {
		if (typeof window === "undefined") return
		const wsUrl = `ws://localhost:3002/ws/jam/${id}${role === "host" ? "?host=1" : ""}`
		setStatus("connecting")
		try {
			const ws = new WebSocket(wsUrl)
			wsRef.current = ws
			ws.onopen = () => {
				setStatus("connected")
				ws.send(JSON.stringify({ type: "announce", participant: self }))
			}
			ws.onerror = () => {
				setStatus("error")
				teardown()
				connectBroadcastChannel(id, self)
			}
			ws.onclose = () => setStatus("disconnected")
			ws.onmessage = (ev) => {
				try {
					const msg = JSON.parse(ev.data)
					if (msg.type === "participants" && Array.isArray(msg.participants)) {
						setParticipants(msg.participants)
					}
					if (msg.type === "announce" && msg.participant) {
						setParticipants((prev) => {
							const exists = prev.find((p) => p.id === msg.participant.id)
							const next = exists ? prev : [...prev, msg.participant]
							ws.send(
								JSON.stringify({ type: "participants", participants: next }),
							)
							return next
						})
					}
				} catch (err) {
					console.warn("Bad WS message", err)
				}
			}
		} catch (_err) {
			setStatus("error")
			connectBroadcastChannel(id, self)
		}
	}

	const startJam = () => {
		const id = randomId()
		const self: JamParticipant = {
			id: `user-${randomId()}`,
			name: currentUserName ?? "You",
			role: "host",
		}
		setSessionId(id)
		setIsHost(true)
		setParticipants([self])
		connectWebSocket(id, "host", self)
	}

	const endJam = () => {
		teardown()
		setSessionId(null)
		setParticipants([])
		setIsHost(false)
		setStatus("disconnected")
	}

	const joinJam = (id: string) => {
		const self: JamParticipant = {
			id: `user-${randomId()}`,
			name: currentUserName ?? "You",
			role: "guest",
		}
		setSessionId(id)
		setIsHost(false)
		setParticipants([self])
		connectWebSocket(id, "guest", self)
	}

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
		startJam,
		endJam,
		joinJam,
	}
}
