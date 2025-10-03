import type { Album } from "@/types"

interface AlbumsIndexProps {
	albums: Pick<Album, "id" | "name" | "artist" | "cover">[]
}

export default function AlbumsIndex({ albums }: AlbumsIndexProps) {
	return (
		<div className="min-h-screen bg-background-base p-6">
			<div className="max-w-7xl mx-auto">
				<h1 className="text-white text-3xl font-bold mb-8">Albums</h1>

				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
					{albums.map((album) => (
						<a
							key={album.id}
							href={`/album/${album.id}`}
							className="group cursor-pointer"
						>
							<div className="bg-zinc-800 p-4 rounded-lg hover:bg-zinc-700 transition-colors">
								<img
									src={album.cover}
									alt={album.name}
									className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"
								/>
								<h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">
									{album.name}
								</h3>
								<p className="text-zinc-400 text-xs line-clamp-1">
									{album.artist}
								</p>
							</div>
						</a>
					))}
				</div>
			</div>
		</div>
	)
}
