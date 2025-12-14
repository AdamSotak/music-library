import PlayButton from "@/components/home/play-button"
import { Button } from "@/components/ui/button"
import { useImageColor } from "@/hooks/useImageColor"
import { usePlayer } from "@/hooks/usePlayer"
import { toPlayerTrack } from "@/utils/player"
import type { Track, InertiaPageProps } from "@/types"
import { router, usePage } from "@inertiajs/react"
import { useMemo, useState, useEffect, type MouseEvent } from "react"
import { AddToPlaylistDropdown } from "@/components/add-to-playlist-dropdown"
import MusicBarcode from "@/components/musicbars"

interface TrackShowProps {
	track: Track
}

export default function TrackShow({ track }: TrackShowProps) {
	const { rgba } = useImageColor(track.album_cover)
	const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = usePlayer()
	const playerTrack = useMemo(() => toPlayerTrack(track), [track])
	const isCurrentTrack = currentTrack?.id === playerTrack.id
	const { playlists } = usePage().props as unknown as InertiaPageProps
	const likedSongsPlaylist = playlists.find((p) => p.is_default)
	const [isInLikedSongs, setIsInLikedSongs] = useState(false)

	useEffect(() => {
		if (likedSongsPlaylist) {
			setIsInLikedSongs(
				likedSongsPlaylist.tracks.some((t) => t.id === track.id),
			)
		}
	}, [likedSongsPlaylist, track.id])

	const handlePlay = (event?: MouseEvent<HTMLButtonElement>) => {
		event?.stopPropagation()
		if (isCurrentTrack) {
			setIsPlaying(!isPlaying)
			return
		}
		setCurrentTrack(playerTrack, [playerTrack], 0)
	}

	const handleAddToLikedSongs = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation()
		if (likedSongsPlaylist) {
			router.post(
				`/playlist/${likedSongsPlaylist.id}/tracks`,
				{ track_ids: [track.id] },
				{
					preserveScroll: true,
				},
			)
		}
	}

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	return (
		<div className="min-h-screen text-white">
			{/* Header */}
			<div
				className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 px-4 md:px-8 pt-16 md:pt-20 pb-6 bg-gradient-to-b from-orange-900/70 to-150% to-orange-900/40"
				style={{
					backgroundImage: `linear-gradient(to bottom, ${rgba(0.4)}, 150%, ${rgba(0.2)})`,
				}}
			>
				<div className="w-40 h-40 md:w-60 md:h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
					{track.album ? (
						<img
							src={track.album_cover}
							alt={track.name}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center text-zinc-600">
							<svg
								className="w-16 h-16 md:w-24 md:h-24"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
							</svg>
						</div>
					)}
				</div>
				<div className="flex flex-col justify-end pb-2 text-center md:text-left w-full md:w-auto">
					<p className="text-xs md:text-sm font-bold mb-1 md:mb-2">Song</p>
					<h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 md:mb-6 leading-tight md:leading-none">
						{track.name}
					</h1>
					<div className="flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm flex-wrap">
						<span
							className="font-bold hover:underline cursor-pointer"
							onClick={() => {
								router.visit(`/artist/${track.artist_id}`)
							}}
						>
							{track.artist}
						</span>
						{track.album && (
							<>
								<span>•</span>
								<span>{track.album}</span>
							</>
						)}
						<span>•</span>
						<span className="text-zinc-400">
							{formatDuration(track.duration)}
						</span>
					</div>
				</div>
			</div>

			{/* Controls */}
			<div
				className="px-4 md:px-8 py-4 md:py-6 flex items-center gap-4 md:gap-6  bg-gradient-to-b from-orange-900/40 to-transparent"
				style={{
					backgroundImage: `linear-gradient(to bottom, ${rgba(0.3)}, transparent)`,
				}}
			>
				<PlayButton
					hoverable={false}
					onClick={handlePlay}
					className={isCurrentTrack && isPlaying ? "bg-white" : undefined}
				/>
				{isInLikedSongs ? (
					<AddToPlaylistDropdown trackId={track.id}>
						<Button size="icon" variant="spotifyTransparent" className="group">
							<svg
								className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300"
								fill="#1ed760"
								viewBox="0 0 16 16"
							>
								<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z" />
							</svg>
						</Button>
					</AddToPlaylistDropdown>
				) : (
					<Button
						size="icon"
						variant="spotifyTransparent"
						className="group"
						onClick={handleAddToLikedSongs}
					>
						<svg
							className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:fill-white"
							fill="gray"
							viewBox="0 0 16 16"
						>
							<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75" />
						</svg>
					</Button>
				)}
				<AddToPlaylistDropdown trackId={track.id} includeShared>
					<Button size="icon" variant="spotifyTransparent" className="group">
						<svg
							className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:fill-white"
							fill="gray"
							viewBox="0 0 24 24"
						>
							<circle cx="5" cy="12" r="2" />
							<circle cx="12" cy="12" r="2" />
							<circle cx="19" cy="12" r="2" />
						</svg>
					</Button>
				</AddToPlaylistDropdown>

				{/* Music Barcode Button */}
				<MusicBarcode trackId={track.id} trackName={track.name} />

				<Button size="icon" variant="spotifyTransparent" className="group">
					<svg
						className="min-w-7 min-h-7 md:min-w-8 md:min-h-8 transition-colors duration-300 group-hover:fill-white"
						fill="gray"
						viewBox="0 0 24 24"
					>
						<circle cx="5" cy="12" r="2" />
						<circle cx="12" cy="12" r="2" />
						<circle cx="19" cy="12" r="2" />
					</svg>
				</Button>
			</div>

			{/* Lyrics Section */}
			<div className="px-4 md:px-8 pb-32">
				<div className="mt-6 md:mt-8 max-w-4xl">
					<h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Lyrics</h2>
					<div className="text-zinc-400 text-base md:text-lg leading-relaxed space-y-4">
						<p>Lyrics not available for this track</p>
					</div>
				</div>
			</div>
		</div>
	)
}
