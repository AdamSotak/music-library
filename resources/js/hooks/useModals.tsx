import type { Playlist } from "@/types"
import { create } from "zustand"

interface ConfirmationModalState {
	open: boolean
	title: string
	description: string
	confirmText?: string
	onConfirm?: () => void
	setOpen: (
		open: boolean,
		title?: string,
		description?: string,
		confirmText?: string,
		onConfirm?: () => void,
	) => void
}

const useConfirmationModal = create<ConfirmationModalState>((set) => ({
	open: false,
	title: "",
	description: "",
	confirmText: "Confirm",
	onConfirm: undefined,
	setOpen: (
		open,
		title = "",
		description = "",
		confirmText = "Confirm",
		onConfirm,
	) => set({ open, title, description, confirmText, onConfirm }),
}))

interface PlaylistEditDetailsModalState {
	open: boolean
	playlist: Playlist | null
	setOpen: (open: boolean, playlist?: Playlist | null) => void
}

const useEditPlaylistDetailsModal = create<PlaylistEditDetailsModalState>(
	(set) => ({
		open: false,
		playlist: null,
		setOpen: (open, playlist = null) => set({ open, playlist }),
	}),
)

interface AddToPlaylistModalState {
	open: boolean
	trackIds: string[]
	setOpen: (open: boolean, trackIds?: string[]) => void
}

const useAddToPlaylistModal = create<AddToPlaylistModalState>((set) => ({
	open: false,
	trackIds: [],
	setOpen: (open, trackIds = []) => set({ open, trackIds }),
}))

interface JamModalState {
	open: boolean
	setOpen: (open: boolean) => void
}

const useJamModal = create<JamModalState>((set) => ({
	open: false,
	setOpen: (open) => set({ open }),
}))

export const Modals = {
	useConfirmationModal,
	useEditPlaylistDetailsModal,
	useAddToPlaylistModal,
	useJamModal,
}
