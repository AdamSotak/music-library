import type { ShelfItem } from "@/types"
import PlayButton from "./play-button"

interface CardProps {
	item: ShelfItem
	onItemSelected?: (item: ShelfItem) => void
}

export default function Card({ item, onItemSelected }: CardProps) {
	return (
		<article
			className="min-w-[170px] group/card cursor-pointer p-3 hover:bg-zinc-900 active:bg-black transition-all rounded-md"
			data-card
			onClick={() => onItemSelected?.(item)}
		>
			<div
				className={[
					"aspect-square w-[170px] overflow-hidden relative",
					item.type === "artist" ? "rounded-full" : "rounded-sm",
					item.image ? "bg-cover bg-center bg-no-repeat" : "bg-orange-300",
				].join(" ")}
				style={
					item.image ? { backgroundImage: `url(${item.image})` } : undefined
				}
				aria-hidden
			>
				{item.type !== "artist" && (
					<PlayButton className="group-hover/card:translate-y-0 group-hover/card:opacity-100 group-hover/card:scale-100" />
				)}
			</div>
			<div className="mt-3 text-white font-semibold leading-tight truncate max-w-36 overflow-x-hidden">
				{item.title}
			</div>
			{item.subtitle && (
				<div className="text-sm text-neutral-300 mt-1 line-clamp-2">
					{item.subtitle}
				</div>
			)}
		</article>
	)
}
