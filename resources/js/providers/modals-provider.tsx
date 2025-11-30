import { ConfirmationModal } from "@/components/modals/confirmation-modal"
import { EditPlaylistDetailsModal } from "@/components/modals/edit-playlist-details-modal"
import { AddToPlaylistModal } from "@/components/modals/add-to-playlist-modal"
import { JamPanel } from "@/components/modals/jam-panel"
import { usePage } from "@inertiajs/react"
import type { InertiaPageProps } from "@/types"

export default function ModalsProvider() {
	const { user } = usePage().props as unknown as InertiaPageProps
	return (
		<>
			<ConfirmationModal />
			<EditPlaylistDetailsModal />
			<AddToPlaylistModal />
			<JamPanel currentUserName={user?.name ?? null} />
		</>
	)
}
