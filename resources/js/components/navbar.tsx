import { Button, buttonVariants } from "./ui/button"
import { router } from "@inertiajs/react"
import { cn } from "@/lib/utils"
import { Separator } from "./ui/separator"
import { useState, useEffect, useRef, useCallback } from "react"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu"

interface NavbarProps {
	onMobileMenuToggle?: () => void
}

export default function Navbar({ onMobileMenuToggle }: NavbarProps = {}) {
	const [isSearchOpen, setIsSearchOpen] = useState(false)
	const [isAnimating, setIsAnimating] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const searchInputRef = useRef<HTMLInputElement>(null)
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	const isHome = window.location.pathname === "/"
	const isCategoriesOpen = window.location.pathname === "/categories"

	const handleSearchChange = (value: string) => {
		setSearchQuery(value)

		// Clear previous timeout
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current)
		}

		// Debounce search for 300ms
		searchTimeoutRef.current = setTimeout(() => {
			if (value.trim().length >= 2) {
				router.visit(`/search?q=${encodeURIComponent(value.trim())}`, {
					preserveState: true,
					preserveScroll: true,
					only: ["query", "results"],
				})
			} else if (value.trim().length === 0) {
				router.visit("/search", {
					preserveState: true,
					preserveScroll: true,
				})
			}
		}, 300)
	}

	// Handle popup opening animation
	const openSearchPopup = () => {
		setIsSearchOpen(true)
		setIsAnimating(false)
	}

	// Handle popup closing animation
	const closeSearchPopup = useCallback(() => {
		setIsAnimating(false)
		setTimeout(() => {
			setIsSearchOpen(false)
		}, 300) // Match animation duration
	}, [])

	// Focus search input when popup opens and handle animation
	useEffect(() => {
		if (isSearchOpen) {
			setTimeout(() => {
				setIsAnimating(true)
			}, 10)

			setTimeout(() => {
				if (searchInputRef.current) {
					searchInputRef.current.focus()
				}
			}, 150)
		}
	}, [isSearchOpen])

	// Close search popup when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element
			if (
				isSearchOpen &&
				!target.closest(".search-popup") &&
				!target.closest(".mobile-search-button")
			) {
				closeSearchPopup()
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [isSearchOpen, closeSearchPopup])

	return (
		<>
			<div className="flex justify-between items-center pl-5 pr-4 h-16">
				<div className="flex items-center">
					{/* Mobile Menu Button */}
					<Button
						size="icon"
						variant="spotifyTransparent"
						className="lg:hidden mr-3 group"
						onClick={onMobileMenuToggle}
					>
						<svg
							data-encore-id="icon"
							role="img"
							aria-hidden="true"
							viewBox="0 0 24 24"
							fill="none"
							stroke="gray"
							className="w-6 h-6 transition-colors duration-300 group-hover:stroke-white"
						>
							<path
								d="M3 12h18M3 6h18M3 18h18"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</Button>

					<a href="/">
						<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34">
							<title>Spotify logo</title>
							<image
								href="/icons/svg/spotify-logo-white.svg"
								width="34"
								height="34"
							/>
						</svg>
					</a>

					<div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 flex items-center gap-1.5 ml-5">
						<Button
							size={"icon"}
							className="rounded-full w-10 h-10 lg:w-12 lg:h-12"
							variant={"spotifyGray"}
							onClick={() => router.visit("/")}
						>
							{isHome ? (
								<svg
									data-encore-id="icon"
									role="img"
									aria-hidden="true"
									fill="white"
									viewBox="0 0 24 24"
									className="min-w-5 min-h-5"
								>
									<path d="M13.5 1.515a3 3 0 0 0-3 0L3 5.845a2 2 0 0 0-1 1.732V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6h4v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7.577a2 2 0 0 0-1-1.732z"></path>
								</svg>
							) : (
								<svg
									data-encore-id="icon"
									role="img"
									aria-hidden="true"
									fill="white"
									viewBox="0 0 24 24"
									className="min-w-5 min-h-5"
								>
									<path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732z"></path>
								</svg>
							)}
						</Button>

						{/* Desktop Search Bar - Hidden on mobile */}
						<div
							tabIndex={-1}
							className={cn(
								"hidden lg:flex h-12 items-center border-none rounded-full bg-zinc-900 pl-3 text-sm pr-1 transition-all duration-300",
							)}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								data-testid="search-icon"
								viewBox="0 0 24 24"
								fill="gray"
								className="w-6 h-6"
							>
								<path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path>
							</svg>
							<input
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="w-[22rem] p-2 bg-zinc-900 placeholder:text-zinc-400 outline-none"
								placeholder="What do you want to play?"
								onFocus={(e) =>
									e.currentTarget.parentElement?.classList.add(
										"ring-2",
										"ring-white",
										"border-white",
									)
								}
								onBlur={(e) =>
									e.currentTarget.parentElement?.classList.remove(
										"ring-2",
										"ring-white",
										"border-white",
									)
								}
							/>
							<div className="h-6 flex items-center gap-1 pr-1">
								<Button
									size={"icon"}
									variant={"spotifyTransparent"}
									className={cn(
										"group",
										searchQuery.length === 0 && "opacity-0",
									)}
									onClick={() => {
										setSearchQuery("")
										router.visit("/search")
									}}
								>
									<svg
										data-encore-id="icon"
										role="img"
										aria-hidden="true"
										viewBox="0 0 24 24"
										fill="gray"
										className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
									>
										<path d="M3.293 3.293a1 1 0 0 1 1.414 0L12 10.586l7.293-7.293a1 1 0 1 1 1.414 1.414L13.414 12l7.293 7.293a1 1 0 0 1-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 0 1-1.414-1.414L10.586 12 3.293 4.707a1 1 0 0 1 0-1.414"></path>
									</svg>
								</Button>
								<Separator orientation="vertical" className="h-6 bg-zinc-500" />
								<Button
									size={"icon"}
									variant={"spotifyTransparent"}
									className="group"
									onClick={() => router.visit("/categories")}
								>
									{isCategoriesOpen ? (
										<svg
											data-encore-id="icon"
											role="img"
											aria-hidden="true"
											viewBox="0 0 24 24"
											fill="white"
											className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
										>
											<path d="M4 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4H4zM1.513 9.37A1 1 0 0 1 2.291 9H21.71a1 1 0 0 1 .978 1.208l-2.17 10.208A2 2 0 0 1 18.562 22H5.438a2 2 0 0 1-1.956-1.584l-2.17-10.208a1 1 0 0 1 .201-.837zM12 17.834c1.933 0 3.5-1.044 3.5-2.333s-1.567-2.333-3.5-2.333S8.5 14.21 8.5 15.5s1.567 2.333 3.5 2.333z"></path>
										</svg>
									) : (
										<svg
											data-encore-id="icon"
											role="img"
											aria-hidden="true"
											viewBox="0 0 24 24"
											fill="gray"
											className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
										>
											<path d="M15 15.5c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2"></path>
											<path d="M1.513 9.37A1 1 0 0 1 2.291 9h19.418a1 1 0 0 1 .979 1.208l-2.339 11a1 1 0 0 1-.978.792H4.63a1 1 0 0 1-.978-.792l-2.339-11a1 1 0 0 1 .201-.837zM3.525 11l1.913 9h13.123l1.913-9zM4 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4h-2V3H6v3H4z"></path>
										</svg>
									)}
								</Button>
							</div>
						</div>

						{/* Mobile Search Button - Visible only on mobile */}
						<Button
							size={"icon"}
							className="lg:hidden rounded-full w-10 h-10 mobile-search-button"
							variant={"spotifyGray"}
							onClick={openSearchPopup}
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								data-testid="search-icon"
								viewBox="0 0 24 24"
								fill="white"
								className="w-5 h-5"
							>
								<path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path>
							</svg>
						</Button>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group rounded-full"
					>
						<svg
							data-encore-id="icon"
							role="img"
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="min-w-2 min-h-2 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M8 1.5a4 4 0 0 0-4 4v3.27a.75.75 0 0 1-.1.373L2.255 12h11.49L12.1 9.142a.75.75 0 0 1-.1-.374V5.5a4 4 0 0 0-4-4m-5.5 4a5.5 5.5 0 0 1 11 0v3.067l2.193 3.809a.75.75 0 0 1-.65 1.124H10.5a2.5 2.5 0 0 1-5 0H.957a.75.75 0 0 1-.65-1.124L2.5 8.569zm4.5 8a1 1 0 1 0 2 0z"></path>
						</svg>
					</Button>

					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group rounded-full"
					>
						<svg
							data-encore-id="icon"
							role="img"
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="min-w-2 min-h-2 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M3.849 10.034c-.021-.465.026-.93.139-1.381H1.669c.143-.303.375-.556.665-.724l.922-.532a1.63 1.63 0 0 0 .436-2.458 1.8 1.8 0 0 1-.474-1.081q-.014-.287.057-.563a1.12 1.12 0 0 1 .627-.7 1.2 1.2 0 0 1 .944 0q.225.1.392.281c.108.12.188.263.237.417q.074.276.057.561a1.8 1.8 0 0 1-.475 1.084 1.6 1.6 0 0 0-.124 1.9c.36-.388.792-.702 1.272-.927v-.015c.48-.546.768-1.233.821-1.958a3.2 3.2 0 0 0-.135-1.132 2.657 2.657 0 0 0-5.04 0c-.111.367-.157.75-.135 1.133.053.724.341 1.41.821 1.955A.13.13 0 0 1 2.565 6a.13.13 0 0 1-.063.091l-.922.532A3.2 3.2 0 0 0-.004 9.396v.75h3.866c.001-.033-.01-.071-.013-.112m10.568-3.4-.922-.532a.13.13 0 0 1-.064-.091.12.12 0 0 1 .028-.1c.48-.546.768-1.233.821-1.958a3.3 3.3 0 0 0-.135-1.135A2.64 2.64 0 0 0 12.7 1.233a2.67 2.67 0 0 0-3.042.64 2.65 2.65 0 0 0-.554.948c-.11.367-.156.75-.134 1.133.053.724.341 1.41.821 1.955.005.006 0 .011 0 .018.48.225.911.54 1.272.927a1.6 1.6 0 0 0-.125-1.907 1.8 1.8 0 0 1-.474-1.081q-.015-.287.057-.563a1.12 1.12 0 0 1 .627-.7 1.2 1.2 0 0 1 .944 0q.225.1.392.281.162.182.236.413c.05.184.07.375.058.565a1.8 1.8 0 0 1-.475 1.084 1.633 1.633 0 0 0 .438 2.456l.922.532c.29.169.52.421.664.724h-2.319c.113.452.16.918.139 1.383 0 .04-.013.078-.017.117h3.866v-.75a3.2 3.2 0 0 0-1.58-2.778v.004zm-3.625 6-.922-.532a.13.13 0 0 1-.061-.144.1.1 0 0 1 .025-.047 3.33 3.33 0 0 0 .821-1.958 3.2 3.2 0 0 0-.135-1.132 2.657 2.657 0 0 0-5.041 0c-.11.367-.156.75-.134 1.133.053.724.341 1.41.821 1.955a.13.13 0 0 1 .028.106.13.13 0 0 1-.063.091l-.922.532a3.2 3.2 0 0 0-1.584 2.773v.75h8.75v-.75a3.2 3.2 0 0 0-1.583-2.781zm-5.5 2.023c.143-.303.375-.556.665-.724l.922-.532a1.63 1.63 0 0 0 .436-2.458 1.8 1.8 0 0 1-.474-1.081q-.015-.287.057-.563a1.12 1.12 0 0 1 .627-.7 1.2 1.2 0 0 1 .944 0q.225.1.392.281c.108.12.188.263.237.417q.073.276.057.561a1.8 1.8 0 0 1-.475 1.084 1.632 1.632 0 0 0 .438 2.456l.922.532c.29.169.52.421.664.724z"></path>
						</svg>
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger className="outline-none">
							<div
								className={`${buttonVariants({ variant: "spotifyTransparent", size: "icon" })} group rounded-full ml-1.5`}
							>
								<div className="min-w-10 max-w-10 min-h-10 max-h-10 rounded-full bg-zinc-900 flex items-center justify-center">
									<div className="min-w-7 max-w-7 min-h-7 max-h-7 rounded-full bg-blue-400 flex items-center justify-center">
										<span className="text-black font-medium text-sm">A</span>
									</div>
								</div>
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-44 mr-4">
							<DropdownMenuItem>
								<span>Account</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<span>Logout</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Mobile Search Popup */}
			{isSearchOpen && (
				<div
					className={cn(
						"fixed inset-0 bg-black z-50 lg:hidden transition-all duration-300 ease-out",
						isAnimating
							? "bg-opacity-50 backdrop-blur-sm"
							: "bg-opacity-0 backdrop-blur-none",
					)}
				>
					<div className="flex justify-center items-start pt-20 px-4">
						<div
							className={cn(
								"search-popup bg-zinc-900 rounded-lg w-full max-w-md p-4 shadow-xl transition-all duration-300 ease-out",
								isAnimating
									? "opacity-100 translate-y-0 scale-100"
									: "opacity-0 -translate-y-4 scale-95",
							)}
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-white font-semibold">Search</h3>
								<Button
									size={"icon"}
									variant={"spotifyTransparent"}
									className="group"
									onClick={closeSearchPopup}
								>
									<svg
										data-encore-id="icon"
										role="img"
										aria-hidden="true"
										viewBox="0 0 16 16"
										fill="gray"
										className="w-4 h-4 transition-colors duration-300 group-hover:fill-white"
									>
										<path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06z"></path>
									</svg>
								</Button>
							</div>
							<div className="flex items-center border-none rounded-full bg-zinc-800 pl-3 text-sm pr-1 ring-2 ring-white transition-all duration-200">
								<svg
									data-encore-id="icon"
									role="img"
									aria-hidden="true"
									data-testid="search-icon"
									viewBox="0 0 24 24"
									fill="gray"
									className="w-5 h-5"
								>
									<path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"></path>
								</svg>
								<input
									ref={searchInputRef}
									value={searchQuery}
									onChange={(e) => handleSearchChange(e.target.value)}
									className="w-full p-3 bg-zinc-800 placeholder:text-zinc-400 outline-none transition-all duration-200"
									placeholder="What do you want to play?"
								/>
								<div className="h-5 flex items-center">
									<Button
										size={"icon"}
										variant={"spotifyTransparent"}
										className={cn(
											"group",
											searchQuery.length === 0 && "opacity-0",
										)}
										onClick={() => {
											setSearchQuery("")
											router.visit("/search")
										}}
									>
										<svg
											data-encore-id="icon"
											role="img"
											aria-hidden="true"
											viewBox="0 0 24 24"
											fill="gray"
											className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
										>
											<path d="M3.293 3.293a1 1 0 0 1 1.414 0L12 10.586l7.293-7.293a1 1 0 1 1 1.414 1.414L13.414 12l7.293 7.293a1 1 0 0 1-1.414 1.414L12 13.414l-7.293 7.293a1 1 0 0 1-1.414-1.414L10.586 12 3.293 4.707a1 1 0 0 1 0-1.414"></path>
										</svg>
									</Button>
									<Separator
										orientation="vertical"
										className="h-5 bg-zinc-500"
									/>
									<Button
										size={"icon"}
										variant={"spotifyTransparent"}
										className="group"
										onClick={() => {
											router.visit("/categories")
											closeSearchPopup()
										}}
									>
										{isCategoriesOpen ? (
											<svg
												data-encore-id="icon"
												role="img"
												aria-hidden="true"
												viewBox="0 0 24 24"
												fill="white"
												className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
											>
												<path d="M4 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4H4zM1.513 9.37A1 1 0 0 1 2.291 9H21.71a1 1 0 0 1 .978 1.208l-2.17 10.208A2 2 0 0 1 18.562 22H5.438a2 2 0 0 1-1.956-1.584l-2.17-10.208a1 1 0 0 1 .201-.837zM12 17.834c1.933 0 3.5-1.044 3.5-2.333s-1.567-2.333-3.5-2.333S8.5 14.21 8.5 15.5s1.567 2.333 3.5 2.333z"></path>
											</svg>
										) : (
											<svg
												data-encore-id="icon"
												role="img"
												aria-hidden="true"
												viewBox="0 0 24 24"
												fill="gray"
												className="min-w-6 min-h-6 transition-colors duration-300 group-hover:fill-white"
											>
												<path d="M15 15.5c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2"></path>
												<path d="M1.513 9.37A1 1 0 0 1 2.291 9h19.418a1 1 0 0 1 .979 1.208l-2.339 11a1 1 0 0 1-.978.792H4.63a1 1 0 0 1-.978-.792l-2.339-11a1 1 0 0 1 .201-.837zM3.525 11l1.913 9h13.123l1.913-9zM4 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4h-2V3H6v3H4z"></path>
											</svg>
										)}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
