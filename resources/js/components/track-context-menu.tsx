import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { RadioIcon } from "@/utils/icons"
import { router } from "@inertiajs/react"
import { ReactNode } from "react"

type TrackContextMenuProps = {
	trackId: string
	artistId?: string
	albumId?: string
	children: ReactNode
}

export function TrackContextMenu({
	trackId,
	artistId,
	albumId,
	children,
}: TrackContextMenuProps) {
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-56">
				<ContextMenuItem
					onSelect={(event) => {
						event.preventDefault()
						router.visit(`/radio?seed_type=track&seed_id=${trackId}`)
					}}
					className="flex items-center gap-2"
				>
					<RadioIcon className="w-4 h-4 text-zinc-400" />
					Go to song radio
				</ContextMenuItem>
				{artistId && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							router.visit(`/artist/${artistId}`)
						}}
					>
						Go to artist
					</ContextMenuItem>
				)}
				{albumId && (
					<ContextMenuItem
						onSelect={(event) => {
							event.preventDefault()
							router.visit(`/albums/${albumId}`)
						}}
					>
						Go to album
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	)
}
