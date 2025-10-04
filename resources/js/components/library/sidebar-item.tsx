import { Music } from "lucide-react"
import { router } from "@inertiajs/react"
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "../ui/context-menu"
import { Button } from "../ui/button"
import { Modals } from "@/hooks/useModals"

interface SidebarItemProps {
	id?: string
	title: string
	description: string
	image?: string
	href?: string
	isLikedSongs?: boolean
	isCollapsed?: boolean
	onClose?: () => void
	isMobile?: boolean
}

export const SidebarItem = ({
	id,
	title,
	description,
	image,
	href,
	isLikedSongs = false,
	isCollapsed = false,
	onClose,
	isMobile = false,
}: SidebarItemProps) => {
	const { setOpen: setConfirmationModalOpen } = Modals.useConfirmationModal()
	const { setOpen: setEditPlaylistDetailsModalOpen } =
		Modals.useEditPlaylistDetailsModal()

	const handleClick = () => {
		if (href) {
			router.visit(href)
		}
		onClose?.()
	}

	if (isCollapsed) {
		return (
			<div
				className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900 rounded-md p-1 active:bg-zinc-900"
				onClick={handleClick}
			>
				{isLikedSongs ? (
					<img
						src="/images/liked-songs.png"
						alt="Liked Songs"
						className="w-12 h-12 rounded-[4px]"
					/>
				) : image ? (
					<img
						src={image}
						alt={title}
						className="w-12 h-12 rounded-[4px] object-cover"
					/>
				) : (
					<div className="w-12 h-12 rounded-[4px] bg-zinc-800 flex items-center justify-center">
						<Music className="w-5 h-5" />
					</div>
				)}
			</div>
		)
	}

	// Mobile layout with buttons
	if (isMobile) {
		return (
			<div className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800 rounded-md p-1 active:bg-zinc-900">
				<div className="flex items-center gap-2 flex-1" onClick={handleClick}>
					{isLikedSongs ? (
						<img
							src="/images/liked-songs.png"
							alt="Liked Songs"
							className="w-12 h-12 rounded-[4px]"
						/>
					) : image ? (
						<img
							src={image}
							alt={title}
							className="w-12 h-12 rounded-[4px] object-cover"
						/>
					) : (
						<div className="w-12 h-12 rounded-[4px] bg-zinc-800 flex items-center justify-center">
							<Music className="w-5 h-5" />
						</div>
					)}

					<div className="flex flex-col gap-1">
						<span className="text-white text-sm font-medium leading-none">
							{title}
						</span>
						<span className="text-white/70 text-xs leading-none">
							Playlist &bull; 10 songs
						</span>
					</div>
				</div>

				{/* Action buttons for mobile */}
				{!isLikedSongs && (
					<div className="flex items-center gap-1">
						<Button
							variant="spotifyTransparent"
							size="icon"
							className="group w-8 h-8"
							onClick={(e) => {
								e.stopPropagation()
								setEditPlaylistDetailsModalOpen(true, {
									id: id ?? "",
									name: title,
									description: description,
									image: "",
									tracks: [],
								})
							}}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="w-4 h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M11.838.714a2.438 2.438 0 0 1 3.448 3.448l-9.841 9.841c-.358.358-.79.633-1.267.806l-3.173 1.146a.75.75 0 0 1-.96-.96l1.146-3.173c.173-.476.448-.909.806-1.267l9.84-9.84zm2.387 1.06a.94.94 0 0 0-1.327 0l-9.84 9.842a1.95 1.95 0 0 0-.456.716L2 14.002l1.669-.604a1.95 1.95 0 0 0 .716-.455l9.841-9.841a.94.94 0 0 0 0-1.327z"></path>
							</svg>
						</Button>

						<Button
							variant="spotifyTransparent"
							size="icon"
							className="group w-8 h-8"
							onClick={(e) => {
								e.stopPropagation()
								setConfirmationModalOpen(
									true,
									"Delete from Your Library?",
									`This will delete ${title} from Your Library.`,
									"Delete",
									() => {
										if (id) {
											router.delete(`/playlist/${id}`)
										}
									},
								)
							}}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="w-4 h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"></path>
								<path d="M12 8.75H4v-1.5h8z"></path>
							</svg>
						</Button>
					</div>
				)}
			</div>
		)
	}

	// Desktop layout with context menu
	return (
		<ContextMenu>
			<ContextMenuTrigger className="p-0 m-0">
				<div
					className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800 rounded-md p-1 active:bg-zinc-900"
					onClick={handleClick}
				>
					{isLikedSongs ? (
						<img
							src="/images/liked-songs.png"
							alt="Liked Songs"
							className="w-12 h-12 rounded-[4px]"
						/>
					) : image ? (
						<img
							src={image}
							alt={title}
							className="w-12 h-12 rounded-[4px] object-cover"
						/>
					) : (
						<div className="w-12 h-12 rounded-[4px] bg-zinc-800 flex items-center justify-center">
							<Music className="w-5 h-5" />
						</div>
					)}

					<div className="flex flex-col gap-1">
						<span className="text-white text-sm font-medium leading-none">
							{title}
						</span>
						<span className="text-white/70 text-xs leading-none">
							Playlist &bull; 10 songs
						</span>
					</div>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-60">
				<ContextMenuItem>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="gray"
						className="min-w-4 min-h-4"
					>
						<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"></path>
					</svg>
					<span>Play</span>
				</ContextMenuItem>

				{!isLikedSongs && (
					<>
						<ContextMenuSeparator />

						<ContextMenuItem
							onClick={() =>
								setEditPlaylistDetailsModalOpen(true, {
									id: id ?? "",
									name: title,
									description: description,
									image: "",
									tracks: [],
								})
							}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="w-4 h-4"
							>
								<path d="M11.838.714a2.438 2.438 0 0 1 3.448 3.448l-9.841 9.841c-.358.358-.79.633-1.267.806l-3.173 1.146a.75.75 0 0 1-.96-.96l1.146-3.173c.173-.476.448-.909.806-1.267l9.84-9.84zm2.387 1.06a.94.94 0 0 0-1.327 0l-9.84 9.842a1.95 1.95 0 0 0-.456.716L2 14.002l1.669-.604a1.95 1.95 0 0 0 .716-.455l9.841-9.841a.94.94 0 0 0 0-1.327z"></path>
							</svg>
							<span>Edit details</span>
						</ContextMenuItem>

						<ContextMenuItem
							onClick={() =>
								setConfirmationModalOpen(
									true,
									"Delete from Your Library?",
									`This will delete ${title} from Your Library.`,
									"Delete",
									() => {
										if (id) {
											router.delete(`/playlist/${id}`)
										}
									},
								)
							}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="w-4 h-4"
							>
								<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"></path>
								<path d="M12 8.75H4v-1.5h8z"></path>
							</svg>
							<span>Delete</span>
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	)
}
