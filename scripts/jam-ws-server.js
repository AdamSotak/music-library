// Minimal WebSocket Jam relay server
// Usage: npm install && node scripts/jam-ws-server.js
// Keeps an in-memory map of jam rooms with participants, queue, playback.

import { WebSocketServer } from "ws"
import { createServer } from "http"

const PORT = process.env.JAM_WS_PORT ? Number(process.env.JAM_WS_PORT) : 3002

/**
 * @typedef {{
 *  jamId: string
 *  userId: string
 *  name: string
 *  role: 'host' | 'guest'
 * }} Participant
 */

const rooms = new Map() // jamId -> { participants: Map<socket, Participant>, queue: any[], playback: { index, offsetMs, isPlaying, trackId, queue_item_id, allow_controls, updatedAt }, hostUserId?: string }

// Create raw HTTP server to handle both WS upgrades and internal broadcast API
const server = createServer((req, res) => {
	// Enable CORS for local dev if needed, or restricting to localhost
	res.setHeader("Access-Control-Allow-Origin", "*")
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
	res.setHeader("Access-Control-Allow-Headers", "Content-Type")

	if (req.method === "OPTIONS") {
		res.writeHead(204)
		res.end()
		return
	}

	if (req.method === "POST" && req.url === "/broadcast") {
		let body = ""
		req.on("data", (chunk) => {
			body += chunk
		})
		req.on("end", () => {
			try {
				const data = JSON.parse(body)
				const { jamId, ...payload } = data

				if (!jamId) {
					res.writeHead(400, { "Content-Type": "application/json" })
					res.end(JSON.stringify({ error: "Missing jamId" }))
					return
				}

				// If the room doesn't exist yet in memory, we might just be setting it up,
				// or it's empty. We can still try to broadcast to any connected peers if any.
				// If strictly necessary, we could upsert it, but usually broadcast is adequate.
				const room = rooms.get(jamId)
				if (room && room.participants.size > 0) {
					// Keep an in-memory mirror of the latest queue/playback state
					// using whatever the backend considers canonical.
					if (payload.type === "queue_snapshot" || payload.type === "queue") {
						if (payload.tracks || payload.queue) {
							room.queue = payload.tracks || payload.queue
						}
					}
					if (payload.type === "queue_add") {
						if (Array.isArray(payload.items)) {
							room.queue = room.queue.concat(payload.items)
						}
					}
					if (payload.type === "playback_state") {
						const state = payload.state ?? payload
						if (typeof state.index === "number") room.playback.index = state.index
						if (typeof state.offset_ms === "number")
							room.playback.offsetMs = state.offset_ms
						if (typeof state.offsetMs === "number")
							room.playback.offsetMs = state.offsetMs
						if (typeof state.is_playing === "boolean")
							room.playback.isPlaying = state.is_playing
						if (typeof state.isPlaying === "boolean")
							room.playback.isPlaying = state.isPlaying
						if (typeof state.trackId === "string") room.playback.trackId = state.trackId
						if (typeof state.queue_item_id === "string")
							room.playback.queue_item_id = state.queue_item_id
						if (typeof state.allow_controls === "boolean")
							room.playback.allow_controls = state.allow_controls
						room.playback.updatedAt = Date.now()
					}

					// Fan out the backend event to all connected clients.
					broadcast(jamId, payload, null)
				}

				res.writeHead(200, { "Content-Type": "application/json" })
				res.end(JSON.stringify({ success: true }))
			} catch (err) {
				console.error("Broadcast error", err)
				res.writeHead(500, { "Content-Type": "application/json" })
				res.end(JSON.stringify({ error: "Server error" }))
			}
		})
		return
	}

	// 404 for anything else
	res.writeHead(404)
	res.end()
})

const wss = new WebSocketServer({ server })

const broadcast = (jamId, data, except) => {
	const room = rooms.get(jamId)
	if (!room) return
	for (const [socket] of room.participants) {
		if (socket !== except && socket.readyState === socket.OPEN) {
			socket.send(JSON.stringify(data))
		}
	}
}

const upsertRoom = (jamId) => {
	if (!rooms.has(jamId)) {
		rooms.set(jamId, {
			participants: new Map(),
			queue: [],
			playback: { index: 0, offsetMs: 0, isPlaying: false },
			hostUserId: null,
		})
	}
	return rooms.get(jamId)
}

