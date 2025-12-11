import { create } from "zustand"

export interface Track {
	id: string
	name: string
	artist: string | { name: string; id: string }
	artist_id: string
	album: string | { name: string; id: string; cover: string }
	album_id?: string
	album_cover?: string
	duration: number
	audio: string | null
	// When participating in a Jam session, each queue entry has a stable id.
	// This is attached by the backend as queue_item_id and used only for sync.
	queue_item_id?: string
	position?: number
	deezer_track_id?: string
}

export const getTrackCover = (track?: Track | null) => {
	if (!track) return undefined
	// Prefer flat album_cover if present
	if (track.album_cover) return track.album_cover
	// Fallback to nested album.cover (backend)
	if (typeof track.album === "object" && (track.album as any)?.cover) {
		return (track.album as any).cover
	}
	return undefined
}

interface PlayerState {
	currentTrack: Track | null
	isPlaying: boolean
	queue: Track[]
	currentIndex: number
	onTrackChange?: (track: Track | null, index: number) => void
	onPlayStateChange?: (isPlaying: boolean) => void
	setListeners: (handlers: {
		onTrackChange?: (track: Track | null, index: number) => void
		onPlayStateChange?: (isPlaying: boolean) => void
	}) => void
	setCurrentTrack: (
		track: Track,
		queue?: Track[],
		index?: number,
		options?: { suppressListeners?: boolean },
	) => void
	setIsPlaying: (
		isPlaying: boolean,
		options?: { suppressListeners?: boolean },
	) => void
	playNext: () => void
	playPrevious: () => void
	addToQueue: (tracks: Track[], options?: { playNext?: boolean }) => void
	removeFromQueue: (trackId: string) => void
	clearQueue: () => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
	currentTrack: null,
	isPlaying: false,
	queue: [],
	currentIndex: -1,
	onTrackChange: undefined,
	onPlayStateChange: undefined,

	setListeners: (handlers) => set(() => handlers),

	setCurrentTrack: (track, queue = [], index = -1, options) =>
		set((state) => {
			const next = {
				currentTrack: track,
				queue: queue.length > 0 ? queue : [track],
				currentIndex: index >= 0 ? index : 0,
				isPlaying: true,
			}
			if (!options?.suppressListeners) {
				state.onTrackChange?.(next.currentTrack, next.currentIndex)
				state.onPlayStateChange?.(true)
			}
			return next
		}),

	setIsPlaying: (isPlaying, options) =>
		set((state) => {
			if (!options?.suppressListeners) {
				state.onPlayStateChange?.(isPlaying)
			}
			return { isPlaying }
		}),

	playNext: () => {
		const { queue, currentIndex } = get()
		if (currentIndex < queue.length - 1) {
			set((state) => {
				const next = {
					currentTrack: queue[currentIndex + 1],
					currentIndex: currentIndex + 1,
					isPlaying: true,
				}
				state.onTrackChange?.(next.currentTrack, next.currentIndex)
				state.onPlayStateChange?.(true)
				return next
			})
		}
	},

	playPrevious: () => {
		const { queue, currentIndex } = get()
		if (currentIndex > 0) {
			set((state) => {
				const next = {
					currentTrack: queue[currentIndex - 1],
					currentIndex: currentIndex - 1,
					isPlaying: true,
				}
				state.onTrackChange?.(next.currentTrack, next.currentIndex)
				state.onPlayStateChange?.(true)
				return next
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

	removeFromQueue: (trackId: string) =>
		set((state) => {
			const nextQueue = state.queue.filter((t) => t.id !== trackId)
			let nextIndex = state.currentIndex
			let nextCurrentTrack = state.currentTrack

			// Adjust index if removed track was before current
			if (state.currentTrack) {
				const newIdx = nextQueue.findIndex(
					(t) => t.id === state.currentTrack?.id,
				)
				if (newIdx >= 0) {
					nextIndex = newIdx
				} else {
					// Current track was removed
					nextCurrentTrack = nextQueue[0] || null
					nextIndex = nextCurrentTrack ? 0 : -1
				}
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
