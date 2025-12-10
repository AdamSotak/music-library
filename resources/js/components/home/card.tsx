import type { InertiaPageProps, ShelfItem } from "@/types"
import PlayButton from "./play-button"
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { router, usePage } from "@inertiajs/react"
import { useMemo } from "react"
import {
	Radio,
	User,
	Share2,
	ExternalLink,
	Heart,
	HeartOff,
	UserPlus,
	UserMinus,
	Disc3,
} from "lucide-react"
import { TrackContextMenu } from "@/components/track-context-menu"
import { useLikedTracksStore } from "@/hooks/useLikedTracks"
import { toPlayerTrack } from "@/utils/player"

interface CardProps {
	item: ShelfItem
	index: number
	onItemSelected?: (item: ShelfItem) => void
	onPlay?: (item: ShelfItem, index: number) => void
}

export default function Card({
	item,
	index,
	onItemSelected,
	onPlay,
}: CardProps) {
	const { savedAlbums, followedArtists, user } = usePage()
		.props as unknown as InertiaPageProps
	const likedTrackIds = useLikedTracksStore((state) => state.likedIds)
	const savedAlbumIds = useMemo(
		() => new Set(savedAlbums?.map((album) => album.id.toString())),
		[savedAlbums],
	)
	const followedArtistIds = useMemo(
		() => new Set(followedArtists?.map((artist) => artist.id.toString())),
		[followedArtists],
	)

	const goToRadio = () => {
		if (item.type === "track") {
			router.visit(`/radio?seed_type=track&seed_id=${item.id}`)
		} else if (item.type === "album") {
			router.visit(`/radio?seed_type=album&seed_id=${item.id}`)
		} else if (item.type === "artist") {
			router.visit(`/radio?seed_type=artist&seed_id=${item.id}`)
		}
	}

	const goToEntity = () => {
		if (item.type === "track") {
			router.visit(`/tracks/${item.id}`)
		} else if (item.type === "album") {
			router.visit(`/albums/${item.id}`)
		} else if (item.type === "artist") {
			router.visit(`/artist/${item.id}`)
		}
	}

	const handleShare = () => {
		if (typeof window === "undefined") return
		const base = window.location.origin
		const path =
			item.type === "album"
				? `/albums/${item.id}`
				: item.type === "artist"
					? `/artist/${item.id}`
					: `/tracks/${item.id}`
		navigator.clipboard?.writeText(`${base}${path}`)
	}

	const handleToggleAlbumSave = () => {
		if (!user) {
			router.visit("/login")
			return
		}
		router.post(
			`/library/albums/${item.id}`,
			{},
			{
				preserveScroll: true,
			},
		)
	}

	const handleToggleArtistFollow = () => {
		if (!user) {
			router.visit("/login")
			return
		}
		router.post(
			`/library/artists/${item.id}`,
			{},
			{
				preserveScroll: true,
			},
		)
	}

	const cardBody = (
		<article
			className="min-w-[170px] group/card cursor-pointer p-3 hover:bg-zinc-900 active:bg-black transition-all rounded-md"
			data-card
			onClick={() => onItemSelected?.(item)}
		>
			<div
				className={[
					"aspect-square w-[170px] overflow-hidden relative",
					item.type === "artist" ? "rounded-full" : "rounded-sm",
					item.image ? "bg-cover bg-center bg-no-repeat" : "bg-orange-300",
				].join(" ")}
				style={
					item.image ? { backgroundImage: `url(${item.image})` } : undefined
				}
				aria-hidden
			>
				{item.type !== "artist" && (
					<PlayButton
						className="group-hover/card:translate-y-0 group-hover/card:opacity-100 group-hover/card:scale-100"
						onClick={(event) => {
							if (!onPlay) return
							event.stopPropagation()
							onPlay(item, index)
						}}
					/>
				)}
			</div>
			<div className="mt-3 text-white font-semibold leading-tight truncate max-w-36 overflow-x-hidden">
				{item.title}
			</div>
			{item.subtitle && (
				<div className="text-sm text-neutral-300 mt-1 line-clamp-2">
					{item.subtitle}
				</div>
			)}
		</article>
	)

	if (item.type === "track" && item.track) {
		return (
			<TrackContextMenu
				trackId={item.track.id.toString()}
				trackName={item.track.name}
				artistId={item.track.artist_id}
				albumId={item.track.album_id}
				isLiked={likedTrackIds.has(item.track.id.toString())}
				fullTrack={toPlayerTrack(item.track)}
			>
				{cardBody}
			</TrackContextMenu>
		)
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{cardBody}</ContextMenuTrigger>
			<ContextMenuContent className="w-60">
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						goToEntity()
					}}
					className="flex items-center gap-2"
				>
					{item.type === "artist" ? (
						<User className="w-4 h-4 text-zinc-400" />
					) : (
						<Disc3 className="w-4 h-4 text-zinc-400" />
					)}
					{item.type === "artist" ? "Go to artist" : "Open album"}
				</ContextMenuItem>
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						goToRadio()
					}}
					className="flex items-center gap-2"
				>
					<Radio className="w-4 h-4 text-zinc-400" />
					Go to radio
				</ContextMenuItem>
				{item.type === "album" && (
					<>
						<ContextMenuItem
							onSelect={(event) => {
								event.preventDefault()
								handleToggleAlbumSave()
							}}
							className="flex items-center gap-2"
						>
							{savedAlbumIds.has(item.id) ? (
								<HeartOff className="w-4 h-4" />
							) : (
								<Heart className="w-4 h-4" />
							)}
							{savedAlbumIds.has(item.id)
								? "Remove from Your Library"
								: "Save to Your Library"}
						</ContextMenuItem>
						{item.artistId && (
							<ContextMenuItem
								onSelect={(event) => {
									event.preventDefault()
									router.visit(`/artist/${item.artistId}`)
								}}
								className="flex items-center gap-2"
							>
								<User className="w-4 h-4" />
								Go to artist
							</ContextMenuItem>
						)}
					</>
				)}
				{item.type === "artist" && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							handleToggleArtistFollow()
						}}
						className="flex items-center gap-2"
					>
						{followedArtistIds.has(item.id) ? (
							<UserMinus className="w-4 h-4" />
						) : (
							<UserPlus className="w-4 h-4" />
						)}
						{followedArtistIds.has(item.id) ? "Unfollow" : "Follow"}
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						handleShare()
					}}
					className="flex items-center gap-2"
				>
					<Share2 className="w-4 h-4" />
					Share
				</ContextMenuItem>
				<ContextMenuItem disabled className="flex items-center gap-2">
					<ExternalLink className="w-4 h-4" />
					Open in Desktop app
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	)
}
