import type { Playlist } from "@/types"
import { router } from '@inertiajs/react'
import { usePlayer } from "@/hooks/usePlayer"
import { Modals } from "@/hooks/useModals"
import { useState, useEffect } from "react"
import axios from "axios"

interface PlaylistShowProps {
    playlist: Playlist
}

interface SearchTrack {
	id: number
	name: string
	artist: string
	album?: string
	album_cover?: string
	duration: number
}

export default function PlaylistShow({ playlist }: PlaylistShowProps) {
    const { currentTrack, isPlaying, setCurrentTrack } = usePlayer()
    const { setOpen: setConfirmModalOpen } = Modals.useConfirmationModal()
    const [isSearchMode, setIsSearchMode] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<SearchTrack[]>([])
    const [isSearching, setIsSearching] = useState(false)

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handlePlayTrack = (track: any, index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentTrack(track, playlist.tracks as any[], index)
    }

    const handleRemoveTrack = (trackId: number, trackName: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setConfirmModalOpen(
            true,
            'Remove from playlist',
            `Remove "${trackName}" from this playlist?`,
            'Remove',
            () => {
                router.delete(`/playlist/${playlist.id}/tracks/${trackId}`, {
                    preserveScroll: true
                })
            }
        )
    }

    // Search for tracks
    useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([])
			return
		}

		const timer = setTimeout(async () => {
			setIsSearching(true)
			try {
				const response = await axios.get(`/api/search/tracks?q=${encodeURIComponent(searchQuery)}`)
				setSearchResults(response.data.tracks || [])
			} catch (error) {
				console.error("Search failed:", error)
				setSearchResults([])
			} finally {
				setIsSearching(false)
			}
		}, 300)

		return () => clearTimeout(timer)
	}, [searchQuery])

    const handleAddTrack = (trackId: number) => {
		router.post(`/playlist/${playlist.id}/tracks`, {
			track_ids: [trackId]
		}, {
			preserveScroll: true,
			preserveState: false,
			onSuccess: () => {
                // Track added successfully - page will auto-refresh
			}
		})
	}

    const totalDuration = playlist.tracks.reduce((sum, track) => sum + track.duration, 0)
    const hours = Math.floor(totalDuration / 3600)
    const minutes = Math.floor((totalDuration % 3600) / 60)

    return (
        <div className="min-h-screen bg-gradient-to-b from-red-900/20 via-black to-black text-white">
            {/* Header */}
            <div className="flex items-end gap-6 px-8 pt-20 pb-6 bg-gradient-to-b from-red-900/30 to-transparent">
                <div className="w-60 h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
                    <img
                        src={playlist.image}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col justify-end pb-2">
                    <p className="text-sm font-bold mb-2">Public Playlist</p>
                    <h1 className="text-8xl font-black mb-6 leading-none">{playlist.name}</h1>
                    <p className="text-zinc-300 text-sm mb-2">{playlist.description}</p>
                    <div className="flex items-center gap-1 text-sm mt-2">
                        <span className="font-bold">Spotify</span>
                        <span>•</span>
                        <span>{playlist.tracks.length} songs,</span>
                        <span className="text-zinc-400">
                            {hours > 0 && `${hours} hr`} {minutes} min
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="px-8 py-6 flex items-center gap-8 bg-black/20">
                <button className="bg-green-500 hover:bg-green-400 hover:scale-105 text-black w-14 h-14 rounded-full flex items-center justify-center transition-all">
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
                <button className="text-zinc-400 hover:text-white transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
                <button className="text-zinc-400 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="19" cy="12" r="2"/>
                    </svg>
                </button>
            </div>

            {/* Track List or Search */}
            <div className="px-8 pb-32">
                {!isSearchMode ? (
                    <>
                        {/* Header */}
                        <div className="grid grid-cols-[16px_6fr_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 h-9 border-b border-white/10 text-sm text-zinc-400 mb-2 items-center">
                            <div className="text-center">#</div>
                            <div>Title</div>
                            <div>Album</div>
                            <div>Date added</div>
                            <div className="flex justify-end">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.508 6.508 0 0 0 8 1.5zM8 13A5 5 0 1 1 13 8 5.006 5.006 0 0 1 8 13z"/>
                                    <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4A.75.75 0 0 1 8 3.25z"/>
                                </svg>
                            </div>
                        </div>

                        {/* Tracks */}
                        {playlist.tracks.map((track, index) => {
                            const isCurrentTrack = currentTrack?.id === track.id
                            return (
                                <div
                                    key={track.id}
                                    className={`grid grid-cols-[16px_6fr_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 h-14 rounded-md group cursor-pointer items-center ${
                                        isCurrentTrack ? 'bg-white/10' : 'hover:bg-white/10'
                                    }`}
                                >
                                    <div className="text-center text-sm group-hover:hidden flex justify-center">
                                        {isCurrentTrack && isPlaying ? (
                                            <div className="flex items-center gap-[2px]">
                                                <span className="w-[3px] h-3 bg-green-500 animate-pulse" style={{ animationDelay: '0ms' }}></span>
                                                <span className="w-[3px] h-2 bg-green-500 animate-pulse" style={{ animationDelay: '150ms' }}></span>
                                                <span className="w-[3px] h-3 bg-green-500 animate-pulse" style={{ animationDelay: '300ms' }}></span>
                                            </div>
                                        ) : (
                                            <span className={isCurrentTrack ? 'text-green-500' : 'text-zinc-400'}>
                                                {index + 1}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handlePlayTrack(track, index, e)}
                                        className="hidden group-hover:flex justify-center"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={track.album_cover || `https://via.placeholder.com/40?text=${encodeURIComponent(track.album || 'Track')}`}
                                            alt={track.album || track.name}
                                            className="w-10 h-10 flex-shrink-0 rounded"
                                        />
                                        <div className="min-w-0">
                                            <div className={`text-base truncate ${isCurrentTrack ? 'text-green-500' : 'text-white'}`}>
                                                {track.name}
                                            </div>
                                            <div className="text-sm text-zinc-400 hover:text-white hover:underline cursor-pointer truncate">
                                                {track.artist}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="text-zinc-400 text-sm hover:text-white hover:underline cursor-pointer truncate"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (track.album_id) {
                                                router.visit(`/album/${track.album_id}`)
                                            }
                                        }}
                                    >
                                        {track.album}
                                    </div>
                                    <div className="text-zinc-400 text-sm">12 hours ago</div>
                                    <div className="flex items-center justify-end gap-4">
                                        <button className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                        </button>
                                        <span className="text-zinc-400 text-sm">
                                            {formatDuration(track.duration)}
                                        </span>
                                        <button
                                            onClick={(e) => handleRemoveTrack(track.id, track.name, e)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-all"
                                            title="Remove from playlist"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Add Songs Button */}
                        <div className="mt-8">
                            <button
                                onClick={() => setIsSearchMode(true)}
                                className="flex items-center gap-4 px-4 py-4 w-full rounded-md hover:bg-white/5 transition-colors text-zinc-400 hover:text-white group"
                            >
                                <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-medium text-base">Add songs</div>
                                    <div className="text-sm">Search for songs to add to this playlist</div>
                                </div>
                            </button>
                        </div>
                    </>
                ) : (
                    /* Search Mode */
                    <div className="py-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Let's find something for your playlist</h2>
                            <button
                                onClick={() => {
                                    setIsSearchMode(false)
                                    setSearchQuery("")
                                    setSearchResults([])
                                }}
                                className="text-zinc-400 hover:text-white"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-6 max-w-md">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for songs or episodes"
                                className="w-full bg-zinc-800 text-white px-4 py-3 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-white/20"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Search Results */}
                        {isSearching ? (
                            <div className="text-center py-8 text-zinc-400">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-1">
                                {searchResults.map((track) => (
                                    <div
                                        key={track.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-white/5 group"
                                    >
                                        <img
                                            src={track.album_cover || `https://placehold.co/48x48/333/white?text=${encodeURIComponent(track.album || "T")}`}
                                            alt={track.name}
                                            className="w-12 h-12 rounded flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white truncate">{track.name}</div>
                                            <div className="text-sm text-zinc-400 truncate">{track.artist}</div>
                                        </div>
                                        <div className="text-sm text-zinc-400 mr-2">
                                            {formatDuration(track.duration)}
                                        </div>
                                        <button
                                            onClick={() => handleAddTrack(track.id)}
                                            className="bg-transparent border border-zinc-600 hover:border-white hover:bg-white hover:text-black text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : searchQuery ? (
                            <div className="text-center py-8 text-zinc-400">No results found</div>
                        ) : (
                            <div className="text-center py-8 text-zinc-400">
                                Search for songs to add to this playlist
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
