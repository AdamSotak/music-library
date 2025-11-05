import type { Category } from "@/types"
import { router } from "@inertiajs/react"
import { Modals } from "@/hooks/useModals"

interface CategoryPageProps {
	category: Category
}

export default function CategoryPage({ category }: CategoryPageProps) {
	const { setOpen: setAddToPlaylistOpen } = Modals.useAddToPlaylistModal()

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	const handleAddToPlaylist = (trackId: string, e: React.MouseEvent) => {
		e.stopPropagation()
		setAddToPlaylistOpen(true, [trackId])
	}

	return (
		<div className="min-h-screen bg-black text-white">
			{/* Hero Section */}
			<div
				className="relative h-[340px] flex items-end px-8 pb-8"
				style={{
					background: `linear-gradient(to bottom, ${category.color} 0%, rgba(0,0,0,0.6) 100%)`,
				}}
			>
				<div className="relative z-10">
					<p className="text-sm font-medium uppercase tracking-widest mb-4">
						Category
					</p>
					<h1 className="text-6xl lg:text-8xl font-black leading-none break-words whitespace-pre-line w-full max-w-full overflow-hidden text-ellipsis break-all">
						{category.name}
					</h1>
				</div>
				<div
					className="absolute inset-0 opacity-20"
					style={{
						background: `radial-gradient(circle at 30% 50%, ${category.color}, transparent 70%)`,
					}}
				/>
			</div>

			{/* Content Sections */}
			<div className="px-8 py-8 space-y-12">
				{/* Popular Songs Section */}
				{category.tracks && category.tracks.length > 0 && (
					<section>
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-3xl font-bold">
								Popular {category.name} Songs
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{category.tracks.slice(0, 10).map((track, index) => (
								<div
									key={track.id}
									onClick={() => router.visit(`/tracks/${track.id}`)}
									className="flex items-center gap-4 p-3 rounded-md hover:bg-zinc-800/60 cursor-pointer group"
								>
									<div className="text-zinc-400 text-base w-6 text-center">
										{index + 1}
									</div>
									<img
										src={
											track.album_cover ||
											`https://placehold.co/56x56/333/white?text=${encodeURIComponent(track.album || "T")}`
										}
										alt={track.name}
										className="w-14 h-14 rounded"
									/>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-base truncate group-hover:text-green-400 transition-colors">
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
										onClick={(e) => handleAddToPlaylist(String(track.id), e)}
										className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white"
										title="Add to playlist"
									>
										<svg
											className="w-5 h-5"
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
							))}
						</div>
					</section>
				)}

				{/* Empty State */}
				{(!category.tracks || category.tracks.length === 0) &&
					(!category.albums || category.albums.length === 0) &&
					(!category.playlists || category.playlists.length === 0) && (
						<div className="text-center py-20">
							<h3 className="text-2xl font-bold mb-4">
								No content available yet
							</h3>
							<p className="text-zinc-400 text-lg">
								Check back later for {category.name} music!
							</p>
						</div>
					)}
			</div>
		</div>
	)
}
