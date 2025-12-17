import { Music, Users } from "lucide-react"
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
import type { Track } from "@/types"
import { cn } from "@/lib/utils"

interface SidebarItemProps {
	id?: string
	title: string
	description: string | null
	image?: string
	href?: string
	isLikedSongs?: boolean
	isShared?: boolean
	isCollapsed?: boolean
	onClose?: () => void
	isMobile?: boolean
	tracks?: Track[]
	viewMode?: "list" | "compact" | "grid" | "large-grid"
	type?: "playlist" | "artist" | "album"
}

export const SidebarItem = ({
	id,
	title,
	description,
	image,
	tracks,
	href,
	isLikedSongs = false,
	isShared = false,
	isCollapsed = false,
	onClose,
	isMobile = false,
	viewMode = "list",
	type = "playlist",
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

	const trackCount = tracks?.length ?? 0
	const subtitle =
		type === "playlist"
			? description?.trim()
				? description
				: `Playlist • ${trackCount} ${trackCount === 1 ? "song" : "songs"}`
			: description
	const _typeLabel =
		isLikedSongs || type === "playlist"
			? "Playlist"
			: type === "artist"
				? "Artist"
				: "Album"
	const compactSubtitle =
		type === "playlist" ? "Playlist" : type === "artist" ? "Artist" : "Album"
	const showPlaylistActions = type === "playlist" && !isLikedSongs

	if (isCollapsed) {
		return (
			<div
				className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900 rounded-md p-1 active:bg-zinc-900"
				onClick={handleClick}
			>
				{isLikedSongs ? (
					<img
						src="/images/liked-songs.jpg"
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
							src="/images/liked-songs.jpg"
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
						<span className="text-white/70 text-xs leading-none line-clamp-1">
							{subtitle}
						</span>
					</div>
				</div>

				{/* Action buttons for mobile */}
				{type === "playlist" && !isLikedSongs && (
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
									description: description ?? "",
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

	// Grid view layout (standard & large)
	if (viewMode === "grid" || viewMode === "large-grid") {
		const isLargeGrid = viewMode === "large-grid"
		const cardPadding = isLargeGrid ? "p-3" : "p-1.5"
		const imageWrapperClasses = isLargeGrid
			? "w-full aspect-square rounded-lg object-cover"
			: "w-full aspect-square rounded-md object-cover"
		const fallbackWrapperClasses = isLargeGrid
			? "w-full aspect-square rounded-lg bg-zinc-800 flex items-center justify-center"
			: "w-full aspect-square rounded-md bg-zinc-800 flex items-center justify-center"
		const titleClasses = isLargeGrid
			? "text-white text-[15px] font-semibold leading-tight line-clamp-1"
			: "text-white text-sm font-medium leading-tight line-clamp-1"
		const subtitleClasses = isLargeGrid
			? "text-white/70 text-[13px] leading-tight line-clamp-2"
			: "text-white/70 text-xs leading-tight line-clamp-2"

		return (
			<ContextMenu>
				<ContextMenuTrigger className="p-0 m-0">
					<div
						className={cn(
							"flex flex-col gap-2 cursor-pointer hover:bg-zinc-800 active:bg-zinc-900 group",
							cardPadding,
							isLargeGrid ? "rounded-lg" : "rounded-md",
						)}
						onClick={handleClick}
					>
						{isLikedSongs ? (
							<img
								src="/images/liked-songs.jpg"
								alt="Liked Songs"
								className={imageWrapperClasses}
							/>
						) : image ? (
							<img src={image} alt={title} className={imageWrapperClasses} />
						) : (
							<div className={fallbackWrapperClasses}>
								<Music className={isLargeGrid ? "w-10 h-10" : "w-8 h-8"} />
							</div>
						)}

						<div className="flex flex-col gap-0.5">
							<span className={titleClasses}>{title}</span>
							{subtitle && <span className={subtitleClasses}>{subtitle}</span>}
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

					{showPlaylistActions && (
						<>
							<ContextMenuSeparator />

							<ContextMenuItem
								onClick={() =>
									setEditPlaylistDetailsModalOpen(true, {
										id: id ?? "",
										name: title,
										description: description ?? "",
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

	// Desktop layout with context menu
	const isCompactView = viewMode === "compact"
	const showImage = !isCompactView
	const imageSize =
		viewMode === "list"
			? "w-14 h-14"
			: isCompactView
				? "w-10 h-10"
				: "w-12 h-12"
	const padding =
		viewMode === "list" ? "px-2 py-2" : isCompactView ? "px-2 py-1" : "p-1.5"
	const titleClasses = isCompactView
		? "text-white text-[13px] font-medium leading-tight"
		: "text-white text-sm font-medium leading-none"
	const subtitleClasses = isCompactView
		? "text-[11px] text-white/60 leading-tight"
		: "text-white/70 text-xs leading-none"
	const secondaryText = isCompactView ? compactSubtitle : subtitle
	const infoGap = isCompactView ? "gap-0.5" : "gap-1"

	return (
		<ContextMenu>
			<ContextMenuTrigger className="p-0 m-0">
				<div
					className={`flex items-center ${isCompactView ? "gap-1.5" : "gap-2"} cursor-pointer hover:bg-zinc-800 rounded-md ${padding} active:bg-zinc-900`}
					onClick={handleClick}
				>
					{showImage && isLikedSongs ? (
						<img
							src="/images/liked-songs.jpg"
							alt="Liked Songs"
							className={`${imageSize} rounded-[4px]`}
						/>
					) : showImage && image ? (
						<div className="relative">
							<img
								src={image}
								alt={title}
								className={`${imageSize} rounded-[4px] object-cover`}
							/>
							{isShared && (
								<div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
									<Users className="w-2.5 h-2.5 text-black" />
								</div>
							)}
						</div>
					) : showImage ? (
						<div
							className={`${imageSize} rounded-[4px] bg-zinc-800 flex items-center justify-center relative`}
						>
							<Music className="w-5 h-5" />
							{isShared && (
								<div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
									<Users className="w-2.5 h-2.5 text-black" />
								</div>
							)}
						</div>
					) : null}

					<div className={`flex flex-col ${infoGap}`}>
						<span className={titleClasses}>{title}</span>
						{secondaryText && (
							<span className={subtitleClasses}>{secondaryText}</span>
						)}
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

				{showPlaylistActions && (
					<>
						<ContextMenuSeparator />

						<ContextMenuItem
							onClick={() =>
								setEditPlaylistDetailsModalOpen(true, {
									id: id ?? "",
									name: title,
									description: description ?? "",
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
