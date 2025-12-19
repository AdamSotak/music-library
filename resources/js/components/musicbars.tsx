import { useMemo, useState } from "react"
import { Button } from "./ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"
import { QrCode } from "lucide-react"

interface MusicBarcodeProps {
	trackId: string
	trackName: string
}

export default function MusicBarcode({
	trackId,
	trackName,
}: MusicBarcodeProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [mode, setMode] = useState<"qr" | "barcode">("qr")

	const trackUrl = useMemo(
		() => `${window.location.origin}/tracks/${encodeURIComponent(trackId)}`,
		[trackId],
	)

	// QR via qrserver.com
	const qrUrl = useMemo(
		() =>
			`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
				trackUrl,
			)}`,
		[trackUrl],
	)

	// Code128 via bwip-js API
	// bcid=code128; scale=3; height=15mm; includetext shows the human-readable text below
	const barcodeUrl = useMemo(
		() =>
			`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
				trackId,
			)}&scale=3&includetext&height=15&paddingwidth=12&paddingheight=10`,
		[trackId],
	)

	const imageUrl = mode === "qr" ? qrUrl : barcodeUrl

	return (
		<>
			<div className="flex items-center gap-2">
				<Button
					onClick={() => {
						setMode("qr")
						setIsOpen(true)
					}}
					variant="spotifyTransparent"
					size="icon"
					className="group"
					aria-label="Show QR"
				>
					<QrCode className="min-w-7 min-h-7 text-gray-400 transition-colors duration-300 group-hover:text-white" />
				</Button>
			</div>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-xl bg-zinc-900 border-white/10">
					<DialogHeader>
						<DialogTitle className="text-white text-xl">
							{mode === "qr" ? "Open on phone — " : "Barcode — "} {trackName}
						</DialogTitle>
						<DialogDescription className="text-zinc-400">
							{mode === "qr"
								? "Scan this QR with your phone’s camera to open the track."
								: "Scan this Code128 barcode. Some phones support barcodes in the camera; if not, use a barcode app."}
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 p-6">
						<div className="bg-white p-4 rounded">
							<img
								src={imageUrl}
								alt={
									mode === "qr"
										? `QR code for ${trackName}`
										: `Code128 barcode for ${trackId}`
								}
								className="block w-[360px] h-[360px] object-contain"
								width={360}
								height={360}
								loading="eager"
							/>
						</div>
						{mode === "qr" && (
							<p className="text-xs text-zinc-400 break-all">URL: {trackUrl}</p>
						)}
						<div className="flex gap-2">
							<Button
								onClick={() => setMode("qr")}
								variant={mode === "qr" ? "default" : "spotifyTransparent"}
							>
								QR
							</Button>
							<Button
								onClick={() => setMode("barcode")}
								variant={mode === "barcode" ? "default" : "spotifyTransparent"}
							>
								Barcode
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
