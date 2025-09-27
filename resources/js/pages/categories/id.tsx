import type { Category } from "@/types"

interface CategoryPageProps {
	category: Category
}

export default function CategoryPage({ category }: CategoryPageProps) {
	return (
		<div>
			<div
				className="h-64 flex items-end px-4.5 relative"
				style={{ backgroundColor: category.color }}
			>
				<h1 className="text-white text-7xl font-bold mb-6 z-30">
					{category.name}
				</h1>
				<div className="absolute left-0 right-0 bottom-0 h-32 opacity-30 z-20 bg-gradient-to-b from-transparent to-black" />
			</div>
			<div
				className="h-52 opacity-20 antialiased"
				style={{
					background: `linear-gradient(to bottom, ${category.color}, transparent)`,
				}}
			/>
		</div>
	)
}
