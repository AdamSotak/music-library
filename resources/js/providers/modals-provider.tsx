import { ConfirmationModal } from "@/components/modals/confirmation-modal"
import { EditPlaylistDetailsModal } from "@/components/modals/edit-playlist-details-modal"
import { AddToPlaylistModal } from "@/components/modals/add-to-playlist-modal"

export default function ModalsProvider() {
	return (
		<>
			<ConfirmationModal />
			<EditPlaylistDetailsModal />
			<AddToPlaylistModal />
		</>
	)
}
