import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useJamSession } from "@/hooks/useJamSession"
import { getTrackCover, usePlayer, type Track } from "@/hooks/usePlayer"
import { useUiLayout } from "@/hooks/useUiLayout"
import { Copy, Play, Trash, Users, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

type RightSidebarProps = {
	currentUserId: string | null
	currentUserName: string | null
}

export function RightSidebar({
	currentUserId,
	currentUserName,
}: RightSidebarProps) {
	const player = usePlayer()
	const { isRightSidebarOpen, closeRightSidebar, openRightSidebar } =
		useUiLayout()
	const [activeTab, setActiveTab] = useState("queue")
	const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
	const lastTrackRef = useRef<Track | null>(null)
	const [copied, setCopied] = useState(false)
	const [pendingJoinId, setPendingJoinId] = useState<string | null>(null)

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
		allowControls,
		setAllowControls,
		canControl,
		joinJam,
		removeFromQueue: removeFromJamQueue,
	} = useJamSession(currentUserId, currentUserName)

	// Handler for removing a track from queue (local or Jam)
	const handleRemoveFromQueue = (trackId: string) => {
		if (sessionId) {
			removeFromJamQueue(trackId)
		} else {
			player.removeFromQueue(trackId)
		}
	}

	// Derived queue state: shared if jam active, else local
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

	// Check for pending join
	useEffect(() => {
		const checkPending = () => {
			if (typeof window === "undefined") return
			const pending = window.localStorage.getItem("pendingJamId")
			if (pending && !sessionId) {
				setPendingJoinId(pending)
				openRightSidebar()
			}
		}

		checkPending() // Check on mount/update

		window.addEventListener("pending-jam-invite", checkPending)
		return () => window.removeEventListener("pending-jam-invite", checkPending)
	}, [sessionId, openRightSidebar])

	// Maintain "Recently Played" locally
	useEffect(() => {
		const current = player.currentTrack
		const previous = lastTrackRef.current

		if (current && previous && current.id !== previous.id) {
			setRecentlyPlayed((prev) => {
				const filtered = prev.filter((track) => track.id !== previous.id)
				return [previous, ...filtered].slice(0, 50)
			})
		}
		lastTrackRef.current = current ?? null
	}, [player.currentTrack])

	const handleCopyLink = async () => {
		if (!inviteLink) return
		await navigator.clipboard?.writeText(inviteLink)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	const handleStartJam = async () => {
		const baseQueue =
			player.queue.length > 0 ? player.queue : nowPlaying ? [nowPlaying] : []

		if (!baseQueue.length) {
			alert("Play something first, then start a Jam.")
			return
		}
		await startJam({ tracks: baseQueue })
	}

	const handlePlayFromHere = (trackId: string) => {
		if (sessionId && !canControl) return
		const index = queue.findIndex((track) => track.id === trackId)
		if (index < 0) return
		const track = queue[index]
		player.setCurrentTrack(track, queue, index)
	}

	const handleAcceptInvite = async () => {
		if (!pendingJoinId) return

		if (!currentUserId) {
			if (
				confirm("You must be logged in to join a Jam Session. Go to login?")
			) {
				window.location.href = "/login"
			}
			return
		}

		try {
			const success = await joinJam(pendingJoinId)
			if (success) {
				setPendingJoinId(null)
				if (typeof window !== "undefined") {
					window.localStorage.removeItem("pendingJamId")
				}
			} else {
				alert("Failed to join Jam. It may have ended or is invalid.")
				// We don't clear pendingJoinId here so they can try again or manually dismiss
			}
		} catch (err) {
			console.error("Join error", err)
			alert("An error occurred while joining.")
		}
	}

	const handleDeclineInvite = () => {
		setPendingJoinId(null)
		if (typeof window !== "undefined") {
			window.localStorage.removeItem("pendingJamId")
		}
	}

	if (!isRightSidebarOpen) return null

	return (
		<aside className="w-[340px] bg-[#121212] flex flex-col h-full border-l border-white/5 shrink-0">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3">
				<div className="flex items-center gap-2">
					<span className="text-[10px] text-green-500 font-medium uppercase tracking-wider">
						{sessionId ? "Queue" : "Queue"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					{sessionId && (
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
							onClick={endJam}
						>
							End Jam
						</Button>
					)}
					<button
						onClick={closeRightSidebar}
						className="text-zinc-400 hover:text-white transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Jam Session Title */}
			<div className="px-4 pb-3">
				<h2 className="text-lg font-bold text-white">
					{sessionId ? "Jam queue" : "Next in queue"}
				</h2>
				<p className="text-[11px] text-zinc-400">
					{sessionId
						? status === "connected"
							? "Jam is live. Everyone hears this order."
							: "Connecting Jam..."
						: "Tracks that will play after the current song."}
				</p>
				{sessionId && typeof window !== "undefined" && (
					<p className="text-[10px] text-zinc-500">
						{window.localStorage.getItem("jamDebug") === "1"
							? `debug: status=${status} host=${isHost ? "1" : "0"} allow=${allowControls ? "1" : "0"} can=${canControl ? "1" : "0"}`
							: null}
					</p>
				)}
			</div>

			{/* Pending Invite Banner */}
			{pendingJoinId && !sessionId && (
				<div className="mx-4 mb-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
					<p className="text-xs text-indigo-200 mb-2">
						You've been invited to join Jam{" "}
						<span className="font-mono text-white">{pendingJoinId}</span>
					</p>
					<div className="flex gap-2">
						<Button
							size="sm"
							className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0"
							onClick={handleAcceptInvite}
						>
							Join Session
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs text-indigo-300 hover:text-white"
							onClick={handleDeclineInvite}
						>
							Decline
						</Button>
					</div>
				</div>
			)}

			{/* Jam Controls Panel - Spotify style */}
			{sessionId && (
				<div className="mx-4 mb-3 p-3 bg-[#1a1a1a] rounded-lg border border-white/5">
					<div className="flex items-start gap-3">
						{/* Left side - Invite info */}
						<div className="flex-1 min-w-0 space-y-2">
							<p className="text-[11px] text-zinc-400">
								Invite friends to your Jam
							</p>
							{/* Invite link input */}
							<div className="flex items-center gap-2">
								<input
									readOnly
									value={inviteLink ?? ""}
									className="bg-[#282828] border border-white/10 rounded px-2 py-1.5 text-[10px] text-zinc-300 flex-1 min-w-0 truncate"
								/>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 px-2 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10 shrink-0"
									onClick={handleCopyLink}
								>
									<Copy className="h-3 w-3 mr-1" />
									{copied ? "Copied" : "Copy"}
								</Button>
							</div>
							{/* Allow controls checkbox */}
							{isHost && (
								<label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-300">
									<input
										type="checkbox"
										checked={allowControls}
										onChange={(e) => setAllowControls(e.target.checked)}
										className="w-3.5 h-3.5 accent-green-500 rounded"
									/>
									<span>Allow others to control playback</span>
								</label>
							)}
							{/* Participants */}
							<div className="flex items-center gap-2 pt-1">
								<Users className="h-3.5 w-3.5 text-zinc-500" />
								<span className="text-[11px] text-zinc-400">
									{participants.length} in Jam
								</span>
							</div>
						</div>
						{/* Right side - QR Code (Spotify-sized) */}
						{qrUrl && (
							<div className="shrink-0">
								<div className="bg-white p-1 rounded">
									<img src={qrUrl} alt="Scan to join" className="w-16 h-16" />
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Tabs */}
			<Tabs
				defaultValue="queue"
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex-1 flex flex-col min-h-0"
			>
				<div className="px-4 border-b border-white/5">
					<TabsList className="w-full h-auto p-0 justify-start gap-6">
						<TabsTrigger
							value="queue"
							className="p-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-white text-zinc-400 text-sm font-medium hover:text-white transition-colors"
						>
							Queue
						</TabsTrigger>
						<TabsTrigger
							value="recent"
							className="p-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-white text-zinc-400 text-sm font-medium hover:text-white transition-colors"
						>
							Recently Played
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="queue" className="flex-1 min-h-0 mt-0">
					<ScrollArea className="h-full">
						<div className="p-4 space-y-4">
							{/* Now Playing */}
							{nowPlaying && (
								<section>
									<h3 className="text-xs font-semibold text-zinc-400 mb-2">
										Now playing
									</h3>
									<div className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-white/5 transition-colors">
										<div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-zinc-800">
											{nowPlaying.album_cover ? (
												<img
													src={nowPlaying.album_cover}
													alt=""
													className="h-full w-full object-cover"
													onError={(e) => {
														e.currentTarget.src = ""
														e.currentTarget.style.display = "none"
													}}
												/>
											) : (
												<div className="h-full w-full flex items-center justify-center">
													<Play className="h-4 w-4 text-zinc-600" />
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-medium text-green-400 truncate">
												{nowPlaying.name || "Unknown Track"}
											</div>
											<div className="text-xs text-zinc-400 truncate">
												{(typeof nowPlaying.artist === "object"
													? nowPlaying.artist.name
													: nowPlaying.artist) || "Unknown Artist"}
											</div>
										</div>
									</div>
								</section>
							)}

							{/* Next In Queue */}
							<section>
								<div className="flex items-center justify-between mb-2">
									<h3 className="text-xs font-semibold text-zinc-400">
										Next in queue
									</h3>
									{!sessionId && (
										<Button
											size="sm"
											variant="ghost"
											onClick={handleStartJam}
											className="h-6 px-2 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10"
										>
											Start Jam
										</Button>
									)}
								</div>

								<div className="space-y-0.5">
									{upcoming.length === 0 ? (
										<div className="py-6 text-center">
											<p className="text-sm text-zinc-500">Queue is empty</p>
											<p className="text-xs text-zinc-600 mt-1">
												Add tracks to get started
											</p>
										</div>
									) : (
										upcoming.map((track, i) => (
											<ContextMenu key={`${track?.id || i}-${i}`}>
												<ContextMenuTrigger>
													<div
														className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-white/5 transition-colors cursor-pointer"
														onClick={() =>
															track?.id && handlePlayFromHere(track.id)
														}
													>
														<div className="w-4 text-center text-xs text-zinc-500 group-hover:hidden shrink-0">
															{i + 1}
														</div>
														<button
															onClick={(e) => {
																e.stopPropagation()
																track?.id && handlePlayFromHere(track.id)
															}}
															className="w-4 hidden group-hover:flex items-center justify-center text-white shrink-0"
														>
															<Play className="h-3 w-3 fill-current" />
														</button>

														<div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-zinc-800">
															{getTrackCover(track) ? (
																<img
																	src={getTrackCover(track)}
																	alt=""
																	className="h-full w-full object-cover"
																	onError={(e) => {
																		e.currentTarget.src = ""
																		e.currentTarget.style.display = "none"
																	}}
																/>
															) : (
																<div className="h-full w-full flex items-center justify-center">
																	<Play className="h-4 w-4 text-zinc-600" />
																</div>
															)}
														</div>
														<div className="flex-1 min-w-0">
															<div className="text-sm text-white truncate group-hover:text-green-400 transition-colors">
																{track?.name || "Unknown Track"}
															</div>
															<div className="text-xs text-zinc-400 truncate">
																{/* Cast to any to handle mixed backend/frontend kinds */}
																{(typeof (track as any)?.artist === "object"
																	? (track as any).artist.name
																	: track?.artist) || "Unknown Artist"}
															</div>
														</div>
													</div>
												</ContextMenuTrigger>
												<ContextMenuContent className="w-48 bg-[#282828] border-white/5 text-white">
													<ContextMenuItem
														className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
														onClick={() =>
															track?.id && handleRemoveFromQueue(track.id)
														}
													>
														<Trash className="w-4 h-4 mr-2" />
														Remove from queue
													</ContextMenuItem>
												</ContextMenuContent>
											</ContextMenu>
										))
									)}
								</div>
							</section>
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="recent" className="flex-1 min-h-0 mt-0">
					<ScrollArea className="h-full">
						<div className="p-4">
							<h3 className="text-xs font-semibold text-zinc-400 mb-3">
								Recently Played
							</h3>
							<div className="space-y-0.5">
								{recentlyPlayed.length === 0 ? (
									<div className="py-6 text-center">
										<p className="text-sm text-zinc-500">
											No playback history yet
										</p>
										<p className="text-xs text-zinc-600 mt-1">
											Start playing to see your history
										</p>
									</div>
								) : (
									recentlyPlayed.map((track, i) => (
										<div
											key={`${track?.id || i}-${i}`}
											className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-white/5 transition-colors"
										>
											<div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-zinc-800">
												{getTrackCover(track) ? (
													<img
														src={getTrackCover(track)}
														alt=""
														className="h-full w-full object-cover"
														onError={(e) => {
															e.currentTarget.src = ""
															e.currentTarget.style.display = "none"
														}}
													/>
												) : (
													<div className="h-full w-full flex items-center justify-center">
														<Play className="h-4 w-4 text-zinc-600" />
													</div>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-sm text-white truncate">
													{track?.name || "Unknown Track"}
												</div>
												<div className="text-xs text-zinc-400 truncate">
													{(typeof (track as any)?.artist === "object"
														? (track as any).artist.name
														: track?.artist) || "Unknown Artist"}
												</div>
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</aside>
	)
}
