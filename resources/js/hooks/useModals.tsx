import type { Playlist } from "@/types"
import { create } from "zustand"

interface ConfirmationModalState {
	open: boolean
	title: string
	description: string
	confirmText?: string
	setOpen: (
		open: boolean,
		title?: string,
		description?: string,
		confirmText?: string,
	) => void
}

const useConfirmationModal = create<ConfirmationModalState>((set) => ({
	open: false,
	title: "",
	description: "",
	confirmText: "Confirm",
	setOpen: (open, title = "", description = "", confirmText = "Confirm") =>
		set({ open, title, description, confirmText }),
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

export const Modals = {
	useConfirmationModal,
	useEditPlaylistDetailsModal,
}
