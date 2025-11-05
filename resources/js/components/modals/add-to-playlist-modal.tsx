import { Modals } from "@/hooks/useModals"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { usePage, router } from "@inertiajs/react"
import { Music } from "lucide-react"
import type { InertiaPageProps } from "@/types"
import { useState, useMemo } from "react"
import { Button } from "../ui/button"

export const AddToPlaylistModal = () => {
	const { open, trackIds, setOpen } = Modals.useAddToPlaylistModal()
	const { playlists, user } = usePage().props as unknown as InertiaPageProps
	const { setOpen: setCreatePlaylistOpen } =
		Modals.useEditPlaylistDetailsModal()
	const [searchQuery, setSearchQuery] = useState("")

	const filteredPlaylists = useMemo(() => {
		if (!searchQuery.trim()) return playlists
		return playlists.filter((playlist) =>
			playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
		)
	}, [playlists, searchQuery])

	const handleAddToPlaylist = (playlistId: number) => {
		router.post(
			`/playlist/${playlistId}/tracks`,
			{
				track_ids: trackIds,
			},
			{
				onSuccess: () => {
					setOpen(false)
				},
			},
		)
	}

	const handleCreateNewPlaylist = () => {
		if (user?.isGuest) {
			alert('Guest users cannot create playlists. Please create an account to save playlists.')
			return
		}
		setOpen(false)
		setCreatePlaylistOpen(true, null)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="bg-[#282828] border-none max-h-[70vh] overflow-hidden flex flex-col p-0 max-w-md">
				<DialogHeader className="px-6 pt-6 pb-2">
					<DialogTitle className="text-white text-2xl font-bold">
						Add to playlist
					</DialogTitle>
				</DialogHeader>

				{/* Search Input */}
				<div className="px-6 pb-2">
					<div className="relative">
						<svg
							viewBox="0 0 16 16"
							fill="#b3b3b3"
							className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
						>
							<path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.304 12.18A6.75 6.75 0 0 1 .25 7z" />
						</svg>
						<input
							type="text"
							placeholder="Find a playlist"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full bg-[#3e3e3e] text-white placeholder-[#b3b3b3] pl-10 pr-4 py-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
						/>
					</div>
				</div>

				{/* New Playlist Button */}
				{!user?.isGuest && (
					<div className="px-6 pb-2">
						<Button
							onClick={handleCreateNewPlaylist}
							className="w-full bg-transparent hover:bg-white/10 text-white border border-zinc-600 hover:border-white rounded-full h-10 font-bold text-sm transition-all"
						>
							<svg
								viewBox="0 0 16 16"
								fill="currentColor"
								className="w-4 h-4 mr-2"
							>
								<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75" />
							</svg>
							New playlist
						</Button>
					</div>
				)}

				{user?.isGuest && (
					<div className="px-6 pb-2">
						<div className="text-zinc-400 text-sm text-center py-3 border border-zinc-600 rounded-full">
							<span>Guest users cannot create playlists</span>
						</div>
					</div>
				)}

				{/* Playlists List */}
				<div className="flex-1 overflow-y-auto px-2">
					{filteredPlaylists && filteredPlaylists.length > 0 ? (
						<div className="space-y-1 pb-4">
							{filteredPlaylists.map((playlist) => (
								<div
									key={playlist.id}
									className="flex items-center gap-3 p-2 px-4 rounded hover:bg-[#3e3e3e] cursor-pointer transition-colors group"
									onClick={() => handleAddToPlaylist(playlist.id)}
								>
									{playlist.image ? (
										<img
											src={playlist.image}
											alt={playlist.name}
											className="w-12 h-12 rounded object-cover flex-shrink-0"
										/>
									) : (
										<div className="w-12 h-12 rounded bg-[#3e3e3e] flex items-center justify-center flex-shrink-0">
											<Music className="w-6 h-6 text-[#b3b3b3]" />
										</div>
									)}
									<div className="flex-1 min-w-0">
										<div className="text-white font-medium text-base truncate">
											{playlist.name}
										</div>
										<div className="text-[#b3b3b3] text-sm">
											Playlist • {playlist.tracks?.length || 0} songs
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-[#b3b3b3] text-center py-8 text-sm">
							{searchQuery ? "No playlists found" : "No playlists available"}
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
