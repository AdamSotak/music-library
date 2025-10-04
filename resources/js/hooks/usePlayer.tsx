import { create } from "zustand"

export interface Track {
	id: number
	name: string
	artist: string
	album: string
	album_id?: number
	album_cover?: string
	duration: number
	audio: string | null
}

interface PlayerState {
	currentTrack: Track | null
	isPlaying: boolean
	queue: Track[]
	currentIndex: number
	setCurrentTrack: (track: Track, queue?: Track[], index?: number) => void
	setIsPlaying: (isPlaying: boolean) => void
	playNext: () => void
	playPrevious: () => void
	clearQueue: () => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
	currentTrack: null,
	isPlaying: false,
	queue: [],
	currentIndex: -1,

	setCurrentTrack: (track, queue = [], index = -1) =>
		set({
			currentTrack: track,
			queue: queue.length > 0 ? queue : [track],
			currentIndex: index >= 0 ? index : 0,
			isPlaying: true,
		}),

	setIsPlaying: (isPlaying) => set({ isPlaying }),

	playNext: () => {
		const { queue, currentIndex } = get()
		if (currentIndex < queue.length - 1) {
			set({
				currentTrack: queue[currentIndex + 1],
				currentIndex: currentIndex + 1,
				isPlaying: true,
			})
		}
	},

	playPrevious: () => {
		const { queue, currentIndex } = get()
		if (currentIndex > 0) {
			set({
				currentTrack: queue[currentIndex - 1],
				currentIndex: currentIndex - 1,
				isPlaying: true,
			})
		}
	},

	clearQueue: () =>
		set({
			currentTrack: null,
			isPlaying: false,
			queue: [],
			currentIndex: -1,
		}),
}))
