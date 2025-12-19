import Navbar from "@/components/navbar"
import Sidebar from "@/components/sidebar"
import { cn } from "@/lib/utils"
import ModalsProvider from "@/providers/modals-provider"
import { useEffect, useRef, useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import AudioPlayer from "@/components/audio-player"
import { usePage } from "@inertiajs/react"
import type { InertiaPageProps } from "@/types"
import { useLikedTracksStore } from "@/hooks/useLikedTracks"
import { RightSidebar } from "@/components/right-sidebar"
import { JamSessionProvider } from "@/hooks/useJamSession"

export default function Layout({ children }: { children: React.ReactNode }) {
	const page = usePage()
	const pathname = page.url
	const { playlists } = page.props as unknown as InertiaPageProps
	const mainContentRef = useRef<HTMLDivElement>(null)
	type SidebarSize = "collapsed" | "default" | "expanded"
	const [sidebarSize, setSidebarSize] = useState<SidebarSize>("default")
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
	const initializeLikedTracks = useLikedTracksStore((state) => state.initialize)

	useEffect(() => {
		if (!playlists) return
		const likedPlaylist = playlists.find((playlist) => playlist.is_default)
		const likedTrackIds =
			likedPlaylist?.tracks?.map((track) => track.id.toString()) ?? []
		initializeLikedTracks(likedPlaylist?.id?.toString() ?? null, likedTrackIds)
	}, [initializeLikedTracks, playlists])

	useEffect(() => {
		if (typeof window === "undefined") return
		const stored = localStorage.getItem("sidebarSize")
		if (
			stored === "collapsed" ||
			stored === "default" ||
			stored === "expanded"
		) {
			setSidebarSize(stored)
		}
	}, [])

	useEffect(() => {
		if (typeof window === "undefined") return
		localStorage.setItem("sidebarSize", sidebarSize)
	}, [sidebarSize])

	useEffect(() => {
		mainContentRef.current?.scrollTo({ top: 0, behavior: "instant" })
	}, [pathname])

	const sidebarWidthClass =
		sidebarSize === "collapsed"
			? "lg:w-[72px] lg:min-w-[72px]"
			: sidebarSize === "expanded"
				? "lg:w-full"
				: "lg:w-[26vw] lg:min-w-[320px] lg:max-w-[320px]"

	const castProps = page.props as InertiaPageProps
	const currentUserId = castProps.user?.id?.toString?.() ?? null
	const currentUserName = castProps.user?.name ?? null

	return (
		<JamSessionProvider
			currentUserId={currentUserId}
			currentUserName={currentUserName}
		>
			<div className="min-w-screen h-screen bg-black flex flex-col">
				<Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
				<main className="flex-1 overflow-hidden">
					<div
						className={cn(
							"flex w-full h-full bg-black px-2 pb-1 gap-2 transition-all duration-300",
							sidebarSize === "expanded" ? "lg:gap-0 lg:px-0" : "lg:gap-2",
						)}
					>
						{/* Desktop Sidebar */}
						<div
							className={cn(
								"hidden lg:block h-full bg-background-base overflow-y-auto transition-all duration-300",
								sidebarWidthClass,
								sidebarSize === "expanded"
									? "lg:flex-1 lg:rounded-none"
									: "lg:flex-none lg:shrink-0 lg:rounded-lg",
							)}
						>
							<Sidebar
								sidebarSize={sidebarSize}
								setSidebarSize={setSidebarSize}
								isMobile={false}
							/>
						</div>

						{/* Main Content + Right Sidebar */}
						<div className="flex-1 h-full flex gap-2 overflow-hidden">
							<div
								ref={mainContentRef}
								className={cn(
									"h-full bg-background-base rounded-lg overflow-y-auto transition-all duration-300 flex-1",
									sidebarSize === "expanded" ? "lg:hidden" : "",
								)}
							>
								{children}
							</div>
							<RightSidebar
								currentUserId={currentUserId}
								currentUserName={currentUserName}
							/>
						</div>
					</div>
				</main>

				<AudioPlayer />
			</div>

			{/* Mobile Sidebar Sheet */}
			<Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
				<SheetContent side="left" className="w-80 p-0 border-none sm:max-w-80">
					<Sidebar
						sidebarSize="expanded"
						setSidebarSize={() => {}}
						isMobile={true}
						onClose={() => setIsMobileSidebarOpen(false)}
					/>
				</SheetContent>
			</Sheet>

			<ModalsProvider />
		</JamSessionProvider>
	)
}
