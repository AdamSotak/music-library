import { router } from "@inertiajs/react"
import { useState } from "react"

interface Playlist {
	id: number
	name: string
	image: string
}

interface AddToPlaylistDialogProps {
	trackId: number
	playlists: Playlist[]
	onClose: () => void
}

export function AddToPlaylistDialog({
	trackId,
	playlists,
	onClose,
}: AddToPlaylistDialogProps) {
	const [isCreating, setIsCreating] = useState(false)
	const [newPlaylistName, setNewPlaylistName] = useState("")

	const handleAddToPlaylist = (playlistId: number) => {
		router.post(
			`/playlist/${playlistId}/tracks`,
			{
				track_ids: [trackId],
			},
			{
				preserveScroll: true,
				onSuccess: () => onClose(),
			},
		)
	}

	const handleCreatePlaylist = (e: React.FormEvent) => {
		e.preventDefault()
		if (!newPlaylistName.trim()) return

		router.post(
			"/playlist",
			{
				name: newPlaylistName,
				description: "",
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setNewPlaylistName("")
					setIsCreating(false)
					onClose()
				},
			},
		)
	}

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-zinc-800 rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-white text-xl font-bold mb-4">Add to Playlist</h2>

				{isCreating ? (
					<form onSubmit={handleCreatePlaylist} className="mb-4">
						<input
							type="text"
							value={newPlaylistName}
							onChange={(e) => setNewPlaylistName(e.target.value)}
							placeholder="Playlist name"
							className="w-full bg-zinc-700 text-white px-4 py-2 rounded mb-2"
						/>
						<div className="flex gap-2">
							<button
								type="submit"
								className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400"
							>
								Create
							</button>
							<button
								type="button"
								onClick={() => setIsCreating(false)}
								className="bg-zinc-600 text-white px-4 py-2 rounded hover:bg-zinc-500"
							>
								Cancel
							</button>
						</div>
					</form>
				) : (
					<button
						onClick={() => setIsCreating(true)}
						className="w-full bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded mb-4 text-left"
					>
						+ Create New Playlist
					</button>
				)}

				<div className="space-y-2">
					{playlists.map((playlist) => (
						<button
							key={playlist.id}
							onClick={() => handleAddToPlaylist(playlist.id)}
							className="w-full flex items-center gap-3 p-2 rounded hover:bg-zinc-700 text-left"
						>
							<img
								src={playlist.image}
								alt={playlist.name}
								className="w-12 h-12 rounded"
							/>
							<span className="text-white font-medium">{playlist.name}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	)
}
