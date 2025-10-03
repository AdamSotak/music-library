import type { Playlist } from "@/types"

interface PlaylistsIndexProps {
	playlists: Pick<Playlist, "id" | "name" | "description" | "image">[]
}

export default function PlaylistsIndex({ playlists }: PlaylistsIndexProps) {
	return (
		<div className="min-h-screen bg-background-base p-6">
			<div className="max-w-7xl mx-auto">
				<h1 className="text-white text-3xl font-bold mb-8">Playlists</h1>

				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{playlists.map((playlist) => (
						<a
							key={playlist.id}
							href={`/playlist/${playlist.id}`}
							className="group cursor-pointer bg-zinc-800/40 hover:bg-zinc-800 p-4 rounded-md transition-all"
						>
							<div className="relative mb-4">
								<img
									src={playlist.image}
									alt={playlist.name}
									className="w-full aspect-square object-cover rounded-md shadow-lg"
								/>
							</div>
							<h3 className="text-white font-semibold text-base mb-1 truncate">
								{playlist.name}
							</h3>
							<p className="text-zinc-400 text-sm line-clamp-2 leading-snug min-h-[2.5rem]">
								{playlist.description}
							</p>
						</a>
					))}
				</div>
			</div>
		</div>
	)
}
