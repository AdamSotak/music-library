import { Modals } from "@/hooks/useModals"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog"
import { usePage, router } from "@inertiajs/react"
import { Music } from "lucide-react"

export const AddToPlaylistModal = () => {
	const { open, trackIds, setOpen } = Modals.useAddToPlaylistModal()
	const { playlists } = usePage().props as { playlists: Array<{ id: number; name: string; image: string }> }

	const handleAddToPlaylist = (playlistId: number) => {
		router.post(`/playlist/${playlistId}/tracks`, {
			track_ids: trackIds,
		}, {
			onSuccess: () => {
				setOpen(false)
			},
		})
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="bg-zinc-800 border-none max-h-[70vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Add to playlist</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto mt-4">
					{playlists && playlists.length > 0 ? (
						<div className="space-y-1">
							{playlists.map((playlist) => (
								<div
									key={playlist.id}
									className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors"
									onClick={() => handleAddToPlaylist(playlist.id)}
								>
									{playlist.image ? (
										<img
											src={playlist.image}
											alt={playlist.name}
											className="w-12 h-12 rounded object-cover"
										/>
									) : (
										<div className="w-12 h-12 rounded bg-zinc-700 flex items-center justify-center">
											<Music className="w-6 h-6 text-zinc-400" />
										</div>
									)}
									<span className="text-white font-medium">{playlist.name}</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-zinc-400 text-center py-8">No playlists available</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
