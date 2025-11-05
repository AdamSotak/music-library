import { usePage, router } from "@inertiajs/react"
import { Music } from "lucide-react"
import type { InertiaPageProps } from "@/types"
import { useState, useMemo, useEffect, type ReactNode } from "react"
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
	children: ReactNode | ((state: { isOpen: boolean }) => ReactNode)
}

export const AddToPlaylistDropdown = ({
	trackId,
	children,
}: AddToPlaylistDropdownProps) => {
	const { playlists, user } = usePage().props as unknown as InertiaPageProps
	const { setOpen: setCreatePlaylistOpen } =
		Modals.useEditPlaylistDetailsModal()
	const [searchQuery, setSearchQuery] = useState("")
	const [isOpen, setIsOpen] = useState(false)
	const renderTrigger =
		typeof children === "function"
			? (children as (state: { isOpen: boolean }) => ReactNode)({
					isOpen,
				})
			: children
	const membershipLookup = useMemo(() => {
		const next = new Set<string>()
		playlists.forEach((playlist) => {
			if (
				playlist.tracks?.some((track) => String(track.id) === String(trackId))
			) {
				next.add(String(playlist.id))
			}
		})
		return next
	}, [playlists, trackId])
	const [memberships, setMemberships] = useState<Set<string>>(
		new Set(membershipLookup),
	)

	useEffect(() => {
		setMemberships(new Set(membershipLookup))
	}, [membershipLookup])

	const filteredPlaylists = useMemo(() => {
		if (!searchQuery.trim()) return playlists
		return playlists.filter((playlist) =>
			playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
		)
	}, [playlists, searchQuery])

	const handleTogglePlaylist = (playlistId: string, isMember: boolean) => {
		if (isMember) {
			router.delete(`/playlist/${playlistId}/tracks/${trackId}`, {
				preserveScroll: true,
				onSuccess: () => {
					setMemberships((prev) => {
						const next = new Set(prev)
						next.delete(playlistId)
						return next
					})
				},
			})
			return
		}

		router.post(
			`/playlist/${playlistId}/tracks`,
			{
				track_ids: [trackId],
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setMemberships((prev) => {
						const next = new Set(prev)
						next.add(playlistId)
						return next
					})
				},
			},
		)
	}

	const handleCreateNewPlaylist = () => {
		if (user?.isGuest) {
			alert('Guest users cannot create playlists. Please create an account to save playlists.')
			return
		}
		setIsOpen(false)
		setCreatePlaylistOpen(true, null)
	}

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
			<DropdownMenuTrigger asChild>
				<span onClick={(e) => e.stopPropagation()}>{renderTrigger}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="right"
				sideOffset={4}
				alignOffset={-4}
				className="w-[232px] bg-[#282828] border-none text-white p-0 max-h-[384px] overflow-hidden flex flex-col rounded shadow-2xl"
			>
				{/* Title */}
				<div className="px-2 pt-1 pb-2">
					<h3 className="text-white font-normal text-[11px] px-2 py-1.5">
						Add to playlist
					</h3>
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
						disabled={user?.isGuest}
						className="w-full bg-transparent hover:bg-white/10 text-white text-[13px] justify-start border-0 rounded h-8 font-normal px-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title={user?.isGuest ? "Guest users cannot create playlists" : "Create playlist"}
					>
						<svg
							viewBox="0 0 16 16"
							fill="currentColor"
							className="w-4 h-4 mr-3"
						>
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
							{filteredPlaylists.map((playlist) => {
								const playlistId = String(playlist.id)
								const isMember = memberships.has(playlistId)

								return (
									<DropdownMenuItem
										key={playlist.id}
										onSelect={(event) => {
											event.preventDefault()
											handleTogglePlaylist(playlistId, isMember)
										}}
										className={`flex items-center gap-3 px-2 py-2 rounded-sm cursor-pointer focus:bg-white/10 data-[highlighted]:bg-white/10 ${
											isMember
												? "bg-white/10 hover:bg-white/10"
												: "hover:bg-white/10"
										}`}
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
										<div className="flex-shrink-0">
											{isMember ? (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 16 16"
													fill="#1ed760"
													className="w-4 h-4"
												>
													<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
												</svg>
											) : (
												<div className="w-4 h-4 rounded-full border border-white/40" />
											)}
										</div>
									</DropdownMenuItem>
								)
							})}
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
