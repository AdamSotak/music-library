import { SidebarItem } from "./library/sidebar-item"
import { Button } from "./ui/button"
import { router, usePage } from "@inertiajs/react"
import { Modals } from "@/hooks/useModals"
import type { InertiaPageProps, Playlist } from "@/types"
import { useState, useMemo } from "react"
import { useUiLayout } from "@/hooks/useUiLayout"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Maximize2, Menu, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
	sidebarSize: "collapsed" | "default" | "expanded"
	setSidebarSize: React.Dispatch<
		React.SetStateAction<"collapsed" | "default" | "expanded">
	>
	isMobile?: boolean
	onClose?: () => void
}

type FilterTab = "playlists" | "artists" | "albums"
type SortOption = "recents" | "recently_added" | "alphabetical" | "creator"
type ViewOption = "compact" | "list" | "grid" | "large-grid"

export default function Sidebar({
	sidebarSize,
	setSidebarSize,
	isMobile = false,
	onClose,
}: SidebarProps) {
	const { playlists, savedAlbums, followedArtists, user } = usePage()
		.props as unknown as InertiaPageProps
	const { setOpen: setEditPlaylistDetailsModalOpen } =
		Modals.useEditPlaylistDetailsModal()
	const { openRightSidebar } = useUiLayout()

	const [activeTab, setActiveTab] = useState<FilterTab>("playlists")
	const [sortBy, setSortBy] = useState<SortOption>("recents")
	const [viewAs, setViewAs] = useState<ViewOption>("list")

	const isCollapsed = sidebarSize === "collapsed"
	const isExpanded = sidebarSize === "expanded"
	const getDateValue = (value?: string | null) =>
		value ? new Date(value).getTime() : 0

	const sortedPlaylists = useMemo(() => {
		const items = [...playlists]

		const sortPlaylists = (
			customSort: (a: Playlist, b: Playlist) => number,
		) => {
			return items.sort((a, b) => {
				if (a.is_default && !b.is_default) return -1
				if (!a.is_default && b.is_default) return 1
				return customSort(a, b)
			})
		}

		switch (sortBy) {
			case "recents":
				return sortPlaylists(
					(a, b) =>
						getDateValue(b.updated_at || b.created_at) -
						getDateValue(a.updated_at || a.created_at),
				)
			case "recently_added":
				return sortPlaylists(
					(a, b) => getDateValue(b.created_at) - getDateValue(a.created_at),
				)
			case "alphabetical":
				return sortPlaylists((a, b) => a.name.localeCompare(b.name))
			case "creator":
				return sortPlaylists((a, b) =>
					(a.owner_name || a.description || a.name).localeCompare(
						b.owner_name || b.description || b.name,
					),
				)
			default:
				return items
		}
	}, [playlists, sortBy])

	const sortedArtists = useMemo(() => {
		const items = [...followedArtists]
		switch (sortBy) {
			case "alphabetical":
			case "creator":
				return items.sort((a, b) => a.name.localeCompare(b.name))
			case "recents":
			case "recently_added":
				return items.sort(
					(a, b) => getDateValue(b.followed_at) - getDateValue(a.followed_at),
				)
			default:
				return items
		}
	}, [followedArtists, sortBy])

	const sortedAlbums = useMemo(() => {
		const items = [...savedAlbums]
		switch (sortBy) {
			case "alphabetical":
				return items.sort((a, b) => a.name.localeCompare(b.name))
			case "creator":
				return items.sort((a, b) => a.artist.localeCompare(b.artist))
			case "recents":
			case "recently_added":
				return items.sort(
					(a, b) => getDateValue(b.saved_at) - getDateValue(a.saved_at),
				)
			default:
				return items
		}
	}, [savedAlbums, sortBy])

	// On mobile, always show expanded version
	const shouldShowExpanded = isMobile || !isCollapsed

	if (!shouldShowExpanded && !isMobile) {
		return (
			<div className="flex flex-col justify-center items-center gap-2 py-4">
				<Button
					variant="spotifyTransparent"
					size="icon"
					className="group"
					onClick={() => setSidebarSize("default")}
					title="Open Your Library"
				>
					<svg
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-5 w-5 text-[#b3b3b3] transition-colors duration-300 group-hover:text-white transform scale-x-[-1]"
						aria-hidden="true"
					>
						<path d="M10.97 5.47a.75.75 0 1 1 1.06 1.06L10.56 8l1.47 1.47a.75.75 0 1 1-1.06 1.06l-2-2a.75.75 0 0 1 0-1.06z"></path>
						<path d="M1 0a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm.5 1.5H5v13H1.5zm13 13h-8v-13h8z"></path>
					</svg>
				</Button>

				<div className="mt-2">
					{playlists.slice(0, 5).map((playlist) => (
						<SidebarItem
							key={playlist.id}
							id={String(playlist.id)}
							title={playlist.name}
							tracks={playlist.tracks}
							description={playlist.description}
							image={playlist.image}
							href={`/playlist/${playlist.id}`}
							isCollapsed
							isLikedSongs={playlist.is_default}
						/>
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="h-full flex flex-col bg-[#121212]">
			<div className="flex justify-between items-center px-4 py-2">
				<div className="flex items-center gap-3">
					{/* Collapse to rail (show only in default/expanded) */}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-[#b3b3b3] hover:text-white hover:bg-transparent"
						onClick={() => setSidebarSize("collapsed")}
						title="Collapse Your Library"
					>
						<svg
							data-encore-id="icon"
							role="img"
							aria-hidden="true"
							viewBox="0 0 16 16"
							className="h-4 w-4"
							fill="currentColor"
						>
							<path d="M10.97 5.47a.75.75 0 1 1 1.06 1.06L10.56 8l1.47 1.47a.75.75 0 1 1-1.06 1.06l-2-2a.75.75 0 0 1 0-1.06z"></path>
							<path d="M1 0a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm.5 1.5H5v13H1.5zm13 13h-8v-13h8z"></path>
						</svg>
					</Button>
					<span className="text-[#b3b3b3] text-base font-bold hover:text-white transition-colors cursor-pointer">
						Your Library
					</span>
				</div>
				<div className="flex items-center gap-1">
					{user && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="group h-8 px-2 gap-1.5 text-[#b3b3b3] hover:text-white hover:bg-transparent hover:scale-105 transition-all"
								>
									<svg
										viewBox="0 0 16 16"
										fill="currentColor"
										className="w-4 h-4"
									>
										<path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
									</svg>
									<span className="text-sm">Create</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								className="w-56 bg-[#282828] border-none text-white p-1"
							>
								<DropdownMenuItem
									onClick={() => setEditPlaylistDetailsModalOpen(true, null)}
									className="flex items-center gap-3 px-3 py-3 hover:bg-[#3e3e3e] cursor-pointer rounded"
								>
									<svg
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-6 h-6"
									>
										<path d="M15 4H9v8H1v12h6v-6h6v6h6V12h-4V4zm-2 10H11v-2h2v2z" />
									</svg>
									<div className="flex-1">
										<div className="text-white font-medium text-base">
											Playlist
										</div>
										<div className="text-[#a7a7a7] text-sm">
											Create a playlist with songs or episodes
										</div>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center gap-3 px-3 py-3 hover:bg-[#3e3e3e] cursor-pointer rounded opacity-50"
									disabled
								>
									<svg
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-6 h-6"
									>
										<circle cx="12" cy="12" r="10" opacity="0.3" />
										<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
									</svg>
									<div className="flex-1">
										<div className="text-white font-medium text-base">
											Blend
										</div>
										<div className="text-[#a7a7a7] text-sm">
											Combine your friends' tastes into a playlist
										</div>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center gap-3 px-3 py-3 hover:bg-[#3e3e3e] cursor-pointer rounded"
									onClick={() => setTimeout(() => openRightSidebar(), 100)}
								>
									<svg
										viewBox="0 0 24 24"
										className="w-6 h-6 text-white"
										xmlns="http://www.w3.org/2000/svg"
									>
										<circle cx="12" cy="12" r="8" fill="#333" />
										<path
											d="M9.2 14.2a3.5 3.5 0 0 1 5.6 0"
											fill="none"
											stroke="white"
											strokeWidth="1.4"
											strokeLinecap="round"
										/>
										<path
											d="M8 12a5 5 0 0 1 8 0"
											fill="none"
											stroke="white"
											strokeWidth="1.4"
											strokeLinecap="round"
											opacity="0.7"
										/>
										<path
											d="M7 10a6.5 6.5 0 0 1 10 0"
											fill="none"
											stroke="white"
											strokeWidth="1.2"
											strokeLinecap="round"
											opacity="0.4"
										/>
										<circle cx="12" cy="15" r="1.2" fill="white" />
									</svg>
									<div className="flex-1">
										<div className="text-white font-medium text-base">Jam</div>
										<div className="text-[#a7a7a7] text-sm">
											Listen together, anywhere
										</div>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center gap-3 px-3 py-3 hover:bg-[#3e3e3e] cursor-pointer rounded opacity-50"
									disabled
								>
									<svg
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-6 h-6"
									>
										<path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
									</svg>
									<div className="flex-1">
										<div className="text-white font-medium text-base">
											Folder
										</div>
										<div className="text-[#a7a7a7] text-sm">
											Organise your playlists
										</div>
									</div>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					{/* Full-screen toggle */}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-[#b3b3b3] hover:text-white hover:bg-transparent hover:scale-105 transition-all"
						onClick={() =>
							setSidebarSize((prev) =>
								prev === "expanded" ? "default" : "expanded",
							)
						}
						title={isExpanded ? "Shrink Your Library" : "Expand Your Library"}
					>
						{isExpanded ? (
							<Minimize2 className="h-4 w-4" />
						) : (
							<Maximize2 className="h-4 w-4" />
						)}
					</Button>
					{/* Only fullscreen toggle on the right */}
				</div>
			</div>

			{/* Tabs: Playlists, Artists, Albums */}
			<div className="flex gap-2 px-2 py-1">
				<Button
					variant="ghost"
					size="sm"
					className={`text-sm rounded-full px-3 h-8 font-normal transition-all ${activeTab === "playlists"
							? "bg-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
							: "bg-transparent text-[#b3b3b3] hover:bg-[#1a1a1a]"
						}`}
					onClick={() => setActiveTab("playlists")}
				>
					Playlists
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className={`text-sm rounded-full px-3 h-8 font-normal transition-all ${activeTab === "artists"
							? "bg-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
							: "bg-transparent text-[#b3b3b3] hover:bg-[#1a1a1a]"
						}`}
					onClick={() => setActiveTab("artists")}
				>
					Artists
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className={`text-sm rounded-full px-3 h-8 font-normal transition-all ${activeTab === "albums"
							? "bg-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
							: "bg-transparent text-[#b3b3b3] hover:bg-[#1a1a1a]"
						}`}
					onClick={() => setActiveTab("albums")}
				>
					Albums
				</Button>
			</div>

			{/* Sort and View Controls */}
			<div className="flex justify-between items-center px-3 py-2">
				{/* Search Icon */}
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-[#b3b3b3] hover:text-white hover:bg-transparent"
				>
					<svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
						<path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.304 12.18A6.75 6.75 0 0 1 .25 7z"></path>
					</svg>
				</Button>

				{/* Sort By Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-sm text-[#b3b3b3] hover:text-white px-2 gap-2 hover:bg-transparent cursor-pointer"
						>
							{sortBy === "recents" && "Recents"}
							{sortBy === "recently_added" && "Recently Added"}
							{sortBy === "alphabetical" && "Alphabetical"}
							{sortBy === "creator" && "Creator"}
							<Menu className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-48 bg-[#282828] border-none text-white"
					>
						<DropdownMenuLabel className="text-xs text-[#a7a7a7] px-3 py-2">
							Sort by
						</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => setSortBy("recents")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<span>Recents</span>
							{sortBy === "recents" && <Menu className="w-4 h-4" />}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setSortBy("recently_added")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<span>Recently Added</span>
							{sortBy === "recently_added" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setSortBy("alphabetical")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<span>Alphabetical</span>
							{sortBy === "alphabetical" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setSortBy("creator")}
							className={`flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer ${activeTab !== "playlists" ? "opacity-60 cursor-not-allowed" : ""
								}`}
							disabled={activeTab !== "playlists"}
						>
							<span>Creator</span>
							{sortBy === "creator" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
						<DropdownMenuSeparator className="bg-[#3e3e3e]" />
						<DropdownMenuLabel className="text-xs text-[#a7a7a7] px-3 py-2">
							View as
						</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => setViewAs("compact")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path d="M0 1.75A.75.75 0 0 1 .75 1h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 1.75zm0 6A.75.75 0 0 1 .75 7h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 7.75zm0 6a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75z"></path>
								</svg>
								<span>Compact list</span>
							</div>
							{viewAs === "compact" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setViewAs("list")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path d="M15 14.5H5V13h10v1.5zm0-5.75H5v-1.5h10v1.5zM15 3H5V1.5h10V3zM3 3H1V1.5h2V3zm0 11.5H1V13h2v1.5zm0-5.75H1v-1.5h2v1.5z"></path>
								</svg>
								<span>List</span>
							</div>
							{viewAs === "list" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setViewAs("grid")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path d="M0 0h6v6H0zm0 10h6v6H0zm10 0h6v6h-6zm0-10h6v6h-6z"></path>
								</svg>
								<span>Grid</span>
							</div>
							{viewAs === "grid" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setViewAs("large-grid")}
							className="flex justify-between px-3 py-2 hover:bg-[#3e3e3e] cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4"
								>
									<path d="M1.5 1.5h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm8 0h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zm0 8h5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V10.5a1 1 0 0 1 1-1zm-8 0h5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V10.5a1 1 0 0 1 1-1z"></path>
								</svg>
								<span>Large grid</span>
							</div>
							{viewAs === "large-grid" && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 16 16"
									fill="currentColor"
									className="w-4 h-4 text-green-500"
								>
									<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0"></path>
								</svg>
							)}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Content Area */}
			{(() => {
				const gridStyle = (() => {
					if (viewAs === "grid") {
						return {
							gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarSize === "expanded" ? 160 : 140}px, 1fr))`,
						} as React.CSSProperties
					}
					if (viewAs === "large-grid") {
						return {
							gridTemplateColumns: `repeat(auto-fill, minmax(${sidebarSize === "expanded" ? 200 : 180}px, 1fr))`,
						} as React.CSSProperties
					}
					return undefined
				})()

				if (!user) {
					return (
						<div className="flex flex-col items-center justify-center h-64 text-[#b3b3b3] text-center">
							<p className="text-xl font-bold">Your library</p>
							<p className="text-xs mt-1">
								Login to create playlists and save your favorite songs
							</p>
							<Button
								variant="default"
								className="group rounded-full w-20 cursor-pointer mt-4"
								onClick={() => router.visit("/login")}
							>
								Login
							</Button>
						</div>
					)
				}

				return (
					<div
						className={cn(
							"flex-1 overflow-y-auto",
							viewAs === "compact" || viewAs === "list"
								? "flex flex-col"
								: "grid",
							viewAs === "compact"
								? "gap-0 px-1"
								: viewAs === "list"
									? "gap-1.5 px-2"
									: viewAs === "grid"
										? "gap-2 px-2 pt-2"
										: "gap-3 px-2 pt-2",
						)}
						style={gridStyle}
					>
						{activeTab === "playlists" &&
							sortedPlaylists.map((playlist) => (
								<SidebarItem
									key={playlist.id}
									id={String(playlist.id)}
									title={playlist.name}
									tracks={playlist.tracks}
									description={
										playlist.description ||
										`Playlist • ${playlist.tracks.length} ${playlist.tracks.length === 1 ? "song" : "songs"
										}`
									}
									image={playlist.image}
									href={`/playlist/${playlist.id}`}
									onClose={isMobile ? onClose : undefined}
									isMobile={isMobile}
									isLikedSongs={playlist.is_default}
									viewMode={viewAs}
									type="playlist"
								/>
							))}

						{activeTab === "artists" &&
							(sortedArtists.length > 0 ? (
								sortedArtists.map((artist) => (
									<SidebarItem
										key={artist.id}
										id={String(artist.id)}
										title={artist.name}
										description="Artist"
										image={artist.image}
										href={`/artist/${artist.id}`}
										onClose={isMobile ? onClose : undefined}
										isMobile={isMobile}
										viewMode={viewAs}
										type="artist"
									/>
								))
							) : (
								<div className="flex flex-col items-center justify-center h-64 text-[#b3b3b3]">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-16 h-16 mb-4 opacity-50"
									>
										<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
									</svg>
									<p className="text-sm font-medium">No artists yet</p>
									<p className="text-xs mt-1">
										Follow artists to see them here
									</p>
								</div>
							))}

						{activeTab === "albums" &&
							(sortedAlbums.length > 0 ? (
								sortedAlbums.map((album) => (
									<SidebarItem
										key={album.id}
										id={String(album.id)}
										title={album.name}
										description={`Album • ${album.artist}`}
										image={album.cover}
										href={`/albums/${album.id}`}
										onClose={isMobile ? onClose : undefined}
										isMobile={isMobile}
										viewMode={viewAs}
										type="album"
									/>
								))
							) : (
								<div className="flex flex-col items-center justify-center h-64 text-[#b3b3b3]">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="w-16 h-16 mb-4 opacity-50"
									>
										<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"></path>
									</svg>
									<p className="text-sm font-medium">No albums yet</p>
									<p className="text-xs mt-1">Save albums to see them here</p>
								</div>
							))}
					</div>
				)
			})()}
		</div>
	)
}
