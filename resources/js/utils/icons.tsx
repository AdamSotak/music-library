type IconProps = {
	className?: string
}

export const RadioIcon = ({ className }: IconProps) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M4 12a8 8 0 0 1 16 0" />
		<path d="M7 12a5 5 0 0 1 10 0" />
		<circle cx="12" cy="12" r="1.5" />
	</svg>
)
