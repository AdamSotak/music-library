import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Modals } from "@/hooks/useModals"
import { useJamSession } from "@/hooks/useJamSession"
import { usePlayer } from "@/hooks/usePlayer"
import { Copy, Loader2, MoreHorizontal, WifiOff, X } from "lucide-react"

export function JamPanel({
	currentUserId,
	currentUserName,
}: {
	currentUserId: string | null
	currentUserName: string | null
}) {
	const { open, setOpen } = Modals.useJamModal()
	const [joinId, setJoinId] = useState("")
	const [copied, setCopied] = useState(false)
	const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null)

	const {
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
		startJam,
		endJam,
		joinJam,
	} = useJamSession(currentUserId, currentUserName)
	const player = usePlayer()

	const sharedQueueWithMeta = useMemo(
		() =>
			sharedQueue.map((track, idx) => ({
				...track,
				$position: idx + 1,
				$isCurrent: player.currentTrack?.id === track.id,
			})),
		[player.currentTrack?.id, sharedQueue],
	)

	useEffect(() => {
		if (typeof window === "undefined") return
		const pending = localStorage.getItem("pendingJamId")
		if (pending) {
			setOpen(true)
			setJoinId(pending)
			void joinJam(pending)
			localStorage.removeItem("pendingJamId")
		}
	}, [joinJam, setOpen])

	useEffect(() => {
		if (!sessionId || !isHost) return
		if (!player.queue.length) return
		const localIds = player.queue.map((t) => t.id).join("|")
		const sharedIds = sharedQueue.map((t) => t.id).join("|")
		if (localIds !== sharedIds) {
			syncQueue(player.queue)
		}
	}, [sessionId, isHost, player.queue, sharedQueue, syncQueue])

	useEffect(() => {
		if (!sessionId || !sharedQueue.length) return
		if (isHost) return
		const localIds = player.queue.map((t) => t.id).join("|")
		const sharedIds = sharedQueue.map((t) => t.id).join("|")
		if (localIds !== sharedIds) {
			player.setCurrentTrack(sharedQueue[0], sharedQueue, 0)
		}
	}, [sessionId, sharedQueue, isHost, player])

	const handleCopy = async () => {
		if (!inviteLink) return
		await navigator.clipboard?.writeText(inviteLink)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	const handleStartJam = async () => {
		if (!player.queue.length) {
			alert("Start playing some tracks before creating a Jam.")
			return
		}
		await startJam({ tracks: player.queue })
	}

	const handleJoinJam = async () => {
		if (!joinId) return
		await joinJam(joinId)
	}

	const handlePlayFromHere = (trackId: string) => {
		const idx = sharedQueue.findIndex((t) => t.id === trackId)
		if (idx >= 0) {
			player.setCurrentTrack(sharedQueue[idx], sharedQueue, idx)
			if (isHost) {
				syncQueue(sharedQueue)
			}
		}
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent
				side="right"
				className="bg-[#0b0b0b] text-white w-full max-w-sm p-6 shadow-2xl"
			>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-[0.3em] text-[#39d353]">
							Jam
						</p>
						<h2 className="text-2xl font-bold">Listen together, anywhere</h2>
					</div>
					<Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
						<X className="w-4 h-4" />
					</Button>
				</div>

				<div className="space-y-3 mt-5">
					<div className="flex gap-2">
						<Button
							onClick={handleStartJam}
							disabled={status === "connecting"}
							className="flex-1"
						>
							Start Jam
						</Button>
						<input
							type="text"
							placeholder="Paste Jam ID"
							value={joinId}
							onChange={(event) => setJoinId(event.target.value)}
							className="bg-[#1d1d1d] border border-white/10 rounded px-3 py-2 text-sm flex-1"
						/>
						<Button
							variant="outline"
							onClick={handleJoinJam}
							disabled={!joinId}
						>
							Join
						</Button>
					</div>

					<div className="text-sm text-zinc-400">
						{status === "connecting" && (
							<span className="flex items-center gap-2">
								<Loader2 className="w-4 h-4 animate-spin" /> Connecting...
							</span>
						)}
						{status === "connected" && <span>Connected</span>}
						{status === "error" && (
							<span className="flex items-center gap-2 text-red-400">
								<WifiOff className="w-4 h-4" /> WebSocket unavailable, falling
								back
							</span>
						)}
					</div>
				</div>

				<div className="mt-6 space-y-4">
					<div className="rounded-2xl bg-[#1c1c1c] border border-white/10 p-4 space-y-3">
						<div>
							<h4 className="text-lg font-semibold mb-2">Invite</h4>
							<div className="flex items-center gap-2">
								<input
									readOnly
									value={inviteLink ?? ""}
									className="bg-[#111111] border border-white/10 rounded px-3 py-2 text-xs text-white w-full"
								/>
								<Button
									size="sm"
									variant="ghost"
									onClick={handleCopy}
									className="text-white gap-2"
								>
									<Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
								</Button>
							</div>
							<label className="flex items-center gap-2 text-sm text-zinc-300 mt-3">
								<input
									type="checkbox"
									checked={allowControls}
									onChange={(evt) => setAllowControls(evt.target.checked)}
								/>
								Allow others to control playback
							</label>
						</div>
						{qrUrl && (
							<div className="flex flex-col items-center gap-2 bg-[#111] border border-white/10 rounded-xl p-3">
								<img
									src={qrUrl}
									alt="Jam QR"
									className="w-36 h-36 rounded bg-white"
								/>
								<div className="text-xs text-zinc-400">Scan to join</div>
							</div>
						)}
					</div>

					<div className="rounded-2xl bg-[#1c1c1c] border border-white/10 p-4">
						<div className="flex items-center justify-between mb-3">
							<h4 className="text-lg font-semibold">Participants</h4>
							<span className="text-xs text-zinc-400">
								{participants.length}
							</span>
						</div>
						<div className="space-y-2">
							{participants.length === 0 && (
								<div className="text-xs text-zinc-500">
									No one yet. Start a Jam or join one.
								</div>
							)}
							{participants.map((participant) => (
								<div
									key={participant.id}
									className="flex items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-sm"
								>
									<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center uppercase text-xs font-semibold">
										{participant.name.slice(0, 2)}
									</div>
									<div>
										<div className="text-white">{participant.name}</div>
										<div className="text-[11px] text-zinc-400">
											{participant.role}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{sessionId && (
						<div className="space-y-3">
							<div className="rounded-2xl bg-[#1c1c1c] border border-white/10 p-4 text-xs text-zinc-400">
								<div className="font-semibold text-white mb-1">Jam ID</div>
								<div className="font-mono break-all">{sessionId}</div>
								{sharedQueue.length > 0 && (
									<div className="mt-3 text-[11px] text-zinc-400">
										Queue synced from current playlist ({sharedQueue.length}{" "}
										tracks).
									</div>
								)}
							</div>

							<div className="rounded-2xl bg-[#1c1c1c] border border-white/10">
								<div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
									<div>
										<div className="text-sm font-semibold text-white">
											Shared Queue
										</div>
										<div className="text-xs text-zinc-400">
											Lightweight view, distinct from playlists.
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-red-400"
										onClick={endJam}
									>
										End Jam
									</Button>
								</div>
								<div className="max-h-64 overflow-y-auto divide-y divide-white/5">
									{sharedQueueWithMeta.length === 0 && (
										<div className="px-4 py-6 text-sm text-zinc-400">
											Queue is empty. Start playing to fill it.
										</div>
									)}
									{sharedQueueWithMeta.map((track) => (
										<div
											key={`${track.id}-${track.$position}`}
											onMouseEnter={() => setHoveredTrackId(track.id)}
											onMouseLeave={() => setHoveredTrackId(null)}
											className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
										>
											<div className="flex items-center gap-3 min-w-0">
												<div className="w-6 text-xs text-zinc-400">
													{track.$isCurrent ? "●" : track.$position}
												</div>
												<div className="flex flex-col min-w-0">
													<div className="font-medium text-sm truncate">
														{track.name}
													</div>
													<div className="text-[11px] text-zinc-500 truncate">
														{track.artist} • {track.album ?? "Single"}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-3 text-xs text-zinc-400">
												<span>{Math.round(track.duration / 60)}m</span>
												{hoveredTrackId === track.id && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-white hover:bg-white/10"
														onClick={() => handlePlayFromHere(track.id)}
													>
														<MoreHorizontal className="w-4 h-4" />
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
