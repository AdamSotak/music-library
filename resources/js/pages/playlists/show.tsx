import type { Playlist } from "@/types"
import { router } from "@inertiajs/react"
import { usePlayer } from "@/hooks/usePlayer"
import { useImageColor } from "@/hooks/useImageColor"
import { Modals } from "@/hooks/useModals"
import { useState, useEffect } from "react"
import axios from "axios"
import { WaveformIndicator } from "@/components/waveform-indicator"
import { Button } from "@/components/ui/button"
import PlayButton from "@/components/home/play-button"
import { Music } from "lucide-react"

interface PlaylistShowProps {
	playlist: Playlist
}

interface SearchTrack {
	id: number
	name: string
	artist: string
	artist_id: string
	album?: string
	album_cover?: string
	duration: number
}

export default function PlaylistShow({ playlist }: PlaylistShowProps) {
	const { currentTrack, isPlaying, setCurrentTrack } = usePlayer()
	const { setOpen: setConfirmModalOpen } = Modals.useConfirmationModal()
	const { rgba } = useImageColor(
		playlist.is_default
			? "/images/liked-songs.jpg"
			: playlist.tracks[0]?.album_cover,
	)
	const [isSearchMode, setIsSearchMode] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<SearchTrack[]>([])
	const [isSearching, setIsSearching] = useState(false)

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	const handlePlayTrack = (track: any, index: number, e: React.MouseEvent) => {
		e.stopPropagation()
		setCurrentTrack(track, playlist.tracks as any[], index)
	}

	const handleRemoveTrack = (
		trackId: number | string,
		trackName: string,
		e: React.MouseEvent,
	) => {
		e.stopPropagation()
		setConfirmModalOpen(
			true,
			"Remove from playlist",
			`Remove "${trackName}" from this playlist?`,
			"Remove",
			() => {
				router.delete(`/playlist/${playlist.id}/tracks/${trackId}`, {
					preserveScroll: true,
				})
			},
		)
	}

	// Search for tracks
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([])
			return
		}

		const timer = setTimeout(async () => {
			setIsSearching(true)
			try {
				const response = await axios.get(
					`/api/search/tracks?q=${encodeURIComponent(searchQuery)}`,
				)
				setSearchResults(response.data.tracks || [])
			} catch (error) {
				console.error("Search failed:", error)
				setSearchResults([])
			} finally {
				setIsSearching(false)
			}
		}, 300)

		return () => clearTimeout(timer)
	}, [searchQuery])

	const handleAddTrack = (trackId: number) => {
		router.post(
			`/playlist/${playlist.id}/tracks`,
			{
				track_ids: [trackId],
			},
			{
				preserveScroll: true,
				preserveState: false,
				onSuccess: () => {
					// Track added successfully - page will auto-refresh
				},
			},
		)
	}

	const totalDuration = playlist.tracks.reduce(
		(sum, track) => sum + track.duration,
		0,
	)
	const hours = Math.floor(totalDuration / 3600)
	const minutes = Math.floor((totalDuration % 3600) / 60)

	return (
		<div className="min-h-screen text-white">
			{/* Header */}
			<div
				className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 px-4 md:px-8 pt-16 md:pt-20 pb-6 bg-gradient-to-b to-150%"
				style={{
					backgroundImage: `linear-gradient(to bottom, ${rgba(0.7)}, ${rgba(0.4)})`,
				}}
			>
				<div className="w-40 h-40 md:w-60 md:h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
					{playlist.is_default ? (
						<img
							src="/images/liked-songs.jpg"
							alt="Liked Songs"
							className="w-full h-full object-cover"
						/>
					) : (
						// biome-ignore lint/complexity/noUselessFragments: wrong linting
						<>
							{playlist.tracks[0]?.album_cover ? (
								<img
									src={playlist.tracks[0].album_cover}
									alt={playlist.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-white">
									<Music className="w-20 h-20" />
								</div>
							)}
						</>
					)}
				</div>
				<div className="flex flex-col justify-end pb-2 text-center md:text-left w-full md:w-auto">
					<p className="text-xs md:text-sm font-bold mb-1 md:mb-2">
						Public Playlist
					</p>
					<h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black mb-3 md:mb-6 leading-tight md:leading-none">
						{playlist.name}
					</h1>
					<p className="text-zinc-300 text-xs md:text-sm mb-2">
						{playlist.description}
					</p>
					<div className="flex items-center justify-center md:justify-start gap-1 text-xs md:text-sm mt-2">
						<span className="font-bold">Spotify</span>
						<span>•</span>
						<span>
							{playlist.tracks.length}{" "}
							{playlist.tracks.length === 1 ? "song" : "songs"},
						</span>
						<span className="text-zinc-400">
							{hours > 0 && `${hours} hr`} {minutes} min
						</span>
					</div>
				</div>
			</div>

			{/* Controls */}
			<div
				className="px-4 md:px-8 py-4 md:py-6 flex items-center gap-4 md:gap-6 bg-gradient-to-b to-transparent"
				style={{
					backgroundImage: `linear-gradient(to bottom, ${rgba(0.4)}, transparent)`,
				}}
			>
				<PlayButton hoverable={false} />
				<Button size="icon" variant="spotifyTransparent" className="group">
					<svg
						className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:stroke-white"
						fill="none"
						stroke="gray"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
						/>
					</svg>
				</Button>
				<Button size="icon" variant="spotifyTransparent" className="group">
					<svg
						className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:fill-white"
						fill="gray"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle cx="5" cy="12" r="2" />
						<circle cx="12" cy="12" r="2" />
						<circle cx="19" cy="12" r="2" />
					</svg>
				</Button>
			</div>

			{/* Track List or Search */}
			<div className="px-4 md:px-8 pb-32">
				{!isSearchMode ? (
					<>
						{/* Header - Hidden on mobile */}
						<div className="hidden md:grid grid-cols-[16px_6fr_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 h-9 border-b border-white/10 text-sm text-zinc-400 mb-2 items-center">
							<div className="text-center">#</div>
							<div>Title</div>
							<div>Album</div>
							<div>Date added</div>
							<div className="flex justify-end">
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 16 16"
									aria-hidden="true"
								>
									<path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.508 6.508 0 0 0 8 1.5zM8 13A5 5 0 1 1 13 8 5.006 5.006 0 0 1 8 13z" />
									<path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4A.75.75 0 0 1 8 3.25z" />
								</svg>
							</div>
						</div>

						{/* Tracks */}
						{playlist.tracks.map((track, index) => {
							const isCurrentTrack =
								currentTrack?.id.toString() === track.id.toString()
							return (
								<div
									key={track.id}
									className={`
										flex flex-col md:grid md:grid-cols-[16px_6fr_4fr_3fr_minmax(120px,1fr)] 
                                        md:items-center
										gap-2 md:gap-4 md:px-4 py-2 md:py-0 md:h-14 
										rounded-md group cursor-pointer
										${isCurrentTrack ? "bg-white/10" : "hover:bg-white/10"}
									`}
									onClick={(e) => handlePlayTrack(track, index, e)}
								>
									{/* Desktop track number / play button */}
									<div className="hidden md:flex text-center text-sm group-hover:hidden justify-center">
										{isCurrentTrack && isPlaying ? (
											<WaveformIndicator />
										) : (
											<span
												className={
													isCurrentTrack ? "text-green-500" : "text-zinc-400"
												}
											>
												{index + 1}
											</span>
										)}
									</div>
									<button
										onClick={(e) => handlePlayTrack(track, index, e)}
										className="hidden md:group-hover:flex justify-center"
										type="button"
									>
										<svg
											className="w-4 h-4 text-white"
											fill="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path d="M8 5v14l11-7z" />
										</svg>
									</button>

									{/* Track info - responsive layout */}
									<div className="flex items-center gap-3 md:min-w-0">
										{/* Mobile track number */}
										<div className="md:hidden text-center text-xs w-6 flex-shrink-0">
											{isCurrentTrack && isPlaying ? (
												<WaveformIndicator />
											) : (
												<span
													className={
														isCurrentTrack ? "text-green-500" : "text-zinc-400"
													}
												>
													{index + 1}
												</span>
											)}
										</div>
										<img
											src={
												track.album_cover ||
												`https://via.placeholder.com/40?text=${encodeURIComponent(track.album || "Track")}`
											}
											alt={track.album || track.name}
											className="w-10 h-10 md:w-10 md:h-10 flex-shrink-0 rounded"
										/>
										<div className="min-w-0 flex-1">
											<div
												className={`text-sm md:text-base truncate ${isCurrentTrack ? "text-green-500" : "text-white"}`}
											>
												{track.name}
											</div>
											<div
												className="text-xs md:text-sm text-zinc-400 hover:text-white hover:underline cursor-pointer truncate"
												onClick={(e) => {
													e.stopPropagation()
													router.visit(`/artist/${track.artist_id}`)
												}}
											>
												{track.artist}
											</div>
										</div>
										{/* Mobile duration and remove button */}
										<div className="md:hidden flex items-center gap-2 flex-shrink-0">
											<span className="text-zinc-400 text-xs">
												{formatDuration(track.duration)}
											</span>
											<Button
												size="icon"
												variant="spotifyTransparent"
												className="group h-8 w-8"
												onClick={(e) =>
													handleRemoveTrack(track.id, track.name, e)
												}
											>
												<svg
													className="min-w-4 min-h-4 transition-colors duration-300 group-hover:stroke-white"
													fill="none"
													stroke="gray"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</Button>
										</div>
									</div>

									{/* Desktop-only columns */}
									<div
										className="hidden md:block text-zinc-400 text-sm hover:text-white hover:underline cursor-pointer truncate"
										onClick={(e) => {
											e.stopPropagation()
											if (track.album_id) {
												router.visit(`/albums/${track.album_id}`)
											}
										}}
									>
										{track.album}
									</div>
									<div className="hidden md:block text-zinc-400 text-sm">
										12 hours ago
									</div>
									<div className="hidden md:flex items-center justify-end gap-4">
										<Button
											size="icon"
											variant="spotifyTransparent"
											className="group"
										>
											<svg
												className="min-w-4 min-h-4 transition-colors duration-300 group-hover:stroke-white"
												fill="none"
												stroke="gray"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
												/>
											</svg>
										</Button>
										<span className="text-zinc-400 text-sm">
											{formatDuration(track.duration)}
										</span>
										<Button
											size="icon"
											variant="spotifyTransparent"
											className="group"
											onClick={(e) =>
												handleRemoveTrack(track.id, track.name, e)
											}
										>
											<svg
												className="min-w-4 min-h-4 transition-colors duration-300 group-hover:stroke-white"
												fill="none"
												stroke="gray"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
										</Button>
									</div>
								</div>
							)
						})}

						{/* Add Songs Button */}
						<div className="mt-6 md:mt-8">
							<button
								onClick={() => setIsSearchMode(true)}
								className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 md:py-4 w-full rounded-md hover:bg-white/5 transition-colors text-zinc-400 hover:text-white group cursor-pointer"
								type="button"
							>
								<div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 rounded flex items-center justify-center group-hover:bg-zinc-700 transition-colors flex-shrink-0">
									<svg
										className="w-5 h-5 md:w-6 md:h-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4v16m8-8H4"
										/>
									</svg>
								</div>
								<div className="text-left">
									<div className="text-white font-medium text-sm md:text-base">
										Add songs
									</div>
									<div className="text-xs md:text-sm">
										Search for songs to add to this playlist
									</div>
								</div>
							</button>
						</div>
					</>
				) : (
					/* Search Mode */
					<div className="py-4">
						<div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
							<h2 className="text-lg md:text-2xl font-bold">
								Let's find something for your playlist
							</h2>
							<button
								onClick={() => {
									setIsSearchMode(false)
									setSearchQuery("")
									setSearchResults([])
								}}
								className="text-zinc-400 hover:text-white flex-shrink-0"
								type="button"
							>
								<svg
									className="w-6 h-6 md:w-8 md:h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Search Input */}
						<div className="relative mb-4 md:mb-6 md:max-w-md">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search for songs or episodes"
								className="w-full bg-zinc-800 text-white px-3 md:px-4 py-2.5 md:py-3 pr-10 rounded text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/20"
							/>
							{searchQuery && (
								<button
									onClick={() => setSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
									type="button"
								>
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							)}
						</div>

						{/* Search Results */}
						{isSearching ? (
							<div className="text-center py-8 text-zinc-400 text-sm md:text-base">
								Searching...
							</div>
						) : searchResults.length > 0 ? (
							<div className="space-y-1">
								{searchResults.map((track) => (
									<div
										key={track.id}
										className="flex items-center gap-2 md:gap-3 p-2 rounded hover:bg-white/5 group"
									>
										<img
											src={
												track.album_cover ||
												`https://placehold.co/48x48/333/white?text=${encodeURIComponent(track.album || "T")}`
											}
											alt={track.name}
											className="w-10 h-10 md:w-12 md:h-12 rounded flex-shrink-0"
										/>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-white text-sm md:text-base truncate">
												{track.name}
											</div>
											<div
												className="text-xs md:text-sm text-zinc-400 truncate"
												onClick={(e) => {
													e.stopPropagation()
													router.visit(`/artist/${track.artist_id}`)
												}}
											>
												{track.artist}
											</div>
										</div>
										<div className="hidden sm:block text-sm text-zinc-400 mr-2">
											{formatDuration(track.duration)}
										</div>
										<button
											onClick={() => handleAddTrack(track.id)}
											className="bg-transparent border border-zinc-600 hover:border-white hover:bg-white hover:text-black text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0 cursor-pointer"
											type="button"
										>
											Add
										</button>
									</div>
								))}
							</div>
						) : searchQuery ? (
							<div className="text-center py-8 text-zinc-400 text-sm md:text-base">
								No results found
							</div>
						) : (
							<div className="text-center py-8 text-zinc-400 text-sm md:text-base">
								Search for songs to add to this playlist
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
