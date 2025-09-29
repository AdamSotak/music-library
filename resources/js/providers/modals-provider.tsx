import { ConfirmationModal } from "@/components/modals/confirmation-modal"
import { EditPlaylistDetailsModal } from "@/components/modals/edit-playlist-details-modal"

export default function ModalsProvider() {
	return (
		<>
			<ConfirmationModal />
			<EditPlaylistDetailsModal />
		</>
	)
}
