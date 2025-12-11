import type { Album, Track, Playlist } from "@/types"
import { router } from "@inertiajs/react"
import { Modals } from "@/hooks/useModals"
import PlayButton from "@/components/home/play-button"
import { TrackContextMenu } from "@/components/track-context-menu"
import { toPlayerTrack } from "@/utils/player"

interface Artist {
	type: string
	id: number
	name: string
	image: string
}

interface SearchResults {
	tracks: Track[]
	albums: Album[]
	artists: Artist[]
	playlists: Playlist[]
	total: number
}

interface SearchPageProps {
	query: string
	results: SearchResults | null
}

export default function SearchPage({ query, results }: SearchPageProps) {
	const { setOpen: setAddToPlaylistOpen } = Modals.useAddToPlaylistModal()

	const handleAddToPlaylist = (trackId: number, e: React.MouseEvent) => {
		e.stopPropagation()
		setAddToPlaylistOpen(true, [String(trackId)])
	}

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	// Empty state - no search performed yet
	if (!results) {
		return (
			<div className="min-h-screen text-white px-6 py-8">
				<div className="max-w-[1955px] mx-auto">
					<div className="text-center py-32">
						<h1 className="text-[2rem] font-bold mb-4 text-white">
							Search for music
						</h1>
						<p className="text-zinc-400 text-base">
							Find your favorite songs, albums, artists, and playlists
						</p>
					</div>
				</div>
			</div>
		)
	}

	// No results found
	if (results.total === 0) {
		return (
			<div className="min-h-screen text-white px-6 py-8">
				<div className="max-w-[1955px] mx-auto">
					<div className="py-8">
						<h1 className="text-2xl font-bold mb-4">
							No results found for "{query}"
						</h1>
						<p className="text-zinc-400">
							Please make sure your words are spelled correctly, or use fewer or
							different keywords.
						</p>
					</div>
				</div>
			</div>
		)
	}

	// Has results
	return (
		<div className="min-h-screen text-white px-6 py-8">
			<div className="max-w-[1955px] mx-auto">
				{/* Top Result and Songs Section */}
				<div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 mb-12">
					{/* Top Result */}
					{(results.tracks.length > 0 ||
						results.albums.length > 0 ||
						results.artists.length > 0) && (
						<div>
							<h2 className="text-2xl font-bold mb-4">Top result</h2>
							{results.tracks.length > 0 ? (
								<div
									onClick={() =>
										router.visit(`/tracks/${results.tracks[0].id}`)
									}
									className="relative bg-zinc-900/40 hover:bg-zinc-800/60 p-5 rounded-lg cursor-pointer group transition-all"
								>
									<img
										src={
											results.tracks[0].album_cover ||
											`https://placehold.co/92x92/333/white?text=${encodeURIComponent(results.tracks[0].album || "T")}`
										}
										alt={results.tracks[0].name}
										className="w-[92px] h-[92px] rounded-lg mb-5 shadow-xl"
									/>
									<div className="mb-4">
										<h3 className="text-[2rem] font-bold mb-2 truncate">
											{results.tracks[0].name}
										</h3>
										<div className="flex items-center gap-2 text-sm">
											<span className="text-white">Song</span>
											<span className="text-zinc-400">•</span>
											<span className="text-zinc-400 truncate">
												{results.tracks[0].artist}
											</span>
										</div>
									</div>
									<div className="translate-2.5">
										<PlayButton />
									</div>
								</div>
							) : results.albums.length > 0 ? (
								<div
									onClick={() =>
										router.visit(`/albums/${results.albums[0].id}`)
									}
									className="relative bg-zinc-900/40 hover:bg-zinc-800/60 p-5 rounded-lg cursor-pointer group transition-all"
								>
									<img
										src={results.albums[0].cover}
										alt={results.albums[0].name}
										className="w-[92px] h-[92px] rounded-lg mb-5 shadow-xl"
									/>
									<div className="mb-4">
										<h3 className="text-[2rem] font-bold mb-2 truncate">
											{results.albums[0].name}
										</h3>
										<div className="flex items-center gap-2 text-sm">
											<span className="text-white">Album</span>
											<span className="text-zinc-400">•</span>
											<span className="text-zinc-400 truncate">
												{results.albums[0].artist}
											</span>
										</div>
									</div>
									<div className="translate-2.5">
										<PlayButton />
									</div>
								</div>
							) : results.artists.length > 0 ? (
								<div className="relative bg-zinc-900/40 hover:bg-zinc-800/60 p-5 rounded-lg cursor-pointer group transition-all">
									<img
										src={results.artists[0].image}
										alt={results.artists[0].name}
										className="w-[92px] h-[92px] rounded-full mb-5 shadow-xl"
									/>
									<div className="mb-4">
										<h3 className="text-[2rem] font-bold mb-2 truncate">
											{results.artists[0].name}
										</h3>
										<div className="flex items-center gap-2 text-sm">
											<span className="text-white">Artist</span>
										</div>
									</div>
									<div className="translate-2.5">
										<PlayButton />
									</div>
								</div>
							) : null}
						</div>
					)}

					{/* Songs */}
					{results.tracks.length > 0 && (
						<div className="min-w-0">
							<h2 className="text-2xl font-bold mb-4">Songs</h2>
							<div className="space-y-2">
								{results.tracks.slice(0, 4).map((track, _index) => (
									<TrackContextMenu
										key={track.id}
										trackId={track.id}
										trackName={track.name}
										artistId={track.artist_id}
										albumId={track.album_id}
										fullTrack={toPlayerTrack(track)}
									>
										<div
											onClick={() => router.visit(`/tracks/${track.id}`)}
											className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/60 cursor-pointer group"
										>
											<img
												src={
													track.album_cover ||
													`https://placehold.co/40x40/333/white?text=${encodeURIComponent(track.album || "T")}`
												}
												alt={track.name}
												className="w-10 h-10 rounded"
											/>
											<div className="flex-1 min-w-0">
												<div className="font-medium text-base truncate text-white">
													{track.name}
												</div>
												<div className="text-sm text-zinc-400 truncate">
													{track.artist}
												</div>
											</div>
											<div className="text-sm text-zinc-400">
												{formatDuration(track.duration)}
											</div>
											<button
												onClick={(e) =>
													handleAddToPlaylist(Number(track.id), e)
												}
												className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-all p-2"
												title="Add to playlist"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 4v16m8-8H4"
													/>
												</svg>
											</button>
										</div>
									</TrackContextMenu>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Artists */}
				{results.artists.length > 0 && (
					<div className="mb-12">
						<h2 className="text-2xl font-bold mb-4">Artists</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
							{results.artists.map((artist) => (
								<div
									key={artist.id}
									className="bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-lg cursor-pointer group transition-all"
								>
									<div className="relative mb-4">
										<img
											src={artist.image}
											alt={artist.name}
											className="w-full aspect-square object-cover rounded-full shadow-xl mb-4"
										/>
										<PlayButton />
									</div>
									<h3 className="font-semibold text-base mb-1 truncate text-white">
										{artist.name}
									</h3>
									<p className="text-sm text-zinc-400">Artist</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Albums */}
				{results.albums.length > 0 && (
					<div className="mb-12">
						<h2 className="text-2xl font-bold mb-4">Albums</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
							{results.albums.map((album) => (
								<div
									key={album.id}
									onClick={() => router.visit(`/albums/${album.id}`)}
									className="bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-lg cursor-pointer group transition-all"
								>
									<div className="relative mb-4">
										<img
											src={album.cover}
											alt={album.name}
											className="w-full aspect-square object-cover rounded-md shadow-xl mb-4"
										/>
										<PlayButton />
									</div>
									<h3 className="font-semibold text-base mb-1 truncate text-white">
										{album.name}
									</h3>
									<p className="text-sm text-zinc-400 truncate">
										{album.artist}
									</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Playlists */}
				{results.playlists.length > 0 && (
					<div className="mb-12">
						<h2 className="text-2xl font-bold mb-4">Playlists</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
							{results.playlists.map((playlist) => (
								<div
									key={playlist.id}
									onClick={() => router.visit(`/playlist/${playlist.id}`)}
									className="bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-lg cursor-pointer group transition-all"
								>
									<div className="relative mb-4">
										<img
											src={playlist.image}
											alt={playlist.name}
											className="w-full aspect-square object-cover rounded-md shadow-xl mb-4"
										/>
										<button className="absolute bottom-2 right-2 bg-green-500 hover:scale-105 transition-all w-12 h-12 rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
											<svg
												className="w-5 h-5 text-black ml-0.5"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</button>
									</div>
									<h3 className="font-semibold text-base mb-1 truncate text-white">
										{playlist.name}
									</h3>
									<p className="text-sm text-zinc-400 line-clamp-2">
										{playlist.description}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
