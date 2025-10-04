export default function ArrowButton({
	dir,
	onClick,
	opacity,
}: {
	dir: "left" | "right"
	onClick: () => void
	opacity: number
}) {
	const label = dir === "left" ? "Scroll left" : "Scroll right"
	return (
		<button
			type="button" // ✅ explicit type
			onClick={onClick}
			aria-label={label}
			style={{
				opacity: opacity,
				transition: "opacity 150ms ease-in-out",
			}}
			className={[
				"absolute top-1/2 -translate-y-1/2 z-20 cursor-pointer",
				dir === "left" ? "left-2" : "right-2",
				"h-9 w-9 rounded-full bg-neutral-800/80 hover:bg-neutral-700/90",
				"text-white shadow-md backdrop-blur-sm grid place-items-center",
				"group-hover/row:opacity-100",
			].join(" ")}
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				role="img"
				aria-label={label}
			>
				<title>{label}</title>
				{dir === "left" ? (
					<path
						d="M15 19l-7-7 7-7"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				) : (
					<path
						d="M9 5l7 7-7 7"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				)}
			</svg>
		</button>
	)
}
