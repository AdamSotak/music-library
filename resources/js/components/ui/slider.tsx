import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	hideThumb = false,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
	hideThumb?: boolean
}) {
	const _values = React.useMemo(
		() =>
			Array.isArray(value)
				? value
				: Array.isArray(defaultValue)
					? defaultValue
					: [min, max],
		[value, defaultValue, min, max],
	)

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				"group relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col cursor-pointer",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className={cn(
					"bg-white/20 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1",
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className={cn(
						"bg-white group-hover:bg-spotify-green absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full rounded-full transition-colors",
					)}
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: _values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={index.toString()}
					className={cn(
						"bg-white ring-white/50 block size-3 shrink-0 rounded-full shadow-sm transition-[color,box-shadow,opacity] hover:ring-2 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
						hideThumb && "opacity-0 group-hover:opacity-100",
					)}
				/>
			))}
		</SliderPrimitive.Root>
	)
}

export { Slider }
