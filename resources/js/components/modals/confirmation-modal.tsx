import { Modals } from "@/hooks/useModals"
import { Button } from "../ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog"

export const ConfirmationModal = () => {
	const { open, title, description, confirmText, setOpen } =
		Modals.useConfirmationModal()

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				setOpen(open, title, description, confirmText)
				setTimeout(() => {
					setOpen(false)
				}, 200)
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<span className="text-black text-lg font-bold">{title}</span>
					</DialogTitle>
					<DialogDescription>
						<span>{description}</span>
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex flex-row items-center justify-center">
					<Button
						className="text-black"
						variant="spotifyTransparent"
						onClick={() => {
							setOpen(false, title, description, confirmText)
							setTimeout(() => {
								setOpen(false)
							}, 200)
						}}
					>
						Cancel
					</Button>
					<Button variant="spotifyGreen" onClick={() => setOpen(false)}>
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
