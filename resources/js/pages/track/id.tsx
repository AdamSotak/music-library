import type { Track } from "@/types"

interface TrackPageProps {
    track: Track
}

export default function TrackPage({ track }: TrackPageProps) {
    return (
        <div>
            <div
                className="h-64 flex items-end px-4.5 relative"
                style={{ backgroundColor: track.color }}
            >
                <h1 className="text-white text-7xl font-bold mb-6 z-30">
                    {track.name}
                </h1>
                <div className="absolute left-0 right-0 bottom-0 h-32 opacity-30 z-20 bg-gradient-to-b from-transparent to-black" />
            </div>
            <div
                className="h-52 opacity-20 antialiased"
                style={{
                    background: `linear-gradient(to bottom, ${track.color}, transparent)`,
                }}
            />
        </div>
    )
}
