import Navbar from "@/components/navbar"
import Sidebar from "@/components/sidebar"
import { cn } from "@/lib/utils"
import ModalsProvider from "@/providers/modals-provider"
import { useEffect, useRef, useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import AudioPlayer from "@/components/audio-player"
import { usePage } from "@inertiajs/react"

export default function Layout({ children }: { children: React.ReactNode }) {
	const pathname = usePage().url
	const mainContentRef = useRef<HTMLDivElement>(null)
	type SidebarSize = "collapsed" | "default" | "expanded"
	const [sidebarSize, setSidebarSize] = useState<SidebarSize>("default")
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

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

	return (
		<>
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

						{/* Main Content */}
						<div
							ref={mainContentRef}
							className={cn(
								"h-full bg-background-base rounded-lg overflow-y-auto transition-all duration-300 flex-1",
								sidebarSize === "expanded" ? "lg:hidden" : "",
							)}
						>
							{children}
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
		</>
	)
}