wss.on("connection", (ws) => {
	let jamId = null

	ws.on("message", (raw) => {
		let msg
		try {
			msg = JSON.parse(raw.toString())
		} catch {
			return
		}

		const type = msg?.type
		if (!type || !msg.jamId) return
		jamId = msg.jamId
		const room = upsertRoom(jamId)

		switch (type) {
			case "announce": {
				const participant = {
					jamId,
					userId: msg.userId ?? crypto.randomUUID(),
					name: msg.name ?? "Guest",
					role: msg.role === "host" ? "host" : "guest",
				}

				// Track which user is the authoritative host for playback.
				// Prefer the most recent host announcement (handles reconnects).
				if (participant.role === "host") {
					room.hostUserId = participant.userId
				}

				room.participants.set(ws, participant)
				const list = Array.from(room.participants.values()).map((p) => ({
					id: p.userId,
					name: p.name,
					role: p.role,
				}))
				// notify others
				broadcast(jamId, { type: "participants", jamId, participants: list }, ws)
				// send state to this socket
				if (ws.readyState === ws.OPEN) {
					const index =
						typeof room.playback.index === "number" && room.playback.index >= 0
							? room.playback.index
							: 0
					const candidate = Array.isArray(room.queue) ? room.queue[index] : null
					const derivedQueueItemId =
						candidate?.queue_item_id ??
						candidate?.queueItemId ??
						candidate?.track?.queue_item_id ??
						null
					const derivedTrackId =
						candidate?.track?.id ?? candidate?.id ?? room.playback.trackId ?? null

					ws.send(JSON.stringify({ type: "participants", jamId, participants: list }))
					ws.send(
						JSON.stringify({
							type: "queue_snapshot",
							jamId,
							tracks: room.queue,
							index,
						}),
					)
					ws.send(
						JSON.stringify({
							type: "playback_state",
							jamId,
							state: {
								queue_item_id:
									room.playback.queue_item_id ?? derivedQueueItemId ?? null,
								offset_ms: room.playback.offsetMs ?? 0,
								is_playing: room.playback.isPlaying ?? false,
								ts_ms: room.playback.updatedAt ?? Date.now(),
								allow_controls:
									typeof room.playback.allow_controls === "boolean"
										? room.playback.allow_controls
										: undefined,
								index,
								trackId: derivedTrackId ?? undefined,
							},
						}),
					)
				}
				break
			}
			case "queue_snapshot": {
				// Client-side updates (Host -> Server)
				if (Array.isArray(msg.tracks) && typeof msg.index === "number") {
					room.queue = msg.tracks
					room.playback.index = msg.index
					broadcast(
						jamId,
						{
							type: "queue_snapshot",
							jamId,
							tracks: room.queue,
							index: room.playback.index,
						},
						ws,
					)
				}
				break
			}
			case "queue_add": {
				if (Array.isArray(msg.items)) {
					room.queue = room.queue.concat(msg.items.map((it) => it.track || it))
					broadcast(jamId, { type: "queue_add", jamId, items: msg.items }, ws)
				}
				break
			}
			case "playback_state": {
				const state = msg.state ?? msg
				if (typeof state.index === "number") room.playback.index = state.index
				if (typeof state.offset_ms === "number")
					room.playback.offsetMs = state.offset_ms
				if (typeof state.offsetMs === "number") room.playback.offsetMs = state.offsetMs
				if (typeof state.is_playing === "boolean")
					room.playback.isPlaying = state.is_playing
				if (typeof state.isPlaying === "boolean")
					room.playback.isPlaying = state.isPlaying
				if (typeof state.trackId === "string") room.playback.trackId = state.trackId
				if (typeof state.queue_item_id === "string")
					room.playback.queue_item_id = state.queue_item_id
				if (typeof state.allow_controls === "boolean")
					room.playback.allow_controls = state.allow_controls
				room.playback.updatedAt = Date.now()
				broadcast(jamId, msg, ws)
				break
			}
			case "controls_mode": {
				if (typeof msg.allow_controls === "boolean") {
					broadcast(
						jamId,
						{
							type: "controls_mode",
							jamId,
							allow_controls: msg.allow_controls,
						},
						ws,
					)
				}
				break
			}
			case "jam_command": {
				// Broadcast commands to the whole room and let the host client apply them.
				// This avoids silent drops when host socket selection drifts (reconnects,
				// multiple tabs, or hostUserId mismatch).
				const fromUserId = room.participants.get(ws)?.userId
				broadcast(
					jamId,
					{
						type: "jam_command",
						jamId,
						fromUserId,
						cmd: msg.cmd,
					},
					ws,
				)
				break
			}
			default:
				break
		}
	})

	ws.on("close", () => {
		if (!jamId) return
		const room = rooms.get(jamId)
		if (!room) return
		const leaving = room.participants.get(ws)
		room.participants.delete(ws)

		// If the active host disconnected, attempt to elect another connected host.
		if (leaving?.userId && room.hostUserId === leaving.userId) {
			const nextHost = Array.from(room.participants.values()).find(
				(p) => p.role === "host",
			)
			room.hostUserId = nextHost?.userId ?? null
		}
		const list = Array.from(room.participants.values()).map((p) => ({
			id: p.userId,
			name: p.name,
			role: p.role,
		}))
		broadcast(jamId, { type: "participants", jamId, participants: list }, null)
		if (room.participants.size === 0) {
			rooms.delete(jamId)
		}
	})
})

server.listen(PORT, () => {
	console.log(`Jam WS server listening on ws://localhost:${PORT}`)
})
