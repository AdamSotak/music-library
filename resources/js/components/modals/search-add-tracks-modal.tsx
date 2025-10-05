import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { router } from "@inertiajs/react"
import { useState, useEffect } from "react"
import axios from "axios"

interface Track {
	id: number
	name: string
	artist: string
	album?: string
	album_cover?: string
	duration: number
}

interface SearchAddTracksModalProps {
	playlistId: number | null
	isOpen: boolean
	onClose: () => void
}

export const SearchAddTracksModal = ({
	playlistId,
	isOpen,
	onClose,
}: SearchAddTracksModalProps) => {
	const [searchQuery, setSearchQuery] = useState("")
	const [tracks, setTracks] = useState<Track[]>([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!searchQuery.trim()) {
			setTracks([])
			return
		}

		const timer = setTimeout(async () => {
			setLoading(true)
			try {
				const response = await axios.get(
					`/api/search/tracks?q=${encodeURIComponent(searchQuery)}`,
				)
				setTracks(response.data.tracks || [])
			} catch (error) {
				console.error("Search failed:", error)
				setTracks([])
			} finally {
				setLoading(false)
			}
		}, 300)

		return () => clearTimeout(timer)
	}, [searchQuery])

	const handleAddTrack = (trackId: number) => {
		if (!playlistId) return

		router.post(
			`/playlist/${playlistId}/tracks`,
			{
				track_ids: [trackId],
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					// Track added successfully
				},
			},
		)
	}

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-zinc-900 border-none max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="text-2xl font-bold">
						Let's find something for your playlist
					</DialogTitle>
				</DialogHeader>

				<div className="mt-4">
					<div className="relative">
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search for songs"
							className="w-full bg-zinc-800 text-white px-4 py-3 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-white/20"
							autoFocus
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
							>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto mt-4">
					{loading ? (
						<div className="text-center py-8 text-zinc-400">Searching...</div>
					) : tracks.length > 0 ? (
						<div className="space-y-1">
							{tracks.map((track) => (
								<div
									key={track.id}
									className="flex items-center gap-3 p-2 rounded hover:bg-white/5 group"
								>
									<img
										src={
											track.album_cover ||
											`https://placehold.co/48x48/333/white?text=${encodeURIComponent(track.album || "T")}`
										}
										alt={track.name}
										className="w-12 h-12 rounded flex-shrink-0"
									/>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-white truncate">
											{track.name}
										</div>
										<div className="text-sm text-zinc-400 truncate">
											{track.artist}
										</div>
									</div>
									<div className="text-sm text-zinc-400 mr-2">
										{formatDuration(track.duration)}
									</div>
									<button
										onClick={() => handleAddTrack(track.id)}
										className="bg-transparent border border-zinc-600 hover:border-white text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
									>
										Add
									</button>
								</div>
							))}
						</div>
					) : searchQuery ? (
						<div className="text-center py-8 text-zinc-400">
							No results found
						</div>
					) : (
						<div className="text-center py-8 text-zinc-400">
							Search for songs to add to this playlist
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
