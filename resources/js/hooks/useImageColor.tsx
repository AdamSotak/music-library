import { useState, useEffect } from "react"

interface RGB {
	r: number
	g: number
	b: number
}

/**
 * Custom hook to extract dominant color from an image
 * Returns RGB values and formatted color strings for gradients
 */
export function useImageColor(imageUrl: string | null | undefined) {
	const [color, setColor] = useState<RGB>({ r: 30, g: 50, b: 100 })
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		if (!imageUrl) {
			setIsLoading(false)
			return
		}

		const img = new Image()
		img.crossOrigin = "Anonymous"
		img.src = imageUrl

		img.onload = () => {
			try {
				const canvas = document.createElement("canvas")
				const ctx = canvas.getContext("2d")

				if (!ctx) {
					setIsLoading(false)
					return
				}

				// Use smaller canvas for better performance
				const size = 100
				canvas.width = size
				canvas.height = size

				ctx.drawImage(img, 0, 0, size, size)

				// Get image data from a specific region (center-left area tends to have better colors)
				const imageData = ctx.getImageData(0, 0, size, size)
				const data = imageData.data

				// Collect vibrant pixels with their saturation scores
				const pixels: Array<{
					r: number
					g: number
					b: number
					score: number
				}> = []

				// Sample every 10th pixel for performance
				for (let i = 0; i < data.length; i += 40) {
					const red = data[i]
					const green = data[i + 1]
					const blue = data[i + 2]
					const alpha = data[i + 3]

					// Skip very dark or very light pixels, and transparent pixels
					const brightness = (red + green + blue) / 3
					if (brightness > 25 && brightness < 220 && alpha > 200) {
						// Calculate saturation and vibrancy score
						const max = Math.max(red, green, blue)
						const min = Math.min(red, green, blue)
						const saturation = max - min

						// Prefer more saturated colors and mid-range brightness
						const brightnessScore = 1 - Math.abs(brightness - 127.5) / 127.5
						const vibrancyScore = saturation * (brightnessScore * 0.5 + 0.5)

						pixels.push({
							r: red,
							g: green,
							b: blue,
							score: vibrancyScore,
						})
					}
				}

				if (pixels.length > 0) {
					// Sort by vibrancy score and take top 30%
					pixels.sort((a, b) => b.score - a.score)
					const topPixels = pixels.slice(0, Math.ceil(pixels.length * 0.3))

					// Calculate weighted average of most vibrant pixels
					let r = 0,
						g = 0,
						b = 0
					for (const pixel of topPixels) {
						r += pixel.r
						g += pixel.g
						b += pixel.b
					}
					r = Math.floor(r / topPixels.length)
					g = Math.floor(g / topPixels.length)
					b = Math.floor(b / topPixels.length)

					// Enhance saturation significantly for more vibrant colors
					const max = Math.max(r, g, b)
					const min = Math.min(r, g, b)
					const saturation = max - min

					if (saturation > 0) {
						// Boost saturation more aggressively
						const saturationBoost = saturation < 80 ? 1.5 : 1.3
						const mid = (max + min) / 2

						r = Math.round(mid + (r - mid) * saturationBoost)
						g = Math.round(mid + (g - mid) * saturationBoost)
						b = Math.round(mid + (b - mid) * saturationBoost)

						// Ensure values stay in valid range
						r = Math.max(0, Math.min(255, r))
						g = Math.max(0, Math.min(255, g))
						b = Math.max(0, Math.min(255, b))

						// Boost the dominant channel slightly more
						if (r === Math.max(r, g, b)) {
							r = Math.min(255, Math.floor(r * 1.1))
						} else if (g === Math.max(r, g, b)) {
							g = Math.min(255, Math.floor(g * 1.1))
						} else {
							b = Math.min(255, Math.floor(b * 1.1))
						}
					}

					setColor({ r, g, b })
				}

				setIsLoading(false)
			} catch (error) {
				console.error("Error extracting color:", error)
				setIsLoading(false)
			}
		}

		img.onerror = () => {
			console.error("Error loading image for color extraction")
			setIsLoading(false)
		}

		return () => {
			img.onload = null
			img.onerror = null
		}
	}, [imageUrl])

	// Helper functions to format colors for CSS
	const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`
	const rgba = (alpha: number) =>
		`rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`

	return {
		color,
		rgb,
		rgba,
		isLoading,
	}
}
