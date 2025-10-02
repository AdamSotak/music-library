import type { Album } from "@/types"
import { router } from '@inertiajs/react'
import { Modals } from "@/hooks/useModals"

interface AlbumShowProps {
    album: Album
}

export default function AlbumShow({ album }: AlbumShowProps) {
    const { setOpen: setAddToPlaylistModalOpen } = Modals.useAddToPlaylistModal()
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const totalDuration = album.tracks.reduce((total, track) => total + track.duration, 0)
    const hours = Math.floor(totalDuration / 3600)
    const minutes = Math.floor((totalDuration % 3600) / 60)

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-900/20 via-black to-black text-white">
            {/* Header */}
            <div className="flex items-end gap-6 px-8 pt-20 pb-6 bg-gradient-to-b from-blue-900/30 to-transparent">
                <div className="w-60 h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
                    <img
                        src={album.cover}
                        alt={album.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col justify-end pb-2">
                    <p className="text-sm font-bold mb-2">Album</p>
                    <h1 className="text-8xl font-black mb-6 leading-none">{album.name}</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold">{album.artist}</span>
                        <span>•</span>
                        <span>{album.year}</span>
                        <span>•</span>
                        <span>{album.tracks.length} songs,</span>
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
                <button
                    className="text-zinc-400 hover:text-white transition-colors"
                    onClick={() => setAddToPlaylistModalOpen(true, album.tracks.map(t => t.id))}
                    title="Add all tracks to playlist"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 3h2v18H6V3zm4 0h2v18h-2V3zm6 0v18h2V3h-2z"/>
                        <path d="M18 9l6 3-6 3V9z"/>
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

            {/* Track List */}
            <div className="px-8 pb-32">
                {/* Header */}
                <div className="grid grid-cols-[16px_1fr_minmax(120px,1fr)] gap-4 px-4 h-9 border-b border-white/10 text-sm text-zinc-400 mb-2 items-center">
                    <div className="text-center">#</div>
                    <div>Title</div>
                    <div className="flex justify-end">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.508 6.508 0 0 0 8 1.5zM8 13A5 5 0 1 1 13 8 5.006 5.006 0 0 1 8 13z"/>
                            <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4A.75.75 0 0 1 8 3.25z"/>
                        </svg>
                    </div>
                </div>

                {/* Tracks */}
                {album.tracks.map((track, index) => (
                    <div
                        key={track.id}
                        onClick={() => router.visit(`/track/${track.id}`)}
                        className="grid grid-cols-[16px_1fr_minmax(120px,1fr)] gap-4 px-4 h-14 rounded-md hover:bg-white/10 group cursor-pointer items-center"
                    >
                        <div className="text-center text-zinc-400 text-sm group-hover:hidden">
                            {index + 1}
                        </div>
                        <div className="hidden group-hover:flex justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                        <div>
                            <div className="text-white text-base">{track.name}</div>
                            <div className="text-sm text-zinc-400 hover:text-white hover:underline cursor-pointer">
                                {track.artist}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-4">
                            <button
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-all"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setAddToPlaylistModalOpen(true, [track.id])
                                }}
                                title="Add to playlist"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path>
                                </svg>
                            </button>
                            <span className="text-zinc-400 text-sm">
                                {formatDuration(track.duration)}
                            </span>
                            <button className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="5" cy="12" r="2"/>
                                    <circle cx="12" cy="12" r="2"/>
                                    <circle cx="19" cy="12" r="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}