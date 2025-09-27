import type { Category } from "@/types"
import { router } from "@inertiajs/react"

interface CategoryItemProps {
	data: Category
}

export const CategoryItem = ({ data }: CategoryItemProps) => {
	return (
		<div
			className={"w-full h-full rounded-lg cursor-pointer"}
			style={{ backgroundColor: data.color }}
			onClick={() => {
				router.visit(`/categories/${data.id}`)
			}}
		>
			<div className="relative h-40 overflow-hidden p-3 rounded-lg">
				<img
					src={data.image}
					alt={data.name}
					className="absolute -bottom-4 -right-4 w-32 h-32 rounded-[4px] rotate-[26deg] z-0"
				/>
				<span className="text-white text-2xl font-bold relative z-0">
					{data.name}
				</span>
			</div>
		</div>
	)
}
