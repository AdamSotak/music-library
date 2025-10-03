import type { ShelfItem } from "@/types"
import PlayButton from "./play-button"

export default function Card({ item }: { item: ShelfItem }) {
	return (
		<article
			className="min-w-[170px] group/card cursor-pointer p-3 hover:bg-zinc-900 active:bg-black transition-all rounded-md"
			data-card
		>
			<div
				className={[
					"aspect-square w-[170px] overflow-hidden relative",
					item.circle ? "rounded-full" : "rounded-sm",
					item.img ? "bg-cover bg-center bg-no-repeat" : "bg-orange-300",
				].join(" ")}
				style={item.img ? { backgroundImage: `url(${item.img})` } : undefined}
				aria-hidden
			>
				{!item.circle && (
					<PlayButton className="group-hover/card:translate-y-0 group-hover/card:opacity-100 group-hover/card:scale-100" />
				)}
			</div>
			<div className="mt-3 text-white font-semibold leading-tight truncate">
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
