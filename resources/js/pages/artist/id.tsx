import PlayButton from "@/components/home/play-button"
import Shelf from "@/components/home/shelf"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/hooks/usePlayer"
import { toPlayerQueue, toPlayerTrack } from "@/utils/player"
import type { Album, Artist, ShelfItem, Track } from "@/types"
import { Utils } from "@/utils"
import { router } from "@inertiajs/react"
import { useMemo, type MouseEvent } from "react"

interface ArtistPageProps {
	artist: Artist
	albums: Album[]
	tracks: Track[]
}

export default function ArtistPage({
	artist,
	albums,
	tracks,
}: ArtistPageProps) {
	const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = usePlayer()
	const playerQueue = useMemo(() => toPlayerQueue(tracks), [tracks])

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

	return (
		<>
			{/* Hero Header */}
			<div className="h-[18rem] sm:h-[22rem] flex flex-col justify-end px-4 sm:px-6 pb-4 sm:pb-6 relative">
				{artist.is_verified && (
					<div className="flex items-center gap-2 z-30">
						<svg
							data-encore-id="verifiedBadge"
							role="img"
							aria-hidden="false"
							viewBox="0 0 24 24"
							fill="#4cb3ff"
							className="w-5 h-5 sm:w-6 sm:h-6"
						>
							<path d="M10.814.5a1.66 1.66 0 0 1 2.372 0l2.512 2.572 3.595-.043a1.66 1.66 0 0 1 1.678 1.678l-.043 3.595 2.572 2.512c.667.65.667 1.722 0 2.372l-2.572 2.512.043 3.595a1.66 1.66 0 0 1-1.678 1.678l-3.595-.043-2.512 2.572a1.66 1.66 0 0 1-2.372 0l-2.512-2.572-3.595.043a1.66 1.66 0 0 1-1.678-1.678l.043-3.595L.5 13.186a1.66 1.66 0 0 1 0-2.372l2.572-2.512-.043-3.595a1.66 1.66 0 0 1 1.678-1.678l3.595.043z" />
							<path
								d="M17.398 9.62a1 1 0 0 0-1.414-1.413l-6.011 6.01-1.894-1.893a1 1 0 0 0-1.414 1.414l3.308 3.308z"
								fill="#fff"
							/>
						</svg>
						<span className="text-sm sm:text-base">Verified Artist</span>
					</div>
				)}
				<h1 className="text-white text-4xl sm:text-6xl lg:text-8xl font-bold z-30 mt-2 break-words">
					{artist.name}
				</h1>
				<div className="absolute left-0 right-0 bottom-0 h-32 opacity-30 z-20 bg-gradient-to-b from-transparent to-black" />
				<span className="text-white text-sm sm:text-base z-30 mt-3 sm:mt-5">
					{Utils.formatNumber(artist.monthly_listeners ?? 0)} monthly listeners
				</span>
			</div>

			<div className="bg-gradient-to-b from-white/10 to-transparent to-30%">
				{/* Action Buttons */}
				<div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-5 pt-5">
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

				{/* Popular Tracks and Artist Pick - Reordered on mobile */}
				<div className="flex flex-col lg:flex-row w-full mt-5 sm:mt-7 gap-6 lg:gap-12 px-4 sm:px-5">
					{/* Popular Tracks - Full width on mobile, 3/5 on desktop */}
					<div className="flex flex-col gap-2 w-full lg:w-3/5 order-2 lg:order-1">
						<span className="text-white text-xl sm:text-2xl font-[700]">
							Popular
						</span>

						<div>
							{tracks.slice(0, 5).map((track, index) => (
								<div
									key={track.id}
									className="grid grid-cols-[auto_1fr_auto] items-center px-1 sm:px-2 py-2 rounded group hover:bg-white/10 cursor-pointer"
									onClick={(e) => handlePlayTrack(track, index, e)}
								>
									<div className="flex items-center gap-2 sm:gap-4 w-8 sm:w-10">
										<span className="text-zinc-400 text-sm w-4 text-right group-hover:hidden">
											{index + 1}
										</span>
										<button
											onClick={(e) => handlePlayTrack(track, index, e)}
											className="hidden md:group-hover:flex justify-center cursor-pointer ml-0 sm:ml-1.5"
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
									</div>
									<div className="flex items-center gap-2 sm:gap-3.5 overflow-hidden min-w-0">
										<img
											src={track.album_cover}
											alt={track.name}
											className="w-10 h-10 rounded flex-shrink-0"
										/>
										<span className="text-white font-medium truncate text-sm sm:text-base">
											{track.name}
										</span>
									</div>
									<div className="flex items-center gap-1 sm:gap-2">
										<Button
											size={"icon"}
											variant={"spotifyTransparent"}
											className="group group-hover:block hidden"
											onClick={(e) => {
												e.stopPropagation()
											}}
										>
											<svg
												data-encore-id="icon"
												role="img"
												aria-hidden="true"
												fill="gray"
												viewBox="0 0 16 16"
												className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
											>
												<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"></path>
												<path d="M11.75 8a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75"></path>
											</svg>
										</Button>
										<span className="text-zinc-400 text-xs sm:text-sm whitespace-nowrap">
											{formatDuration(track.duration)}
										</span>
									</div>
								</div>
							))}
						</div>

						<span className="text-zinc-400 hover:text-white text-sm font-[700] w-fit px-2 sm:px-3 cursor-pointer mt-2 sm:mt-3">
							See more
						</span>
					</div>

					{/* Artist Pick - Full width on mobile (appears first), 2/5 on desktop */}
					<div className="w-full lg:w-2/5 order-1 lg:order-2">
						<span className="text-white text-xl sm:text-2xl font-[700]">
							Artist pick
						</span>

						<div className="flex items-start gap-3 sm:gap-4 mt-3 rounded-lg">
							<img
								src={albums[0].cover}
								alt={albums[0].name}
								className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm cursor-pointer flex-shrink-0"
								onClick={() => router.visit(`/albums/${albums[0].id}`)}
							/>
							<div className="flex flex-col items-start min-w-0">
								<span className="bg-white text-black rounded-full py-1 px-3 text-xs sm:text-sm mb-2">
									out now!
								</span>

								<span
									onClick={() => router.visit(`/albums/${albums[0].id}`)}
									className="font-[700] hover:underline cursor-pointer text-sm sm:text-base truncate w-full"
								>
									{albums[0].name}
								</span>
								<span className="text-xs sm:text-sm text-zinc-400">Album</span>
							</div>
						</div>
					</div>
				</div>

				{/* Discography Section */}
				<div className="mt-8 sm:mt-10 pb-20">
					<div className="flex items-center justify-between gap-2 px-4 sm:px-5">
						<span className="text-white text-xl sm:text-2xl font-[700]">
							Discography
						</span>
						<span className="text-zinc-400 hover:underline text-xs sm:text-sm font-[700] w-fit px-2 sm:px-3 cursor-pointer">
							Show all
						</span>
					</div>
					<div className="-ml-2 sm:-ml-4">
						<Shelf
							items={(() => {
								const combined = [
									...(albums.map((album) => ({
										id: album.id,
										title: album.name,
										subtitle: `${album.year || ""} • Album`,
										type: "album",
										image: album.cover,
									})) as ShelfItem[]),
									...(tracks.map((track) => ({
										id: track.id,
										title: track.name,
										subtitle: `2024 • Single`,
										type: "track",
										image: track.album_cover,
									})) as ShelfItem[]),
								]
								// Shuffle the combined array
								for (let i = combined.length - 1; i > 0; i--) {
									const j = Math.floor(Math.random() * (i + 1))
									;[combined[i], combined[j]] = [combined[j], combined[i]]
								}
								return combined
							})()}
							showMoreVisible={false}
							onItemSelected={(item) => {
								if (item.type === "album") {
									router.visit(`/albums/${item.id}`)
								} else if (item.type === "track") {
									router.visit(`/tracks/${item.id}`)
								}
							}}
						/>
					</div>
				</div>
			</div>
		</>
	)
}
