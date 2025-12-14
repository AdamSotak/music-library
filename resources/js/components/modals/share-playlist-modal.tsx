import { Modals } from "@/hooks/useModals"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { usePage, router } from "@inertiajs/react"
import type { InertiaPageProps, SharedUser } from "@/types"
import { useState, useEffect } from "react"
import { Check, X, Users } from "lucide-react"

export const SharePlaylistModal = () => {
	const { open, playlist, setOpen } = Modals.useSharePlaylistModal()
	const { friends } = usePage().props as unknown as InertiaPageProps

	const [isShared, setIsShared] = useState(false)
	const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Initialize state when modal opens
	useEffect(() => {
		if (playlist && open) {
			setIsShared(playlist.is_shared ?? false)
			setSelectedFriendIds(
				playlist.shared_with?.map((u: SharedUser) => u.id) ?? [],
			)
		}
	}, [playlist, open])

	const handleToggleFriend = (friendId: number) => {
		setSelectedFriendIds((prev) =>
			prev.includes(friendId)
				? prev.filter((id) => id !== friendId)
				: [...prev, friendId],
		)
	}

	const handleSave = () => {
		if (!playlist?.id) return

		setIsSubmitting(true)
		router.post(
			`/playlist/${playlist.id}/share`,
			{
				is_shared: isShared,
				user_ids: isShared ? selectedFriendIds : [],
			},
			{
				preserveScroll: true,
				onSuccess: () => {
					setIsSubmitting(false)
					setOpen(false)
				},
				onError: () => {
					setIsSubmitting(false)
				},
			},
		)
	}

	const handleClose = (isOpen: boolean) => {
		if (!isOpen) {
			setOpen(false)
		}
	}

	// Can't share default playlist or if not owner
	const canShare = playlist && !playlist.is_default && playlist.is_owner

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="bg-zinc-800 border-none max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="w-5 h-5" />
						Share Playlist
					</DialogTitle>
					<DialogDescription className="text-zinc-400">
						{canShare
							? "Make this playlist collaborative and invite friends to add songs."
							: "Only the playlist owner can manage sharing settings."}
					</DialogDescription>
				</DialogHeader>

				{canShare ? (
					<div className="space-y-4 py-2">
						{/* Sharing Toggle */}
						<div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
							<div>
								<p className="font-medium text-white">Make collaborative</p>
								<p className="text-sm text-zinc-400">
									Friends can add and remove songs
								</p>
							</div>
							<Switch
								checked={isShared}
								onCheckedChange={setIsShared}
								className="data-[state=checked]:bg-green-500"
							/>
						</div>

						{/* Friends List */}
						{isShared && (
							<div className="space-y-2">
								<p className="text-sm text-zinc-400 font-medium">
									Invite friends ({selectedFriendIds.length} selected)
								</p>

								{friends.length > 0 ? (
									<div className="max-h-64 overflow-y-auto space-y-1">
										{friends.map((friend) => {
											const isSelected = selectedFriendIds.includes(friend.id)
											return (
												<button
													key={friend.id}
													type="button"
													onClick={() => handleToggleFriend(friend.id)}
													className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
														isSelected
															? "bg-green-500/20 hover:bg-green-500/30"
															: "bg-zinc-900 hover:bg-zinc-700"
													}`}
												>
													{/* Avatar placeholder */}
													<div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-medium">
														{friend.name.charAt(0).toUpperCase()}
													</div>

													<div className="flex-1 text-left">
														<p className="font-medium text-white">
															{friend.name}
														</p>
														<p className="text-sm text-zinc-400">
															{friend.email}
														</p>
													</div>

													{/* Selection indicator */}
													<div
														className={`w-6 h-6 rounded-full flex items-center justify-center ${
															isSelected
																? "bg-green-500 text-black"
																: "border-2 border-zinc-600"
														}`}
													>
														{isSelected && <Check className="w-4 h-4" />}
													</div>
												</button>
											)
										})}
									</div>
								) : (
									<div className="text-center py-8 text-zinc-400">
										<Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
										<p>No friends yet</p>
										<p className="text-sm">
											Add friends to share playlists with them
										</p>
									</div>
								)}
							</div>
						)}

						{/* Currently shared with (if editing) */}
						{playlist?.shared_with && playlist.shared_with.length > 0 && (
							<div className="pt-2 border-t border-zinc-700">
								<p className="text-sm text-zinc-400 mb-2">
									Currently shared with:
								</p>
								<div className="flex flex-wrap gap-2">
									{playlist.shared_with.map((user: SharedUser) => (
										<span
											key={user.id}
											className="px-2 py-1 bg-zinc-700 rounded-full text-sm text-zinc-300 flex items-center gap-1"
										>
											{user.name}
											<button
												type="button"
												onClick={() => handleToggleFriend(user.id)}
												className="hover:text-red-400 transition-colors"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="py-8 text-center text-zinc-400">
						<Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
						{playlist?.is_default ? (
							<p>The Liked Songs playlist cannot be shared.</p>
						) : (
							<p>Only the playlist owner can manage sharing.</p>
						)}
					</div>
				)}

				<DialogFooter className="flex flex-row items-center justify-end gap-2 sm:space-x-0">
					<Button
						type="button"
						variant="ghost"
						onClick={() => setOpen(false)}
						className="text-zinc-400 hover:text-white hover:bg-transparent"
					>
						Cancel
					</Button>
					{canShare && (
						<Button
							type="button"
							variant="spotifyWhite"
							onClick={handleSave}
							disabled={isSubmitting}
						>
							{isSubmitting ? "Saving..." : "Save"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
