import PlayButton from "@/components/home/play-button"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/hooks/usePlayer"
import { toPlayerQueue, toPlayerTrack } from "@/utils/player"
import type { Track } from "@/types"
import { TrackContextMenu } from "@/components/track-context-menu"
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type MouseEvent,
} from "react"
import { RadioIcon } from "@/utils/icons"
import { cn } from "@/lib/utils"

type SeedType = "track" | "album" | "artist"

interface RadioSeedMeta {
	title?: string
	subtitle?: string
	image?: string
}

interface RadioPageProps {
	seed_type: SeedType
	seed_id: string
	tracks: Track[]
	seed_meta?: RadioSeedMeta | null
}

export default function RadioShow({
	seed_type,
	seed_id,
	tracks,
	seed_meta,
}: RadioPageProps) {
	const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = usePlayer()
	const [displayTracks, setDisplayTracks] = useState<Track[]>(tracks)
	const queue = useMemo(() => toPlayerQueue(displayTracks), [displayTracks])
	const [isFetchingMore, setIsFetchingMore] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const csrfToken =
		typeof document !== "undefined"
			? (
					document.querySelector(
						'meta[name="csrf-token"]',
					) as HTMLMetaElement | null
				)?.content
			: undefined

	useEffect(() => {
		setDisplayTracks(tracks)
	}, [tracks])

	useEffect(() => {
		// Autoplay first track when arriving on the page if nothing is playing
		if (!queue.length) return
		if (!currentTrack) {
			setCurrentTrack(queue[0], queue, 0)
		}
	}, [queue, currentTrack, setCurrentTrack])

	const handlePlayTrack = (
		track: Track,
		index: number,
		event?: MouseEvent<HTMLButtonElement>,
	) => {
		event?.stopPropagation()
		const queueTrack = queue[index] ?? toPlayerTrack(track)
		if (currentTrack?.id === queueTrack.id) {
			setIsPlaying(!isPlaying)
			return
		}
		setCurrentTrack(queueTrack, queue, index)
	}

	const appendTracks = useCallback(
		(incoming: Track[]) => {
			if (!incoming?.length) return
			setDisplayTracks((prev) => {
				const existing = new Set(prev.map((t) => t.id))
				const filtered = incoming.filter((track) => !existing.has(track.id))
				if (!filtered.length) {
					setHasMore(false)
					return prev
				}
				const appended = [...prev, ...filtered]
				const merged = toPlayerQueue(appended)
				if (merged.length) {
					const activeId = currentTrack?.id ?? merged[0].id
					const activeIndex = merged.findIndex((t) => t.id === activeId)
					const nextActive = merged[activeIndex >= 0 ? activeIndex : 0]
					setCurrentTrack(
						nextActive,
						merged,
						activeIndex >= 0 ? activeIndex : 0,
					)
				}
				return appended
			})
		},
		[currentTrack, setCurrentTrack],
	)

	const fetchMore = useCallback(async () => {
		if (isFetchingMore || !hasMore) return
		try {
			setIsFetchingMore(true)
			const excludeIds = displayTracks.map((track) => track.id)
			const res = await fetch("/api/radio/next", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-TOKEN": csrfToken ?? "",
				},
				credentials: "same-origin",
				body: JSON.stringify({
					seed_type,
					seed_id,
					limit: 15,
					exclude: excludeIds,
				}),
			})
			if (!res.ok) {
				console.error("Failed to fetch radio tracks", await res.text())
				return
			}
			const data = await res.json()
			if (data?.tracks?.length) {
				appendTracks(data.tracks)
			} else {
				setHasMore(false)
			}
		} finally {
			setIsFetchingMore(false)
		}
	}, [
		appendTracks,
		csrfToken,
		displayTracks,
		hasMore,
		isFetchingMore,
		seed_id,
		seed_type,
	])

	const titleMap: Record<SeedType, string> = {
		track: "Track Radio",
		album: "Album Radio",
		artist: "Artist Radio",
	}

	useEffect(() => {
		if (!currentTrack || !queue.length || !hasMore) return
		const currentIndex = queue.findIndex(
			(track) => track.id.toString() === currentTrack.id.toString(),
		)
		if (currentIndex === -1) return
		const remaining = queue.length - currentIndex - 1
		if (remaining <= 4) {
			fetchMore()
		}
	}, [currentTrack, queue, hasMore, fetchMore])

	useEffect(() => {
		const handler = () => fetchMore()
		if (typeof window !== "undefined") {
			window.addEventListener("player:end-of-queue", handler)
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("player:end-of-queue", handler)
			}
		}
	}, [fetchMore])

	return (
		<div className="min-h-screen bg-gradient-to-b from-[#161616] via-[#0b0b0b] to-black text-white">
			<div className="px-5 md:px-10 pt-10 pb-6 flex flex-col gap-6 md:flex-row md:items-end">
				<div className="flex items-center gap-4 md:gap-6">
					<div className="w-32 h-32 md:w-48 md:h-48 rounded-lg shadow-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center ring-1 ring-white/5">
						{seed_meta?.image ? (
							<img
								src={seed_meta.image}
								alt={seed_meta.title}
								className="w-full h-full object-cover"
							/>
						) : (
							<span className="text-3xl font-bold text-zinc-600">
								{titleMap[seed_type][0]}
							</span>
						)}
					</div>
					<div>
						<p className="uppercase tracking-[0.2em] text-xs text-zinc-400 font-semibold">
							Radio
						</p>
						<h1 className="text-4xl md:text-6xl font-black mt-2 leading-tight drop-shadow">
							{titleMap[seed_type]}
						</h1>
						<p className="text-sm text-zinc-400 mt-3">
							Seed - {seed_meta?.title ?? seed_id}
						</p>
						{seed_meta?.subtitle && (
							<p className="text-sm text-zinc-500">{seed_meta.subtitle}</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-3">
					<PlayButton
						hoverable={false}
						onClick={() =>
							displayTracks[0] && handlePlayTrack(displayTracks[0], 0)
						}
						className={
							displayTracks[0] &&
							currentTrack?.id === displayTracks[0].id &&
							isPlaying
								? "bg-white"
								: undefined
						}
					/>
					<Button
						variant="secondary"
						size="sm"
						className="bg-white text-black font-semibold rounded-full px-5"
						onClick={fetchMore}
						disabled={isFetchingMore || !hasMore}
					>
						{isFetchingMore ? "Loading..." : hasMore ? "Get more" : "No more"}
					</Button>
				</div>
			</div>

			<div className="px-2 md:px-10 pb-16">
				<div className="hidden md:grid grid-cols-[60px_minmax(220px,2fr)_minmax(200px,1.4fr)_120px] gap-4 px-4 h-12 border-b border-white/10 text-sm text-zinc-400 mb-2 items-center font-semibold tracking-wide">
					<div className="flex items-center gap-2">
						<span>#</span>
						<RadioIcon className="w-4 h-4 text-zinc-500" />
					</div>
					<div>Title</div>
					<div>Album</div>
					<div className="text-right pr-4">Duration</div>
				</div>

				{displayTracks.map((track, index) => {
					const isCurrent = currentTrack?.id?.toString() === track.id.toString()
					return (
						<TrackContextMenu
							key={`${track.id}-${index}`}
							trackId={track.id}
							trackName={track.name}
							artistId={track.artist_id}
							albumId={track.album_id}
						>
							<div
								className={cn(
									"grid grid-cols-1 md:grid-cols-[60px_minmax(220px,2fr)_minmax(200px,1.4fr)_120px] items-center gap-3 md:gap-4 px-3 md:px-4 py-3 rounded-lg cursor-pointer transition-colors",
									isCurrent ? "bg-white/12" : "hover:bg-white/5",
								)}
								onClick={(e) => handlePlayTrack(track, index, e)}
							>
								<div className="text-zinc-400 text-sm md:text-left flex items-center gap-2">
									<span className="w-6 text-right">{index + 1}</span>
									{isCurrent && isPlaying && (
										<span className="text-green-400 font-semibold text-xs uppercase tracking-wide">
											Now Playing
										</span>
									)}
								</div>
								<div className="flex items-center gap-3 min-w-0">
									{track.album_cover && (
										<img
											src={track.album_cover}
											alt={track.name}
											className="w-12 h-12 rounded object-cover flex-shrink-0"
										/>
									)}
									<div className="min-w-0">
										<div
											className={`truncate font-medium ${
												isCurrent ? "text-green-400" : "text-white"
											}`}
										>
											{track.name}
										</div>
										<div className="text-zinc-400 text-sm truncate">
											{track.artist}
										</div>
									</div>
								</div>
								<div className="hidden md:block text-sm text-zinc-400 truncate">
									{track.album ?? "—"}
								</div>
								<div className="hidden md:flex justify-end text-zinc-400 text-sm">
									{formatDuration(track.duration)}
								</div>
							</div>
						</TrackContextMenu>
					)
				})}
			</div>
		</div>
	)
}

function formatDuration(seconds: number) {
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	return `${mins}:${secs.toString().padStart(2, "0")}`
}
