import AudioPlayer from "@/components/audio-player"
import Navbar from "@/components/navbar"
import Sidebar from "@/components/sidebar"
import { cn } from "@/lib/utils"
import ModalsProvider from "@/providers/modals-provider"
import { useEffect, useState } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"

export default function Layout({ children }: { children: React.ReactNode }) {
	const [isSidebarExpanded, setIsSidebarExpanded] = useState(
		localStorage.getItem("isSidebarExpanded") === "true",
	)
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

	useEffect(() => {
		localStorage.setItem("isSidebarExpanded", isSidebarExpanded.toString())
	}, [isSidebarExpanded])

	return (
		<>
			<div className="min-w-screen h-screen bg-black flex flex-col">
				<Navbar onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
				<main className="flex-1 overflow-hidden">
					<div className="flex gap-2 w-full h-full bg-black px-2 pb-1">
						{/* Desktop Sidebar */}
						<div
							className={cn(
								"hidden lg:block h-full bg-background-base rounded-lg overflow-y-auto transition-all duration-300",
								isSidebarExpanded ? "min-w-72 w-1/6" : "min-w-20 w-[4vw]",
							)}
						>
							<Sidebar
								isExpanded={isSidebarExpanded}
								setIsExpanded={setIsSidebarExpanded}
								isMobile={false}
							/>
						</div>

						{/* Main Content */}
						<div
							className={cn(
								"h-full bg-background-base rounded-lg overflow-y-auto transition-all duration-300",
								"w-full lg:w-5/6",
								isSidebarExpanded ? "lg:w-5/6" : "lg:w-[96vw]",
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
						isExpanded={true}
						setIsExpanded={() => {}}
						isMobile={true}
						onClose={() => setIsMobileSidebarOpen(false)}
					/>
				</SheetContent>
			</Sheet>

			<ModalsProvider />
		</>
	)
}
