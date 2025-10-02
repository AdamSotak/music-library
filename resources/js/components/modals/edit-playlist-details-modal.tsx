import { Modals } from "@/hooks/useModals"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form"
import { Music } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { editPlaylistDetailsSchema } from "@/lib/validation/data-schemas"
import { router } from "@inertiajs/react"
import type { z } from "zod"

type FormData = z.infer<typeof editPlaylistDetailsSchema>

export const EditPlaylistDetailsModal = () => {
	const { open, playlist, setOpen } = Modals.useEditPlaylistDetailsModal()

	const form = useForm<FormData>({
		resolver: zodResolver(editPlaylistDetailsSchema),
		defaultValues: {
			name: playlist?.name || "",
			description: playlist?.description || "",
		},
	})

	const onSubmit = (data: FormData) => {
		if (playlist?.id) {
			// Edit existing playlist
			router.put(`/playlist/${playlist.id}`, data, {
				onSuccess: () => {
					setOpen(false)
					form.reset()
				},
			})
		} else {
			// Create new playlist
			router.post("/playlist", data, {
				onSuccess: () => {
					setOpen(false)
					form.reset()
				},
			})
		}
	}

	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open, playlist)}>
			<DialogContent className="bg-zinc-800 border-none">
				<DialogHeader>
					<DialogTitle>{playlist?.id ? "Edit details" : "Create playlist"}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="flex gap-4 mt-3">
							<div
								className="min-w-36 min-h-36 max-w-36 max-h-36 bg-background-base/20 shadow-background-base flex items-center justify-center"
								style={{
									boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.5)",
								}}
							>
								<Music className="w-12 h-12 text-zinc-500" />
							</div>

							<div className="w-full flex flex-col gap-2 -mt-1.5">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Input
													{...field}
													className="border-none h-10 bg-white/10 placeholder:text-zinc-400 placeholder:text-sm rounded-xs"
													placeholder="Add a name"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<Textarea
													{...field}
													className="border-none h-24 bg-white/10 placeholder:text-zinc-400 resize-none rounded-xs"
													placeholder="Add an optional description"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<DialogFooter className="w-full flex flex-row justify-end items-center">
							<Button
								type="submit"
								className="w-24"
								variant="spotifyWhite"
								disabled={form.formState.isSubmitting}
							>
								{form.formState.isSubmitting ? "Saving..." : "Save"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
