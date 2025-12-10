import { Button } from "@/components/ui/button"
import { useJamSession } from "@/hooks/useJamSession"
import { usePlayer, type Track } from "@/hooks/usePlayer"
import { Copy, Users } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useUiLayout } from "@/hooks/useUiLayout"

type JamSidebarProps = {
	currentUserId: string | null
	currentUserName: string | null
}

export function JamSidebar({
	currentUserId,
	currentUserName,
}: JamSidebarProps) {
	const player = usePlayer()
	const [copied, setCopied] = useState(false)
	const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
	const [pendingJoinId, setPendingJoinId] = useState<string | null>(null)
	const lastTrackRef = useRef<Track | null>(null)
	const { isRightSidebarOpen, openRightSidebar } = useUiLayout()

	const {
		sessionId,
		isHost,
		participants,
		inviteLink,
		qrUrl,
		status,
		sharedQueue,
		startJam,
		endJam,
		addToJamQueue,
		sendPlaybackState,
		canControl,
		allowControls,
		setAllowControls,
		joinJam,
	} = useJamSession(currentUserId, currentUserName)

	const queue: Track[] = useMemo(
		() => (sessionId && sharedQueue.length ? sharedQueue : player.queue),
		[sessionId, sharedQueue, player.queue],
	)

	const nowPlaying: Track | null = player.currentTrack ?? queue[0] ?? null

	const upcoming = useMemo(
		() =>
			nowPlaying ? queue.filter((track) => track.id !== nowPlaying.id) : queue,
		[queue, nowPlaying],
	)

	const handleStartJam = async () => {
		const baseQueue =
			player.queue.length > 0 ? player.queue : nowPlaying ? [nowPlaying] : []

		if (!baseQueue.length) {
			alert("Play something first, then start a Jam.")
			return
		}

		await startJam({ tracks: baseQueue })
	}

	const handleAddCurrentToJam = () => {
		if (!sessionId || !nowPlaying) return
		addToJamQueue([nowPlaying])
	}

	const handlePlayFromHere = (trackId: string) => {
		if (sessionId && !canControl) return

		const index = queue.findIndex((track) => track.id === trackId)
		if (index < 0) return
		const track = queue[index]
		player.setCurrentTrack(track, queue, index)
		if (sessionId && canControl) {
			// Explicitly start from the beginning when jumping
			sendPlaybackState(track, index, true, { offsetMs: 0 })
		}
	}

	const handleCopyLink = async () => {
		if (!inviteLink) return
		await navigator.clipboard?.writeText(inviteLink)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	const handleAcceptInvite = async () => {
		if (!pendingJoinId) return
		try {
			await joinJam(pendingJoinId)
		} finally {
			setPendingJoinId(null)
			if (typeof window !== "undefined") {
				window.localStorage.removeItem("pendingJamId")
			}
		}
	}

	const handleDeclineInvite = () => {
		setPendingJoinId(null)
		if (typeof window !== "undefined") {
			window.localStorage.removeItem("pendingJamId")
		}
	}

	// Maintain a simple "Recently played" list based on player currentTrack.
	useEffect(() => {
		const current = player.currentTrack
		const previous = lastTrackRef.current

		if (current && previous && current.id !== previous.id) {
			setRecentlyPlayed((prev) => {
				const filtered = prev.filter((track) => track.id !== previous.id)
				return [previous, ...filtered].slice(0, 20)
			})
		}

		lastTrackRef.current = current ?? null
	}, [player.currentTrack])

	// When coming from an invite link, show a join prompt and open the sidebar.
	useEffect(() => {
		if (typeof window === "undefined") return
		const pending = window.localStorage.getItem("pendingJamId")
		if (pending && !sessionId) {
			setPendingJoinId(pending)
			openRightSidebar()
		}
	}, [sessionId, openRightSidebar])

	return (
		<aside
			className={`flex flex-col bg-[#121212] text-white border-l border-white/10 overflow-hidden transition-all duration-200 ${
				isRightSidebarOpen
					? "w-[340px] opacity-100"
					: "w-0 opacity-0 border-l-0"
			}`}
			aria-hidden={!isRightSidebarOpen}
		>
			{/* Pending invite banner */}
			{pendingJoinId && !sessionId && (
				<div className="px-4 py-3 border-b border-amber-500/40 bg-amber-500/10">
					<p className="text-xs text-amber-100 mb-1">
						You&apos;ve been invited to join a Jam.
					</p>
					<div className="flex items-center justify-between gap-2">
						<span className="text-[11px] font-mono text-amber-200 truncate">
							Jam ID {pendingJoinId}
						</span>
						<div className="flex items-center gap-2">
							<Button
								size="xs"
								className="bg-white text-black hover:bg-white/90"
								onClick={handleAcceptInvite}
							>
								Join
							</Button>
							<Button
								size="xs"
								variant="ghost"
								className="text-amber-200 hover:text-amber-100"
								onClick={handleDeclineInvite}
							>
								Dismiss
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Header / Jam controls */}
			<div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
				<div className="min-w-0">
					<p className="text-xs uppercase tracking-[0.18em] text-[#1db954]">
						Queue
					</p>
					<h2 className="text-lg font-semibold truncate">
						{sessionId ? "Jam queue" : "Next in queue"}
					</h2>
					<p className="text-[11px] text-zinc-400 truncate">
						{sessionId
							? status === "connected"
								? "Jam is live. Everyone hears this order."
								: "Connecting Jam..."
							: "Tracks that will play after the current song."}
					</p>
				</div>
				<div className="flex flex-col items-end gap-1">
					{sessionId ? (
						<Button
							size="sm"
							variant="outline"
							className="border-red-500/60 text-red-400"
							onClick={endJam}
						>
							End Jam
						</Button>
					) : (
						<Button size="sm" onClick={handleStartJam}>
							Start Jam
						</Button>
					)}
					{sessionId && inviteLink && (
						<Button
							size="xs"
							variant="ghost"
							className="text-[11px] text-zinc-300 px-2"
							onClick={handleCopyLink}
						>
							<Copy className="w-3 h-3 mr-1" />
							{copied ? "Copied" : "Copy link"}
						</Button>
					)}
				</div>
			</div>

			{/* Jam invite + participants (when active) */}
			{sessionId && (
				<div className="border-b border-white/10 px-4 py-3 space-y-3">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<input
								readOnly
								value={inviteLink ?? ""}
								className="bg-[#181818] border border-white/10 rounded px-3 py-1.5 text-[11px] text-white w-full"
							/>
							<Button
								size="xs"
								variant="ghost"
								className="text-[11px] text-zinc-300 px-2"
								onClick={handleCopyLink}
							>
								<Copy className="w-3 h-3 mr-1" />
								{copied ? "Copied" : "Copy"}
							</Button>
						</div>
						<label className="flex items-center gap-2 text-[11px] text-zinc-300">
							<input
								type="checkbox"
								checked={allowControls}
								onChange={(event) => setAllowControls(event.target.checked)}
							/>
							Allow others to control playback
						</label>
					</div>
					{qrUrl && (
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-xs text-zinc-400">
								<Users className="w-4 h-4" />
								<span>{participants.length} in Jam</span>
							</div>
							<div className="text-[10px] text-zinc-500 font-mono bg-white/5 px-2 py-0.5 rounded">
								Jam ID {sessionId.slice(0, 6)}
							</div>
							<div className="ml-auto rounded bg-white p-1">
								<img
									src={qrUrl}
									alt="Jam QR"
									className="w-20 h-20 rounded bg-white"
								/>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Now playing */}
			<div className="px-4 py-3 border-b border-white/10">
				<div className="text-xs font-semibold text-zinc-400 mb-2">
					Now playing
				</div>
				{nowPlaying ? (
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3 min-w-0">
							<div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-sm overflow-hidden">
								{nowPlaying.album_cover ? (
									<img
										src={nowPlaying.album_cover}
										alt={nowPlaying.name}
										className="w-10 h-10 object-cover"
									/>
								) : (
									<span className="text-xs text-zinc-300">Track</span>
								)}
							</div>
							<div className="min-w-0">
								<div className="text-sm font-medium truncate">
									{nowPlaying.name}
								</div>
								<div className="text-[11px] text-zinc-400 truncate">
									{nowPlaying.artist} • {nowPlaying.album ?? "Single"}
								</div>
							</div>
						</div>
						<div className="text-xs text-zinc-400 whitespace-nowrap">
							{Math.round(nowPlaying.duration / 60)}m
						</div>
					</div>
				) : (
					<div className="text-sm text-zinc-500">Nothing playing.</div>
				)}
			</div>

			{/* Upcoming queue + Recently played */}
			<div className="flex-1 overflow-y-auto">
				<div className="px-4 py-3">
					<div className="flex items-center justify-between mb-2">
						<div className="text-xs font-semibold text-zinc-400">
							Next in queue
						</div>
						{sessionId && (
							<Button
								size="xs"
								variant="ghost"
								className="text-[11px] text-zinc-300"
								onClick={handleAddCurrentToJam}
								disabled={!canControl || !nowPlaying}
							>
								Add current to Jam
							</Button>
						)}
					</div>

					{upcoming.length === 0 && (
						<div className="text-sm text-zinc-500">
							Queue is empty. Right-click a track and choose{" "}
							<span className="italic">Add to queue</span>
							{sessionId && (
								<>
									{" "}
									or <span className="italic">Add to Jam queue</span>.
								</>
							)}
						</div>
					)}

					{upcoming.map((track, index) => (
						<button
							type="button"
							key={track.id}
							onClick={() => handlePlayFromHere(track.id)}
							className="w-full text-left px-2 py-2 flex items-center justify-between hover:bg-white/5 rounded-md transition"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-5 text-[11px] text-zinc-400">{index + 1}</div>
								<div className="flex flex-col min-w-0">
									<div className="text-sm truncate">{track.name}</div>
									<div className="text-[11px] text-zinc-500 truncate">
										{track.artist} • {track.album ?? "Single"}
									</div>
								</div>
							</div>
							<div className="text-[11px] text-zinc-400">
								{Math.round(track.duration / 60)}m
							</div>
						</button>
					))}
				</div>

				<div className="px-4 pb-4 border-t border-white/10">
					<div className="text-xs font-semibold text-zinc-400 mt-3 mb-2">
						Recently played
					</div>
					{recentlyPlayed.length === 0 ? (
						<div className="text-sm text-zinc-500">
							Nothing played yet. Start listening to see history here.
						</div>
					) : (
						<div className="space-y-1">
							{recentlyPlayed.map((track) => (
								<div
									key={track.id}
									className="w-full text-left px-2 py-2 flex items-center justify-between hover:bg-white/5 rounded-md transition"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center overflow-hidden">
											{track.album_cover ? (
												<img
													src={track.album_cover}
													alt={track.name}
													className="w-8 h-8 object-cover"
												/>
											) : (
												<span className="text-[10px] text-zinc-300">Track</span>
											)}
										</div>
										<div className="flex flex-col min-w-0">
											<div className="text-sm truncate">{track.name}</div>
											<div className="text-[11px] text-zinc-500 truncate">
												{track.artist} • {track.album ?? "Single"}
											</div>
										</div>
									</div>
									<div className="text-[11px] text-zinc-400">
										{Math.round(track.duration / 60)}m
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</aside>
	)
}
