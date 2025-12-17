import { ConfirmationModal } from "@/components/modals/confirmation-modal"
import { EditPlaylistDetailsModal } from "@/components/modals/edit-playlist-details-modal"
import { AddToPlaylistModal } from "@/components/modals/add-to-playlist-modal"
import { usePage } from "@inertiajs/react"
import type { InertiaPageProps } from "@/types"
import { JamModal } from "@/components/modals/jam-modal"
import { SharePlaylistModal } from "@/components/modals/share-playlist-modal"

export default function ModalsProvider() {
	const { user } = usePage().props as unknown as InertiaPageProps
	const currentUserId = user?.id != null ? user.id.toString() : null
	const currentUserName = user?.name ?? null
	return (
		<>
			<ConfirmationModal />
			<EditPlaylistDetailsModal />
			<AddToPlaylistModal />
			<JamModal currentUserId={currentUserId} currentUserName={currentUserName} />
			<SharePlaylistModal />
		</>
	)
}
