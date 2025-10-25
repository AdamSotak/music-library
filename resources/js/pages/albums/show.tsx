import type { Album, InertiaPageProps, Track } from "@/types"
import { Modals } from "@/hooks/useModals"
import { usePlayer } from "@/hooks/usePlayer"
import { useImageColor } from "@/hooks/useImageColor"
import { WaveformIndicator } from "@/components/waveform-indicator"
import { Button } from "@/components/ui/button"
import PlayButton from "@/components/home/play-button"
import { AddToPlaylistDropdown } from "@/components/add-to-playlist-dropdown"
import { router, usePage } from "@inertiajs/react"
import { useMemo, useState, useEffect, type MouseEvent } from "react"
import { toPlayerQueue, toPlayerTrack } from "@/utils/player"

interface AlbumShowProps {
	album: Album
}

export default function AlbumShow({ album }: AlbumShowProps) {
	const { setOpen: setAddToPlaylistModalOpen } = Modals.useAddToPlaylistModal()
	const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = usePlayer()
	const { rgba } = useImageColor(album.cover)
	const playerQueue = useMemo(() => toPlayerQueue(album.tracks), [album.tracks])
	const { savedAlbums, playlists } = usePage()
		.props as unknown as InertiaPageProps
	const [isSaved, setIsSaved] = useState(false)
	const likedSongsPlaylist = playlists.find((p) => p.is_default)
	const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set())

	useEffect(() => {
		setIsSaved(savedAlbums.some((a) => a.id === album.id))
	}, [savedAlbums, album.id])

	useEffect(() => {
		if (likedSongsPlaylist) {
			const liked = new Set(likedSongsPlaylist.tracks.map((t) => t.id))
			setLikedTrackIds(liked)
		}
	}, [likedSongsPlaylist])

	const handleSaveAlbum = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation()
		router.post(
			`/library/albums/${album.id}`,
			{},
			{
				preserveScroll: true,
				onError: (errors) => {
					console.error("Failed to save/unsave album:", errors)
				},
			},
		)
	}

	const handleAddTrackToPlaylist = (
		trackId: string,
		event: MouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation()

		// If track is already in Liked Songs, open the modal
		if (likedTrackIds.has(trackId)) {
			setAddToPlaylistModalOpen(true, [trackId])
		} else {
			// First click: Add to Liked Songs
			if (likedSongsPlaylist) {
				router.post(
					`/playlist/${likedSongsPlaylist.id}/tracks`,
					{ track_ids: [trackId] },
					{
						preserveScroll: true,
					},
				)
			}
		}
	}

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	const handlePlayTrack = (
		track: Track,
		index: number,
		event: MouseEvent<HTMLElement>,
	) => {
		event.stopPropagation()
		const queueTrack = playerQueue[index] ?? toPlayerTrack(track)
		if (currentTrack?.id === queueTrack.id) {
			setIsPlaying(!isPlaying)
			return
		}
		setCurrentTrack(queueTrack, playerQueue, index)
	}

	const handleHeroPlay = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation()
		if (!playerQueue.length) return
		const firstTrack = playerQueue[0]
		if (currentTrack?.id === firstTrack.id) {
			setIsPlaying(!isPlaying)
			return
		}
		setCurrentTrack(firstTrack, playerQueue, 0)
	}

	const totalDuration = album.tracks.reduce(
		(total, track) => total + track.duration,
		0,
	)
	const hours = Math.floor(totalDuration / 3600)
	const minutes = Math.floor((totalDuration % 3600) / 60)

	return (
		<div
			className="min-h-screen bg-gradient-to-b via-black to-black text-white"
			style={{
				backgroundImage: `linear-gradient(to bottom, ${rgba(0.2)}, black 50%, black)`,
			}}
		>
			{/* Header */}
			<div
				className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 px-4 md:px-8 pt-16 md:pt-20 pb-6 bg-gradient-to-b to-transparent"
				style={{
					backgroundImage: `linear-gradient(to bottom, ${rgba(0.4)}, transparent)`,
				}}
			>
				<div className="w-40 h-40 md:w-60 md:h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
					<img
						src={album.cover}
						alt={album.name}
						className="w-full h-full object-cover"
					/>
				</div>
				<div className="flex flex-col justify-end pb-2 text-center md:text-left w-full md:w-auto">
					<p className="text-xs md:text-sm font-bold mb-1 md:mb-2">Album</p>
					<h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 md:mb-6 leading-tight md:leading-none">
						{album.name}
					</h1>
					<div className="flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm flex-wrap">
						<span
							className="font-bold hover:underline cursor-pointer"
							onClick={(e) => {
								e.stopPropagation()
								router.visit(`/artist/${album.artist_id}`)
							}}
						>
							{album.artist}
						</span>
						<span>•</span>
						<span>{album.year}</span>
						<span>•</span>
						<span>{album.tracks.length} songs,</span>
						<span className="text-zinc-400">
							{hours > 0 && `${hours} hr`} {minutes} min
						</span>
					</div>
				</div>
			</div>

			{/* Controls */}
			<div className="px-4 md:px-8 py-4 md:py-6 flex items-center gap-4 md:gap-6 bg-black/20">
				<PlayButton
					hoverable={false}
					onClick={handleHeroPlay}
					className={
						playerQueue[0] &&
						currentTrack?.id === playerQueue[0].id &&
						isPlaying
							? "bg-white"
							: undefined
					}
				/>
				<Button
					size="icon"
					variant="spotifyTransparent"
					className="group"
					onClick={handleSaveAlbum}
				>
					{isSaved ? (
						<svg
							className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300"
							aria-hidden="true"
							fill="#1ed760"
							stroke="none"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/>
						</svg>
					) : (
						<svg
							className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:stroke-white"
							aria-hidden="true"
							fill="none"
							stroke="gray"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/>
						</svg>
					)}
				</Button>
				<Button
					size="icon"
					variant="spotifyTransparent"
					className="group"
					onClick={() =>
						setAddToPlaylistModalOpen(
							true,
							album.tracks.map((track) => track.id),
						)
					}
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="gray"
						className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M11.999 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m-11 9c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11-11-4.925-11-11"></path>
						<path d="M17.999 12a1 1 0 0 1-1 1h-4v4a1 1 0 1 1-2 0v-4h-4a1 1 0 1 1 0-2h4V7a1 1 0 1 1 2 0v4h4a1 1 0 0 1 1 1"></path>
					</svg>
				</Button>
				<Button size="icon" variant="spotifyTransparent" className="group">
					<svg
						className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:fill-white"
						aria-hidden="true"
						fill="gray"
						viewBox="0 0 24 24"
					>
						<circle cx="5" cy="12" r="2" />
						<circle cx="12" cy="12" r="2" />
						<circle cx="19" cy="12" r="2" />
					</svg>
				</Button>
			</div>

			{/* Track List */}
			<div className="px-4 md:px-8 pb-32">
				{/* Header - Hidden on mobile */}
				<div className="hidden md:grid grid-cols-[16px_1fr_minmax(120px,1fr)] gap-4 px-4 h-9 border-b border-white/10 text-sm text-zinc-400 mb-2 items-center">
					<div className="text-center">#</div>
					<div>Title</div>
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
				{album.tracks.map((track, index) => {
					const isCurrentTrack =
						currentTrack?.id.toString() === track.id.toString()
					return (
						<div
							key={track.id}
							className={`
								flex flex-col md:grid md:grid-cols-[16px_1fr_minmax(120px,1fr)] 
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
								className="hidden md:group-hover:flex justify-center cursor-pointer"
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
								<div className="min-w-0 flex-1">
									<div
										className={`text-sm md:text-base truncate hover:underline cursor-pointer ${isCurrentTrack ? "text-green-500" : "text-white"}`}
										onClick={(e) => {
											e.stopPropagation()
											router.visit(`/tracks/${track.id}`)
										}}
									>
										{track.name}
									</div>
									<div
										className="text-xs md:text-sm text-zinc-400 hover:text-white hover:underline cursor-pointer truncate w-fit"
										onClick={(e) => {
											e.stopPropagation()
											router.visit(`/artist/${track.artist_id}`)
										}}
									>
										{track.artist}
									</div>
								</div>
								{/* Mobile duration */}
								<div className="md:hidden flex items-center gap-2 flex-shrink-0">
									<span className="text-zinc-400 text-xs">
										{formatDuration(track.duration)}
									</span>
									{likedTrackIds.has(track.id) ? (
										<AddToPlaylistDropdown trackId={track.id}>
											<Button
												size="icon"
												variant="spotifyTransparent"
												className="group h-8 w-8"
											>
												<svg
													className="w-4 h-4 transition-colors duration-300"
													fill="#1ed760"
													aria-hidden="true"
													viewBox="0 0 16 16"
												>
													<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z"></path>
												</svg>
											</Button>
										</AddToPlaylistDropdown>
									) : (
										<Button
											size="icon"
											variant="spotifyTransparent"
											className="group h-8 w-8"
											onClick={(e) => handleAddTrackToPlaylist(track.id, e)}
										>
											<svg
												className="w-4 h-4 transition-colors duration-300 group-hover:fill-white"
												fill="gray"
												aria-hidden="true"
												viewBox="0 0 16 16"
											>
												<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
											</svg>
										</Button>
									)}
								</div>
							</div>

							{/* Desktop actions */}
							<div className="hidden md:flex items-center justify-end gap-4">
								{likedTrackIds.has(track.id) ? (
									<AddToPlaylistDropdown trackId={track.id}>
										<Button
											size="icon"
											variant="spotifyTransparent"
											className="group"
										>
											<svg
												className="w-4 h-4 transition-colors duration-300"
												fill="#1ed760"
												aria-hidden="true"
												viewBox="0 0 16 16"
											>
												<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z"></path>
											</svg>
										</Button>
									</AddToPlaylistDropdown>
								) : (
									<Button
										size="icon"
										variant="spotifyTransparent"
										className="group"
										onClick={(e) => handleAddTrackToPlaylist(track.id, e)}
									>
										<svg
											className="w-4 h-4 transition-colors duration-300 group-hover:fill-white"
											fill="gray"
											aria-hidden="true"
											viewBox="0 0 16 16"
										>
											<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
										</svg>
									</Button>
								)}
								<span className="text-zinc-400 text-sm">
									{formatDuration(track.duration)}
								</span>
								<Button
									size="icon"
									variant="spotifyTransparent"
									className="group"
								>
									<svg
										className="w-4 h-4 transition-colors duration-300 group-hover:fill-white"
										fill="gray"
										aria-hidden="true"
										viewBox="0 0 24 24"
									>
										<circle cx="5" cy="12" r="2" />
										<circle cx="12" cy="12" r="2" />
										<circle cx="19" cy="12" r="2" />
									</svg>
								</Button>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
