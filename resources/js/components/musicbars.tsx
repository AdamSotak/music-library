import { useMemo, useState } from "react"
import { Button } from "./ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"

interface MusicBarcodeProps {
	trackId: string
	trackName: string
}

export default function MusicBarcode({
	trackId,
	trackName,
}: MusicBarcodeProps) {
	const [isOpen, setIsOpen] = useState(false)

	// Build the track URL and the QR image URL (no packages needed)
	const trackUrl = useMemo(
		() => `${window.location.origin}/tracks/${encodeURIComponent(trackId)}`,
		[trackId],
	)
	const qrUrl = useMemo(
		() =>
			`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(trackUrl)}`,
		[trackUrl],
	)

	return (
		<>
			<Button
				onClick={() => setIsOpen(true)}
				variant="spotifyTransparent"
				size="icon"
				aria-label="Show QR"
			>
				<svg className="min-w-7 min-h-7" fill="gray" viewBox="0 0 24 24">
					<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16 13h4v4h-4v3h-3v-4h3z" />
				</svg>
			</Button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-xl bg-zinc-900 border-white/10">
					<DialogHeader>
						<DialogTitle className="text-white text-xl">
							Open on phone — {trackName}
						</DialogTitle>
						<DialogDescription className="text-zinc-400">
							Scan this QR with your phone to open the track.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 p-6">
						<div className="bg-white p-4 rounded">
							<img
								src={qrUrl}
								alt={`QR code for ${trackName}`}
								className="block w-[360px] h-[360px]"
								width={360}
								height={360}
							/>
						</div>
						<p className="text-xs text-zinc-400 break-all">URL: {trackUrl}</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
