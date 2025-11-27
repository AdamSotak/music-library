import { create } from "zustand"

export interface Track {
	id: string
	name: string
	artist: string
	artist_id: string
	album: string
	album_id?: string
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
	addToQueue: (tracks: Track[], options?: { playNext?: boolean }) => void
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

	addToQueue: (tracks, options = {}) =>
		set((state) => {
			if (!tracks.length) {
				return {}
			}

			const deduped = tracks.filter(
				(track) => !state.queue.some((queued) => queued.id === track.id),
			)

			if (!deduped.length) {
				return {}
			}

			const nextQueue =
				options.playNext && state.currentIndex >= 0
					? [
							...state.queue.slice(0, state.currentIndex + 1),
							...deduped,
							...state.queue.slice(state.currentIndex + 1),
						]
					: [...state.queue, ...deduped]

			let nextCurrentTrack = state.currentTrack
			let nextIndex = state.currentIndex

			if (!nextCurrentTrack && nextQueue.length) {
				nextCurrentTrack = nextQueue[0]
				nextIndex = 0
			} else if (nextCurrentTrack) {
				const resolvedIndex = nextQueue.findIndex(
					(track) => track.id === nextCurrentTrack?.id,
				)
				nextIndex = resolvedIndex >= 0 ? resolvedIndex : nextIndex
			}

			return {
				queue: nextQueue,
				currentTrack: nextCurrentTrack,
				currentIndex: nextIndex,
			}
		}),

	clearQueue: () =>
		set({
			currentTrack: null,
			isPlaying: false,
			queue: [],
			currentIndex: -1,
		}),
}))
