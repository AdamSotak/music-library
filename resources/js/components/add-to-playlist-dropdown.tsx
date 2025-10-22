import { usePage, router } from "@inertiajs/react"
import { Music } from "lucide-react"
import type { InertiaPageProps } from "@/types"
import { useState, useMemo } from "react"
import { Button } from "./ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Modals } from "@/hooks/useModals"

interface AddToPlaylistDropdownProps {
	trackId: string
	children: React.ReactNode
}

export const AddToPlaylistDropdown = ({
	trackId,
	children,
}: AddToPlaylistDropdownProps) => {
	const { playlists } = usePage().props as unknown as InertiaPageProps
	const { setOpen: setCreatePlaylistOpen } =
		Modals.useEditPlaylistDetailsModal()
	const [searchQuery, setSearchQuery] = useState("")
	const [isOpen, setIsOpen] = useState(false)

	const filteredPlaylists = useMemo(() => {
		if (!searchQuery.trim()) return playlists
		return playlists.filter((playlist) =>
			playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	}, [playlists, searchQuery])

	const handleAddToPlaylist = (playlistId: number) => {
		router.post(
			`/playlist/${playlistId}/tracks`,
			{
				track_ids: [trackId],
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setIsOpen(false)
				},
			}
		)
	}

	const handleCreateNewPlaylist = () => {
		setIsOpen(false)
		setCreatePlaylistOpen(true, null)
	}

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="right"
				className="w-[232px] bg-[#282828] border-none text-white p-0 max-h-[384px] overflow-hidden flex flex-col rounded shadow-2xl"
			>
				{/* Title */}
				<div className="px-2 pt-1 pb-2">
					<h3 className="text-white font-normal text-[11px] px-2 py-1.5">Add to playlist</h3>
				</div>

				{/* Search Input */}
				<div className="px-2 pb-2">
					<div className="relative">
						<svg
							viewBox="0 0 16 16"
							fill="#a7a7a7"
							className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
						>
							<path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.304 12.18A6.75 6.75 0 0 1 .25 7z" />
						</svg>
						<input
							type="text"
							placeholder="Find a playlist"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full bg-[#3e3e3e] text-white text-[13px] placeholder-[#a7a7a7] pl-9 pr-3 py-1.5 rounded-sm focus:outline-none focus:ring-2 focus:ring-white/20"
						/>
					</div>
				</div>

				{/* New Playlist Button */}
				<div className="px-2 pb-1">
					<Button
						onClick={handleCreateNewPlaylist}
						className="w-full bg-transparent hover:bg-white/10 text-white text-[13px] justify-start border-0 rounded h-8 font-normal px-3 transition-colors"
					>
						<svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-3">
							<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75" />
						</svg>
						Create playlist
					</Button>
				</div>

				<DropdownMenuSeparator className="bg-[#ffffff1a] my-1 h-px" />

				{/* Playlists List */}
				<div className="overflow-y-auto flex-1 px-1 py-1">
					{filteredPlaylists && filteredPlaylists.length > 0 ? (
						<div className="space-y-0">
							{filteredPlaylists.map((playlist) => (
								<DropdownMenuItem
									key={playlist.id}
									onClick={() => handleAddToPlaylist(playlist.id)}
									className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-[#ffffff1a] cursor-pointer focus:bg-[#ffffff1a] data-[highlighted]:bg-[#ffffff1a]"
								>
									{playlist.image ? (
										<img
											src={playlist.image}
											alt={playlist.name}
											className="w-12 h-12 rounded object-cover flex-shrink-0"
										/>
									) : (
										<div className="w-12 h-12 rounded bg-[#282828] flex items-center justify-center flex-shrink-0 shadow-inner">
											<Music className="w-6 h-6 text-[#b3b3b3]" />
										</div>
									)}
									<div className="flex-1 min-w-0">
										<div className="text-white font-normal text-[14px] leading-5 truncate">
											{playlist.name}
										</div>
										<div className="text-[#b3b3b3] text-[12px] leading-4">
											Playlist • {playlist.tracks?.length || 0} songs
										</div>
									</div>
								</DropdownMenuItem>
							))}
						</div>
					) : (
						<p className="text-[#b3b3b3] text-center py-6 text-[13px]">
							{searchQuery ? "No playlists found" : "No playlists available"}
						</p>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
