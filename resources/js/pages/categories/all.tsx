import { CategoryItem } from "@/components/library/category-item"
import type { Category } from "@/types"

interface CategoriesPageProps {
	categories: Category[]
}

export default function CategoriesPage({ categories }: CategoriesPageProps) {
	return (
		<div className="p-4 pb-20">
			<h1 className="text-white text-2xl font-bold mt-8">Browse all</h1>

			<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
				{categories.map((category) => (
					<CategoryItem key={category.name} data={category} />
				))}
			</div>
		</div>
	)
}
