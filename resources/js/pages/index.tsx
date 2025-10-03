import PlayButton from "@/components/home/play-button"
import Shelf from "@/components/home/shelf"
import { cn } from "@/lib/utils"
import type { ShelfItem } from "@/types"
import { useEffect, useState } from "react"

const rows = {
	featuredCharts: Array.from({ length: 5 }, (_, i) => ({
		title: `Featured Chart ${i + 1}`,
		subtitle: "Essential tracks",
	})) as ShelfItem[],

	bestOf: Array.from({ length: 12 }, (_, i) => ({
		title: `Best Of: Artist ${i + 1}`,
		subtitle: "Essential tracks",
		circle: true,
	})) as ShelfItem[],

	genres: [
		{ title: "Pop", subtitle: "Feel-good hits" },
		{ title: "Rock", subtitle: "Guitar energy" },
		{ title: "Hip-Hop", subtitle: "Beats & rhymes" },
		{ title: "Jazz", subtitle: "Smooth & classic" },
		{ title: "Electronic", subtitle: "Dance & chill" },
		{ title: "Classical", subtitle: "Timeless pieces" },
		{ title: "Indie", subtitle: "Alt flavors" },
		{ title: "R&B", subtitle: "Soulful vibes" },
		{ title: "Lo-Fi", subtitle: "Cozy beats" },
		{ title: "Workout", subtitle: "Push the pace" },
	] as ShelfItem[],

	jumpBackIn: Array.from({ length: 12 }, (_, i) => ({
		title: `Jump Back ${i + 1}`,
		subtitle: "Because you listened recently",
	})) as ShelfItem[],

	recentlyPlayed: Array.from({ length: 12 }, (_, i) => ({
		title: `Recent ${i + 1}`,
		circle: true,
	})) as ShelfItem[],
}

export default function Index() {
	const topGradientClasses = [
		"from-purple-900/70",
		"from-blue-900/70",
		"from-yellow-900/70",
		"from-orange-900/70",
		"from-red-900/70",
	]

	const [topGradientClass] = useState(() => {
		const randomIndex = Math.floor(Math.random() * topGradientClasses.length)
		return topGradientClasses[randomIndex]
	})

	const [gradientVisible, setGradientVisible] = useState(false)
	const [selectedTab, setSelectedTab] = useState<"all" | "music" | "podcasts">(
		"all",
	)

	useEffect(() => {
		const timeout = setTimeout(() => setGradientVisible(true), 10)
		return () => clearTimeout(timeout)
	}, [])

	return (
		<main className="pb-[140px] relative">
			{/* Only the gradient fades in/out */}
			<div
				className={cn(
					"absolute inset-0 z-0 bg-gradient-to-b to-transparent to-10% transition-opacity duration-700 pointer-events-none",
					topGradientClass,
					gradientVisible ? "opacity-100" : "opacity-0",
				)}
				aria-hidden
			/>

			<div className="flex items-center gap-2 px-10 relative z-10 pt-4">
				{["all", "music", "podcasts"].map((tab) => (
					<div
						key={tab}
						className={cn(
							"bg-white/10 px-3 py-1 rounded-full cursor-pointer",
							selectedTab === tab && "bg-white",
						)}
						onClick={() => setSelectedTab(tab as typeof selectedTab)}
					>
						<span
							className={cn(
								"text-sm",
								selectedTab === tab && "text-background-base",
							)}
						>
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</span>
					</div>
				))}
			</div>

			<div className="relative z-10 px-10 mt-5 flex gap-2">
				<div className="bg-white/10 hover:bg-white/20 transition-all duration-100 cursor-pointer flex items-center gap-2 rounded-sm w-[22rem] group relative">
					<img
						className="w-12 h-12 rounded-tl-sm rounded-bl-sm"
						src="/images/playlists/discover-weekly.jpg"
						alt="Discover Weekly"
					/>
					<span className="text-sm font-[700]">Discover Weekly</span>
					<PlayButton
						size="small"
						className="group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 !right-2 !bottom-auto !top-1/2 !-translate-y-1/2"
					/>
				</div>

				<div className="bg-white/10 hover:bg-white/20 transition-all duration-100 cursor-pointer flex items-center gap-2 rounded-sm w-[22rem] group relative">
					<img
						className="w-12 h-12 rounded-tl-sm rounded-bl-sm"
						src="/images/playlists/top-50-denmark.jpg"
						alt="Top 50 - Denmark"
					/>
					<span className="text-sm font-[700]">Top 50 - Denmark</span>
					<PlayButton
						size="small"
						className="group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 !right-2 !bottom-auto !top-1/2 !-translate-y-1/2"
					/>
				</div>
			</div>

			<div className="pt-10">
				<Shelf title="Adam" topTitle="Made For" items={rows.featuredCharts} />
				<Shelf title="Featured Charts" items={rows.featuredCharts} />
				<Shelf
					title="Hot Hits Denmark"
					topTitle="More like"
					items={rows.genres}
				/>
				<Shelf
					title="Throwback"
					topTitle="Playlists full of favorites, still going strong."
					items={rows.jumpBackIn}
				/>
			</div>
		</main>
	)
}
