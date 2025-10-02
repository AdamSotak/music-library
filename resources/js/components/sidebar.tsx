import { SidebarItem } from "./library/sidebar-item"
import { Button } from "./ui/button"
import { usePage } from '@inertiajs/react'
import { Modals } from "@/hooks/useModals"

interface SidebarProps {
	isExpanded: boolean
	setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>
	isMobile?: boolean
	onClose?: () => void
}

interface Playlist {
	id: number
	name: string
	image: string
	description: string
}

export default function Sidebar({
	isExpanded,
	setIsExpanded,
	isMobile = false,
	onClose,
}: SidebarProps) {
	const { playlists } = usePage().props as { playlists: Playlist[] }
	const { setOpen: setEditPlaylistDetailsModalOpen } = Modals.useEditPlaylistDetailsModal()

	// On mobile, always show expanded version
	const shouldShowExpanded = isMobile || isExpanded

	if (!shouldShowExpanded && !isMobile) {
		return (
			<div className="flex flex-col justify-center items-center gap-2 py-4">
				<Button
					variant="spotifyTransparent"
					size="icon"
					className="group"
					onClick={() => setIsExpanded(true)}
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="gray"
						className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M14.457 15.207a1 1 0 0 1-1.414-1.414L14.836 12l-1.793-1.793a1 1 0 0 1 1.414-1.414l2.5 2.5a1 1 0 0 1 0 1.414z"></path>
						<path d="M20 22a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zM4 20V4h4v16zm16 0H10V4h10z"></path>
					</svg>
				</Button>

				<Button
					variant="spotifyTransparent"
					size="icon"
					className="group bg-zinc-800 w-8 h-8"
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="gray"
						className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
					</svg>
				</Button>

				<div className="mt-2">
					{playlists.slice(0, 5).map((playlist) => (
						<SidebarItem
							key={playlist.id}
							id={String(playlist.id)}
							title={playlist.name}
							image={playlist.image}
							href={`/playlist/${playlist.id}`}
							isCollapsed
						/>
					))}
					<SidebarItem title="Liked Songs" isLikedSongs isCollapsed />
				</div>
			</div>
		)
	}

	return (
		<div className="h-full flex flex-col">
			<div className="flex justify-between items-center p-4">
				<div className="flex items-center gap-2 group/header cursor-pointer">
					{isMobile ? (
						// Mobile close button
						<Button
							variant="spotifyTransparent"
							size="icon"
							className="group w-4 h-4"
							onClick={onClose}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06z"></path>
							</svg>
						</Button>
					) : (
						// Desktop collapse button with connected slide animation
						<Button
							variant="spotifyTransparent"
							size="icon"
							className="group w-4 h-4 transition-all duration-200 ease-out -translate-x-3 opacity-0 group-hover/header:translate-x-0 group-hover/header:opacity-100"
							onClick={() => setIsExpanded((prev) => !prev)}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="gray"
								className="min-w-4 min-h-4 transition-colors duration-200 group-hover:fill-white rotate-180"
							>
								<path d="M14.457 15.207a1 1 0 0 1-1.414-1.414L14.836 12l-1.793-1.793a1 1 0 0 1 1.414-1.414l2.5 2.5a1 1 0 0 1 0 1.414z"></path>
								<path d="M20 22a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zM4 20V4h4v16zm16 0H10V4h10z"></path>
							</svg>
						</Button>
					)}
					<span className="text-white text-md font-bold transition-transform duration-200 ease-out -translate-x-6 group-hover/header:translate-x-0">
						Your Library
					</span>
				</div>
				<Button
					variant="spotifyTransparent"
					size="icon"
					className="group bg-zinc-800 w-8 h-8"
					onClick={() => setEditPlaylistDetailsModalOpen(true, null)}
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="gray"
						className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
					</svg>
				</Button>
			</div>

			<div className="flex flex-col gap-0 px-2 flex-1 overflow-y-auto">
				{playlists.map((playlist) => (
					<SidebarItem
						key={playlist.id}
						id={String(playlist.id)}
						title={playlist.name}
						image={playlist.image}
						href={`/playlist/${playlist.id}`}
						onClose={isMobile ? onClose : undefined}
						isMobile={isMobile}
					/>
				))}
				<SidebarItem
					title="Liked Songs"
					isLikedSongs
					onClose={isMobile ? onClose : undefined}
					isMobile={isMobile}
				/>
			</div>
		</div>
	)
}
