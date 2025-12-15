// Minimal WebSocket Jam relay server
// - Clients connect and "announce" to join a jam room (participants list only).
// - Laravel broadcasts canonical Jam events via POST /broadcast and we fan them out.
//
// Usage: node scripts/jam-ws-server.js

import { WebSocketServer } from "ws"
import { createServer } from "http"

const PORT = process.env.JAM_WS_PORT ? Number(process.env.JAM_WS_PORT) : 3002

/**
 * @typedef {{
 *  userId: string
 *  name: string
 *  role: 'host' | 'guest'
 * }} Participant
 */

/** @type {Map<string, { participants: Map<any, Participant> }>} */
const rooms = new Map() // jamId -> { participants: Map<socket, Participant> }

const upsertRoom = (jamId) => {
	if (!rooms.has(jamId)) {
		rooms.set(jamId, { participants: new Map() })
	}
	return rooms.get(jamId)
}

const broadcast = (jamId, data, except) => {
	const room = rooms.get(jamId)
	if (!room) return
	for (const [socket] of room.participants) {
		if (socket !== except && socket.readyState === socket.OPEN) {
			socket.send(JSON.stringify(data))
		}
	}
}

const broadcastParticipants = (jamId) => {
	const room = rooms.get(jamId)
	if (!room) return
	const list = Array.from(room.participants.values()).map((p) => ({
		id: p.userId,
		name: p.name,
		role: p.role,
	}))
	broadcast(jamId, { type: "participants", jamId, participants: list }, null)
}

// Create raw HTTP server to handle both WS upgrades and internal broadcast API
const server = createServer((req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*")
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
	res.setHeader("Access-Control-Allow-Headers", "Content-Type")

	if (req.method === "OPTIONS") {
		res.writeHead(204)
		res.end()
		return
	}

	// Internal endpoint used by Laravel (JamService::broadcast) to fan out events.
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

				// Fan out only if there are connected clients.
				broadcast(jamId, payload, null)

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

	res.writeHead(404)
	res.end()
})

const wss = new WebSocketServer({ server })

wss.on("connection", (ws) => {
	let jamId = null

	ws.on("message", (raw) => {
		let msg
		try {
			msg = JSON.parse(raw.toString())
		} catch {
			return
		}

		if (!msg?.type || !msg?.jamId) return

		if (msg.type !== "announce") {
			// All state mutation happens via Laravel + /broadcast.
			return
		}

		jamId = msg.jamId
		const room = upsertRoom(jamId)
		const participant = {
			userId: msg.userId ?? crypto.randomUUID(),
			name: msg.name ?? "Guest",
			role: msg.role === "host" ? "host" : "guest",
		}

		room.participants.set(ws, participant)
		// Immediately publish the updated participants list
		broadcastParticipants(jamId)
	})

	ws.on("close", () => {
		if (!jamId) return
		const room = rooms.get(jamId)
		if (!room) return
		room.participants.delete(ws)
		broadcastParticipants(jamId)
		if (room.participants.size === 0) {
			rooms.delete(jamId)
		}
	})
})

server.listen(PORT, () => {
	console.log(`Jam WS server listening on ws://localhost:${PORT}`)
})

