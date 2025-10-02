import type { Track } from "@/types"

interface TrackShowProps {
    track: Track
}

export default function TrackShow({ track }: TrackShowProps) {
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-800/40 via-black to-black text-white">
            {/* Header */}
            <div className="flex items-end gap-6 px-8 pt-20 pb-6 bg-gradient-to-b from-orange-700/50 to-transparent">
                <div className="w-60 h-60 flex-shrink-0 shadow-2xl bg-zinc-800">
                    {track.album ? (
                        <img
                            src={`https://via.placeholder.com/240?text=${encodeURIComponent(track.album)}`}
                            alt={track.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                        </div>
                    )}
                </div>
                <div className="flex flex-col justify-end pb-2">
                    <p className="text-sm font-bold mb-2">Song</p>
                    <h1 className="text-8xl font-black mb-6 leading-none">{track.name}</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold">{track.artist}</span>
                        {track.album && (
                            <>
                                <span>•</span>
                                <span>{track.album}</span>
                            </>
                        )}
                        <span>•</span>
                        <span className="text-zinc-400">{formatDuration(track.duration)}</span>
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

            {/* Lyrics Section */}
            <div className="px-8 pb-32">
                <div className="mt-8 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-6">Lyrics</h2>
                    <div className="text-zinc-400 text-lg leading-relaxed space-y-4">
                        <p>Lyrics not available for this track</p>
                    </div>
                </div>
            </div>
        </div>
    )
}