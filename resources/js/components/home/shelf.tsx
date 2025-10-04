import type { ShelfItem } from "@/types"
import { useCallback, useEffect, useRef, useState } from "react"
import ArrowButton from "./arrow-button"
import Card from "./card"

export default function Shelf({
	title,
	items,
	topTitle,
}: {
	title: string
	items: ShelfItem[]
	topTitle?: string
}) {
	const scrollerRef = useRef<HTMLDivElement | null>(null)
	const [canLeft, setCanLeft] = useState(false)
	const [canRight, setCanRight] = useState(false)
	const [leftOpacity, setLeftOpacity] = useState(0)
	const [rightOpacity, setRightOpacity] = useState(0)

	const update = useCallback(() => {
		const el = scrollerRef.current
		if (!el) return
		const max = el.scrollWidth - el.clientWidth
		const scrollLeft = el.scrollLeft

		// Calculate opacity based on scroll progress
		// Fade in over the first 100px of scroll
		const fadeDistance = 100
		const leftOp = Math.min(scrollLeft / fadeDistance, 1)
		const rightOp = Math.min((max - scrollLeft) / fadeDistance, 1)

		setCanLeft(scrollLeft > 4)
		setCanRight(scrollLeft < max - 4)
		setLeftOpacity(leftOp)
		setRightOpacity(rightOp)
	}, [])

	useEffect(() => {
		update()
		const el = scrollerRef.current
		if (!el) return
		const onScroll = () => update()
		el.addEventListener("scroll", onScroll, { passive: true })
		window.addEventListener("resize", update)
		return () => {
			el.removeEventListener("scroll", onScroll)
			window.removeEventListener("resize", update)
		}
	}, [update])

	const scrollByAmount = (dir: "left" | "right") => {
		const el = scrollerRef.current
		if (!el) return
		const first = el.querySelector<HTMLElement>("[data-card]")
		const styles = getComputedStyle(el)
		const gap = parseFloat(styles.gap || styles.columnGap || "16") || 16
		const width = first?.clientWidth ?? 170
		const amount = (width + gap) * 3 // scroll exactly 3 cards
		el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
	}

	return (
		<section className="mb-8">
			<div className="flex items-end justify-between pr-5 lg:pr-10">
				<div className="flex flex-col pl-5 lg:pl-10">
					{topTitle && (
						<span className="text-xs text-gray-300">{topTitle}</span>
					)}
					<span className="text-white text-2xl font-[700] hover:underline cursor-pointer">
						{title}
					</span>
				</div>

				<span className="text-sm font-[700] hover:underline text-gray-300 cursor-pointer">
					Show all
				</span>
			</div>
			<div className="relative mt-2 group/row">
				{canLeft && (
					<ArrowButton
						dir="left"
						onClick={() => scrollByAmount("left")}
						opacity={leftOpacity}
					/>
				)}
				{canRight && (
					<ArrowButton
						dir="right"
						onClick={() => scrollByAmount("right")}
						opacity={rightOpacity}
					/>
				)}

				{/* Left gradient fade */}
				{canLeft && (
					<div
						className="absolute left-0 top-0 bottom-0 w-14 pointer-events-none z-10"
						style={{
							background:
								"linear-gradient(to right, rgba(18 18 18 / 0.5), transparent)",
							opacity: leftOpacity,
							transition: "opacity 150ms ease-in-out",
						}}
					/>
				)}

				{/* Right gradient fade */}
				{canRight && (
					<div
						className="absolute right-0 top-0 bottom-0 w-14 pointer-events-none z-10"
						style={{
							background:
								"linear-gradient(to left, rgba(18 18 18 / 0.5), transparent)",
							opacity: rightOpacity,
							transition: "opacity 150ms ease-in-out",
						}}
					/>
				)}

				<div
					ref={scrollerRef}
					className="flex overflow-x-auto no-scrollbar px-5 lg:px-10"
					onScroll={update}
				>
					{items.map((item, index) => {
						if (index === 0) {
							return (
								<div key={`${title}-${item.title}`} className="-ml-2">
									<Card item={item} />
								</div>
							)
						}

						return (
							<div key={`${title}-${item.title}`}>
								{/* ✅ stable key */}
								<Card item={item} />
							</div>
						)
					})}
				</div>
			</div>
		</section>
	)
}
