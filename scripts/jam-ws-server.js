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

const rooms = new Map() // jamId -> { participants: Map<socket, Participant>, queue: any[], playback: { index, offsetMs, isPlaying, trackId, updatedAt }, hostUserId?: string }

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
					// We use the existing broadcast logic.
					// Note: 'broadcast' function sends to ALL except 'except'.
					// Passing null for 'except' means send to everyone.

					// Special handling: if backend sends queue/playback updates, we might want to 
					// update our in-memory cache so subsequent joins get correct state.
					if (payload.type === "queue_snapshot" || payload.type === "queue" || payload.type === "queue_add") {
						if (payload.tracks || payload.queue) room.queue = payload.tracks || payload.queue
						if (payload.items) room.queue = room.queue.concat(payload.items.map(i => i.track || i))
					}
					if (payload.type === "playback_state") {
						if (typeof payload.index === "number") room.playback.index = payload.index
						if (typeof payload.offsetMs === "number") room.playback.offsetMs = payload.offsetMs
						if (typeof payload.isPlaying === "boolean") room.playback.isPlaying = payload.isPlaying
						if (typeof payload.trackId === "string") room.playback.trackId = payload.trackId
						room.playback.updatedAt = Date.now()
					}

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
				if (!room.hostUserId && participant.role === "host") {
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
					ws.send(JSON.stringify({ type: "participants", jamId, participants: list }))
					ws.send(
						JSON.stringify({
							type: "queue_snapshot",
							jamId,
							tracks: room.queue,
							index: room.playback.index,
						}),
					)
					ws.send(
						JSON.stringify({
							type: "playback_state",
							jamId,
							index: room.playback.index,
							offsetMs: room.playback.offsetMs ?? 0,
							isPlaying: room.playback.isPlaying ?? false,
							trackId: room.playback.trackId,
							ts: room.playback.updatedAt ?? Date.now(),
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
				if (typeof msg.index === "number") room.playback.index = msg.index
				if (typeof msg.offsetMs === "number") room.playback.offsetMs = msg.offsetMs
				if (typeof msg.isPlaying === "boolean")
					room.playback.isPlaying = msg.isPlaying
				if (typeof msg.trackId === "string") room.playback.trackId = msg.trackId
				room.playback.updatedAt = Date.now()
				broadcast(jamId, msg, ws)
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
		room.participants.delete(ws)
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
