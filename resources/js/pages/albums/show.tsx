import type { Album } from "@/types"
import { Modals } from "@/hooks/useModals"
import { usePlayer } from "@/hooks/usePlayer"
import { WaveformIndicator } from "@/components/waveform-indicator"
import { Button } from "@/components/ui/button"

interface AlbumShowProps {
	album: Album
}

export default function AlbumShow({ album }: AlbumShowProps) {
	const { setOpen: setAddToPlaylistModalOpen } = Modals.useAddToPlaylistModal()
	const { currentTrack, isPlaying, setCurrentTrack } = usePlayer()

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	const handlePlayTrack = (track: any, index: number, e: React.MouseEvent) => {
		e.stopPropagation()
		setCurrentTrack(track, album.tracks as any[], index)
	}

	const totalDuration = album.tracks.reduce(
		(total, track) => total + track.duration,
		0,
	)
	const hours = Math.floor(totalDuration / 3600)
	const minutes = Math.floor((totalDuration % 3600) / 60)

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-900/20 via-black to-black text-white">
			{/* Header */}
			<div className="flex items-end gap-6 px-8 pt-20 pb-6 bg-gradient-to-b from-blue-900/30 to-transparent">
				<div className="w-60 h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
					<img
						src={album.cover}
						alt={album.name}
						className="w-full h-full object-cover"
					/>
				</div>
				<div className="flex flex-col justify-end pb-2">
					<p className="text-sm font-bold mb-2">Album</p>
					<h1 className="text-8xl font-black mb-6 leading-none">
						{album.name}
					</h1>
					<div className="flex items-center gap-2 text-sm">
						<span className="font-bold">{album.artist}</span>
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
			<div className="px-8 py-6 flex items-center gap-6 bg-black/20">
				<button
					className="bg-green-500 hover:bg-green-400 hover:scale-105 text-black w-14 h-14 rounded-full flex items-center justify-center transition-all"
					type="button"
				>
					<svg
						className="w-6 h-6 ml-1"
						fill="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path d="M8 5v14l11-7z" />
					</svg>
				</button>
				<Button size="icon" variant="spotifyTransparent" className="group">
					<svg
						className="min-w-8 min-h-8 transition-colors duration-300 group-hover:stroke-white"
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
						className="min-w-8 min-h-8 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M11.999 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m-11 9c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11-11-4.925-11-11"></path>
						<path d="M17.999 12a1 1 0 0 1-1 1h-4v4a1 1 0 1 1-2 0v-4h-4a1 1 0 1 1 0-2h4V7a1 1 0 1 1 2 0v4h4a1 1 0 0 1 1 1"></path>
					</svg>
				</Button>
				<Button size="icon" variant="spotifyTransparent" className="group">
					<svg
						className="min-w-8 min-h-8 transition-colors duration-300 group-hover:fill-white"
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
			<div className="px-8 pb-32">
				{/* Header */}
				<div className="grid grid-cols-[16px_1fr_minmax(120px,1fr)] gap-4 px-4 h-9 border-b border-white/10 text-sm text-zinc-400 mb-2 items-center">
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
							className={`grid grid-cols-[16px_1fr_minmax(120px,1fr)] gap-4 px-4 h-14 rounded-md group cursor-pointer items-center ${
								isCurrentTrack ? "bg-white/10" : "hover:bg-white/10"
							}`}
							onClick={(e) => handlePlayTrack(track, index, e)}
						>
							<div className="text-center text-sm group-hover:hidden flex justify-center">
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
								className="hidden group-hover:flex justify-center cursor-pointer"
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
							<div>
								<div
									className={`text-base ${isCurrentTrack ? "text-green-500" : "text-white"}`}
								>
									{track.name}
								</div>
								<div className="text-sm text-zinc-400 hover:text-white hover:underline cursor-pointer">
									{track.artist}
								</div>
							</div>
							<div className="flex items-center justify-end gap-4">
								<Button
									size="icon"
									variant="spotifyTransparent"
									className="group"
									onClick={(e) => {
										e.stopPropagation()
										setAddToPlaylistModalOpen(true, [track.id])
									}}
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
