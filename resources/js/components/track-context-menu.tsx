import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
} from "@/components/ui/context-menu"
import { RadioIcon } from "@/utils/icons"
import { router, usePage } from "@inertiajs/react"
import type { ReactNode } from "react"
import type { InertiaPageProps, Playlist } from "@/types"
import {
	Plus,
	Heart,
	HeartOff,
	Share2,
	Disc3,
	User,
	Music2,
	ExternalLink,
	Clipboard,
} from "lucide-react"
import { useLikedTracksStore } from "@/hooks/useLikedTracks"
import { useJamSession } from "@/hooks/useJamSession"
import { usePlayer } from "@/hooks/usePlayer"

type TrackContextMenuProps = {
	trackId: string
	trackName?: string
	artistId?: string
	albumId?: string
	isLiked?: boolean
	onToggleLike?: (trackId: string) => void
	afterAddToPlaylist?: (trackId: string, playlistId: string) => void
	children: ReactNode
}

export function TrackContextMenu({
	trackId,
	trackName,
	artistId,
	albumId,
	isLiked,
	onToggleLike,
	afterAddToPlaylist,
	children,
}: TrackContextMenuProps) {
	const { playlists } = usePage().props as unknown as InertiaPageProps
	const player = usePlayer()
	const { sessionId, addToJamQueue } = useJamSession(
		// safe fallbacks; JamPanel passes user ids
		(usePage().props as any)?.user?.id?.toString?.() ?? null,
		(usePage().props as any)?.user?.name ?? null,
	)
	const userPlaylists =
		(playlists as Playlist[] | undefined)?.filter((p) => !p.is_default) ?? []
	const likedPlaylistId = useLikedTracksStore((state) => state.playlistId)
	const likedIds = useLikedTracksStore((state) => state.likedIds)
	const addLiked = useLikedTracksStore((state) => state.add)
	const removeLiked = useLikedTracksStore((state) => state.remove)
	const derivedIsLiked = isLiked ?? likedIds.has(trackId.toString())
	const canToggleLike = onToggleLike || likedPlaylistId

	const handleAddToPlaylist = (playlistId: string) => {
		router.post(
			`/playlist/${playlistId}/tracks`,
			{ track_ids: [trackId] },
			{
				preserveScroll: true,
				onSuccess: () => {
					afterAddToPlaylist?.(trackId, playlistId)
				},
			},
		)
	}

	const handleAddToQueue = () => {
		const allPlaylists = (playlists as Playlist[] | undefined) ?? []

		let fullTrack: {
			id: string
			name: string
			artist: string
			artist_id: string
			album: string
			album_id?: string
			album_cover?: string
			duration: number
			audio: string | null
		} | null = null

		for (const playlist of allPlaylists) {
			const fromPlaylist = playlist.tracks?.find(
				(track) => track.id.toString() === trackId.toString(),
			)
			if (fromPlaylist) {
				fullTrack = {
					id: fromPlaylist.id.toString(),
					name: fromPlaylist.name,
					artist: fromPlaylist.artist,
					artist_id: fromPlaylist.artist_id,
					album: fromPlaylist.album ?? "",
					album_id: fromPlaylist.album_id,
					album_cover: fromPlaylist.album_cover,
					duration: fromPlaylist.duration,
					audio: fromPlaylist.audio,
				}
				break
			}
		}

		if (!fullTrack) {
			fullTrack = {
				id: trackId,
				name: trackName ?? "Track",
				artist: "",
				artist_id: artistId ?? "",
				album: "",
				album_id: albumId,
				album_cover: undefined,
				duration: 0,
				audio: null,
			}
		}

		player.addToQueue([fullTrack])
	}

	const handleToggleLike = () => {
		if (!canToggleLike) return

		if (onToggleLike) {
			onToggleLike(trackId)
			return
		}

		if (!likedPlaylistId) return

		if (derivedIsLiked) {
			router.delete(`/playlist/${likedPlaylistId}/tracks/${trackId}`, {
				preserveScroll: true,
				onSuccess: () => removeLiked(trackId),
			})
			return
		}

		router.post(
			`/playlist/${likedPlaylistId}/tracks`,
			{
				track_ids: [trackId],
			},
			{
				preserveScroll: true,
				onSuccess: () => addLiked(trackId),
			},
		)
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-56 bg-[#282828] text-white border-none shadow-2xl">
				{userPlaylists.length > 0 && (
					<ContextMenuSub>
						<ContextMenuSubTrigger className="flex items-center gap-2">
							<Plus className="w-4 h-4" />
							Add to playlist
						</ContextMenuSubTrigger>
						<ContextMenuSubContent className="w-72 max-h-80 overflow-y-auto bg-[#282828] text-white border-none shadow-2xl">
							{userPlaylists.map((playlist) => (
								<ContextMenuItem
									key={playlist.id}
									onSelect={(event) => {
										event.preventDefault()
										handleAddToPlaylist(playlist.id)
									}}
									className="hover:bg-white/10 focus:bg-white/10"
								>
									{playlist.name}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}
				{canToggleLike && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							handleToggleLike()
						}}
						className="flex items-center gap-2"
					>
						{derivedIsLiked ? (
							<HeartOff className="w-4 h-4" />
						) : (
							<Heart className="w-4 h-4" />
						)}
						{derivedIsLiked
							? "Remove from Liked Songs"
							: "Save to your Liked Songs"}
					</ContextMenuItem>
				)}
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						handleAddToQueue()
					}}
					className="flex items-center gap-2"
				>
					<RadioIcon className="w-4 h-4 text-zinc-400" />
					Add to queue
				</ContextMenuItem>
				<ContextMenuSeparator />
				{sessionId && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							addToJamQueue?.([
								{
									id: trackId,
									name: trackName ?? "Track",
									artist: "",
									artist_id: artistId ?? "",
									album: "",
									album_id: albumId,
									album_cover: undefined,
									duration: 0,
									audio: null,
								},
							])
						}}
						className="flex items-center gap-2"
					>
						<RadioIcon className="w-4 h-4 text-zinc-400" />
						Add to Jam queue
					</ContextMenuItem>
				)}
				{sessionId && <ContextMenuSeparator />}
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						router.visit(`/radio?seed_type=track&seed_id=${trackId}`)
					}}
					className="flex items-center gap-2"
				>
					<RadioIcon className="w-4 h-4 text-zinc-400" />
					Go to song radio
				</ContextMenuItem>
				{artistId && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							router.visit(`/artist/${artistId}`)
						}}
						className="flex items-center gap-2"
					>
						<User className="w-4 h-4" />
						Go to artist
					</ContextMenuItem>
				)}
				{albumId && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							router.visit(`/albums/${albumId}`)
						}}
						className="flex items-center gap-2"
					>
						<Disc3 className="w-4 h-4" />
						Go to album
					</ContextMenuItem>
				)}
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						router.visit(`/tracks/${trackId}`)
					}}
					className="flex items-center gap-2"
				>
					<Music2 className="w-4 h-4" />
					View credits
				</ContextMenuItem>
				<ContextMenuSub>
					<ContextMenuSubTrigger className="flex items-center gap-2">
						<Share2 className="w-4 h-4" />
						Share
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-48 bg-[#282828] text-white border-none shadow-2xl">
						<ContextMenuItem
							onSelect={(event) => {
								event.preventDefault()
								if (typeof window !== "undefined") {
									const url = `${window.location.origin}/tracks/${trackId}`
									navigator.clipboard?.writeText(url)
								}
							}}
							className="flex items-center gap-2"
						>
							<Clipboard className="w-4 h-4" />
							Copy link to track
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuItem disabled className="flex items-center gap-2">
					<ExternalLink className="w-4 h-4" />
					Open in Desktop app
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	)
}
