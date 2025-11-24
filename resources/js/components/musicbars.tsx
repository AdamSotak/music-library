import { useState } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"

interface MusicBarcodeProps {
	trackId: string
	trackName: string
}

export default function MusicBarcode({
	trackId,
	trackName,
}: MusicBarcodeProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [barcodeImage, setBarcodeImage] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const generateBarcode = async () => {
		setLoading(true)
		setError(null)
		try {
			const response = await fetch(`/barcode/${trackId}`)
			const data = await response.json()

			if (response.ok) {
				setBarcodeImage(data.barcode)
				setIsOpen(true)
			} else {
				setError(data.error || "Failed to generate barcode")
			}
		} catch (error) {
			console.error("Failed to generate barcode:", error)
			setError("Failed to generate barcode")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Button
				onClick={generateBarcode}
				disabled={loading}
				variant="spotifyTransparent"
				size="icon"
				className="group"
			>
				{loading ? (
					<svg
						className="min-w-7 min-h-7 animate-spin"
						fill="gray"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
							fill="none"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				) : (
					<svg
						className="min-w-7 min-h-7 transition-colors duration-300 group-hover:fill-white"
						fill="gray"
						viewBox="0 0 24 24"
					>
						<path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm6 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4zm6 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4z" />
					</svg>
				)}
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-3xl bg-zinc-900 border-white/10">
					<DialogHeader>
						<DialogTitle className="text-white text-xl">
							Music Code - {trackName}
						</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center gap-6 p-6">
						{error ? (
							<p className="text-red-500">{error}</p>
						) : barcodeImage ? (
							<>
								<div className="bg-white p-4 rounded-lg">
									<img
										src={barcodeImage}
										alt="Music Barcode"
										className="w-full max-w-2xl"
									/>
								</div>
								<p className="text-sm text-zinc-400 text-center">
									Scan this code with your camera to instantly play this track
								</p>
							</>
						) : (
							<p className="text-zinc-400">Generating barcode...</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
