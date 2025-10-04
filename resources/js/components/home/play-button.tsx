import { cn } from "@/lib/utils"

export default function PlayButton({
	className = "",
	size = "default",
	hoverable = true,
	onClick,
}: {
	className?: string
	size?: "default" | "small"
	hoverable?: boolean
	onClick?: () => void
}) {
	const sizeClasses = size === "small" ? "w-8 h-8" : "w-12 h-12"
	const iconSize = size === "small" ? "w-3 h-3" : "w-4 h-4"

	return (
		<button
			type="button"
			aria-label="Play"
			className={cn(
				hoverable
					? "absolute bottom-2 right-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
					: "cursor-pointer hover:scale-105 active:scale-95 transition-all",
				hoverable &&
					"group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100",
				sizeClasses,
				"rounded-full",
				"bg-spotify-green",
				"shadow-lg hover:shadow-xl",
				"flex items-center justify-center",
				"text-white",
				hoverable && "translate-y-2 opacity-0 scale-95",
				hoverable &&
					"group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100",
				className,
			)}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 16 16"
				fill="black"
				className={iconSize}
			>
				<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"></path>
			</svg>
		</button>
	)
}
