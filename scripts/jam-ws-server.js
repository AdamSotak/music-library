// Minimal WebSocket Jam relay server
// Usage: npm install && node scripts/jam-ws-server.js
// Keeps an in-memory map of jam rooms with participants, queue, playback.

import { WebSocketServer } from "ws"

const PORT = process.env.JAM_WS_PORT ? Number(process.env.JAM_WS_PORT) : 3002

/**
 * @typedef {{
 *  jamId: string
 *  userId: string
 *  name: string
 *  role: 'host' | 'guest'
 * }} Participant
 */

const rooms = new Map() // jamId -> { participants: Map<socket, Participant>, queue: any[], playback: { index, offsetMs, isPlaying, trackId, updatedAt } }

const wss = new WebSocketServer({ port: PORT })

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
					ws.send(JSON.stringify({ type: "playback_state", jamId, playback: room.playback }))
				}
				break
			}
			case "queue_snapshot": {
				if (Array.isArray(msg.tracks) && typeof msg.index === "number") {
					room.queue = msg.tracks
					room.playback.index = msg.index
					broadcast(
						jamId,
						{ type: "queue_snapshot", jamId, tracks: room.queue, index: room.playback.index },
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
				// host authoritative; you may gate by role if needed
				if (typeof msg.index === "number") room.playback.index = msg.index
				if (typeof msg.offsetMs === "number") room.playback.offsetMs = msg.offsetMs
				if (typeof msg.isPlaying === "boolean") room.playback.isPlaying = msg.isPlaying
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
		broadcast(jamId, { type: "participants", jamId, participants: list })
		if (room.participants.size === 0) {
			rooms.delete(jamId)
		}
	})
})

console.log(`Jam WS server listening on ws://localhost:${PORT}`)
