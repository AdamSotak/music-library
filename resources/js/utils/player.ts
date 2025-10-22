import type { Track as PlayerTrack } from "@/hooks/usePlayer"
import type { Track } from "@/types"

export function toPlayerTrack(track: Track): PlayerTrack {
	return {
		id: track.id,
		name: track.name,
		artist: track.artist,
		artist_id: track.artist_id,
		album: track.album ?? "",
		album_id: track.album_id,
		album_cover: track.album_cover,
		duration: track.duration ?? 0,
		audio: track.audio ?? null,
	}
}

export function toPlayerQueue(tracks: Track[]): PlayerTrack[] {
	return tracks.map(toPlayerTrack)
}
