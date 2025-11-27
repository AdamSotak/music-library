import { create } from "zustand"

type LikedTracksState = {
	playlistId: string | null
	likedIds: Set<string>
	initialize: (playlistId: string | null, trackIds: string[]) => void
	add: (trackId: string) => void
	remove: (trackId: string) => void
}

export const useLikedTracksStore = create<LikedTracksState>((set) => ({
	playlistId: null,
	likedIds: new Set(),
	initialize: (playlistId, trackIds) =>
		set({
			playlistId,
			likedIds: new Set(trackIds.map((id) => id.toString())),
		}),
	add: (trackId) =>
		set((state) => {
			const next = new Set(state.likedIds)
			next.add(trackId.toString())
			return { likedIds: next }
		}),
	remove: (trackId) =>
		set((state) => {
			const next = new Set(state.likedIds)
			next.delete(trackId.toString())
			return { likedIds: next }
		}),
}))
