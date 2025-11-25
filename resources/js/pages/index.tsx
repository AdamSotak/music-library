import PlayButton from "@/components/home/play-button"
import Shelf from "@/components/home/shelf"
import { cn } from "@/lib/utils"
import { usePlayer } from "@/hooks/usePlayer"
import { toPlayerQueue, toPlayerTrack } from "@/utils/player"
import type {
	Album,
	Artist,
	FriendRecommendation,
	InertiaPageProps,
	ShelfItem,
	Track,
} from "@/types"
import { router, usePage } from "@inertiajs/react"
import { useEffect, useMemo, useState } from "react"

interface IndexProps {
	albums: Album[]
	artists: Artist[]
	tracks: Track[]
	friendRecommendation: FriendRecommendation | null
}

export default function Index({
	albums,
	artists,
	tracks,
	friendRecommendation,
}: IndexProps) {
	const { user } = usePage().props as unknown as InertiaPageProps
	const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying } = usePlayer()
	const trackQueue = useMemo(() => toPlayerQueue(tracks), [tracks])
	const trackShelfItems = useMemo(
		() =>
			tracks.map((track) => ({
				id: track.id,
				title: track.name,
				subtitle: track.artist,
				type: "track" as const,
				image: track.album_cover,
				track,
			})),
		[tracks],
	)
	const topGradientClasses = [
		"from-purple-900/70",
		"from-blue-900/70",
		"from-yellow-900/70",
		"from-orange-900/70",
		"from-red-900/70",
	]

	const [topGradientClass] = useState(() => {
		const randomIndex = Math.floor(Math.random() * topGradientClasses.length)
		return topGradientClasses[randomIndex]
	})

	const [gradientVisible, setGradientVisible] = useState(false)
	const [selectedTab, setSelectedTab] = useState<"all" | "music" | "podcasts">(
		"all",
	)

	const handlePlayHomeTrack = (item: ShelfItem, index: number) => {
		if (!item.track) return
		const queueTrack = trackQueue[index] ?? toPlayerTrack(item.track)
		if (currentTrack?.id === queueTrack.id) {
			setIsPlaying(!isPlaying)
			return
		}
		setCurrentTrack(queueTrack, trackQueue, index)
	}

	// Friend tracks need their own queue and handler
	const friendTrackQueue = useMemo(
		() =>
			friendRecommendation ? toPlayerQueue(friendRecommendation.tracks) : [],
		[friendRecommendation],
	)

	const friendTrackShelfItems = useMemo(
		() =>
			friendRecommendation?.tracks.map((track) => ({
				id: track.id,
				title: track.name,
				subtitle: track.artist,
				type: "track" as const,
				image: track.album_cover,
				track,
			})) || [],
		[friendRecommendation],
	)

	const handlePlayFriendTrack = (item: ShelfItem, index: number) => {
		if (!item.track) return
		const queueTrack = friendTrackQueue[index] ?? toPlayerTrack(item.track)
		if (currentTrack?.id === queueTrack.id) {
			setIsPlaying(!isPlaying)
			return
		}
		setCurrentTrack(queueTrack, friendTrackQueue, index)
	}

	useEffect(() => {
		const timeout = setTimeout(() => setGradientVisible(true), 10)
		return () => clearTimeout(timeout)
	}, [])

	return (
		<main className="pb-[140px] relative">
			{/* Only the gradient fades in/out */}
			<div
				className={cn(
					"absolute inset-0 z-0 bg-gradient-to-b to-transparent to-20% transition-opacity duration-700 pointer-events-none",
					topGradientClass,
					gradientVisible ? "opacity-100" : "opacity-0",
				)}
				aria-hidden
			/>

			<div className="flex items-center gap-2 px-5 lg:px-10 relative z-10 pt-5">
				{["all", "music", "podcasts"].map((tab) => (
					<div
						key={tab}
						className={cn(
							"flex items-center bg-white/10 px-3 py-1.5 rounded-full cursor-pointer",
							selectedTab === tab && "bg-white",
						)}
						onClick={() => setSelectedTab(tab as typeof selectedTab)}
					>
						<span
							className={cn(
								"text-sm",
								selectedTab === tab && "text-background-base",
							)}
						>
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</span>
					</div>
				))}
			</div>

			<div className="relative z-10 px-5 lg:px-10 mt-5 flex gap-2">
				<div className="bg-white/10 hover:bg-white/20 transition-all duration-100 cursor-pointer flex items-center gap-2 rounded-sm w-[22rem] group relative">
					<img
						className="w-12 h-12 rounded-tl-sm rounded-bl-sm"
						src="/images/playlists/discover-weekly.jpg"
						alt="Discover Weekly"
					/>
					<span className="text-sm font-[700]">Discover Weekly</span>
					<PlayButton
						size="small"
						className="group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 !right-2 !bottom-auto !top-1/2 !-translate-y-1/2"
					/>
				</div>

				<div className="bg-white/10 hover:bg-white/20 transition-all duration-100 cursor-pointer flex items-center gap-2 rounded-sm w-[22rem] group relative">
					<img
						className="w-12 h-12 rounded-tl-sm rounded-bl-sm"
						src="/images/playlists/top-50-denmark.jpg"
						alt="Top 50 - Denmark"
					/>
					<span className="text-sm font-[700]">Top 50 - Denmark</span>
					<PlayButton
						size="small"
						className="group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 !right-2 !bottom-auto !top-1/2 !-translate-y-1/2"
					/>
				</div>
			</div>

			<div className="pt-10">
				<Shelf
					title={user?.name.split(" ")[0]}
					topTitle="Made For"
					items={trackShelfItems}
					onItemSelected={(item) => router.visit(`/tracks/${item.id}`)}
					onPlayItem={handlePlayHomeTrack}
				/>
				{friendRecommendation && (
					<Shelf
						title={`${friendRecommendation.friend_name} is listening to`}
						topTitle="Friend"
						items={friendTrackShelfItems}
						onItemSelected={(item) => router.visit(`/tracks/${item.id}`)}
						onPlayItem={handlePlayFriendTrack}
					/>
				)}
				<Shelf
					title="Featured Charts"
					items={albums.map((album) => ({
						id: album.id,
						title: album.name,
						subtitle: album.artist,
						type: "album",
						image: album.cover,
					}))}
					onItemSelected={(item) => router.visit(`/albums/${item.id}`)}
				/>
				<Shelf
					title="Hot Hits Denmark"
					topTitle="More like"
					items={albums.map((album) => ({
						id: album.id,
						title: album.name,
						subtitle: album.artist,
						type: "album",
						image: album.cover,
					}))}
					onItemSelected={(item) => router.visit(`/albums/${item.id}`)}
				/>
				<Shelf
					title="Throwback"
					topTitle="Playlists full of favorites, still going strong."
					items={artists.map((artist) => ({
						id: artist.id,
						title: artist.name,
						type: "artist",
						image: artist.image,
					}))}
					onItemSelected={(item) => router.visit(`/artist/${item.id}`)}
				/>
			</div>
		</main>
	)
}
