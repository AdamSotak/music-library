import { Button } from "@/components/ui/button"
import { Modals } from "@/hooks/useModals"
import type { InertiaPageProps } from "@/types"
import { router, usePage } from "@inertiajs/react"
import { format } from "date-fns"

export default function Account() {
	const { user } = usePage().props as unknown as InertiaPageProps
	const { setOpen } = Modals.useConfirmationModal()

	if (!user) {
		return <div>Loading...</div>
	}

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold">Your Account</h1>

			{user.isGuest && (
				<div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
					<h2 className="text-lg font-semibold text-yellow-400 mb-2">Guest Account</h2>
					<p className="text-sm text-zinc-300">
						You are currently using a guest account. Your data will not be saved permanently.
						Consider creating a regular account to save your playlists and preferences.
					</p>
					<Button
						className="mt-3"
						variant={"spotifyGreen"}
						onClick={() => router.visit("/signup")}
					>
						Create Account
					</Button>
				</div>
			)}

			<div className="mt-4 flex flex-col gap-4">
				<div>
					<span className="block text-sm font-medium text-zinc-400 mb-1">
						Name
					</span>
					<div className="text-xl font-semibold text-white">{user?.name}</div>
				</div>
				{!user.isGuest && (
					<div>
						<span className="block text-sm font-medium text-zinc-400 mb-1">
							Email
						</span>
						<div className="text-base text-zinc-200">{user?.email}</div>
					</div>
				)}
				<div>
					<span className="block text-sm font-medium text-zinc-400 mb-1">
						Created At
					</span>
					<div className="text-base text-zinc-200">
						{format(user?.createdAt, "MMM d, yyyy")}
					</div>
				</div>
			</div>

			<div className="flex items-center mt-4 gap-3">
				<Button
					className="mt-4"
					variant={"spotifyGreen"}
					onClick={() => router.post("/logout")}
				>
					Logout
				</Button>

				{!user.isGuest && (
					<Button
						className="mt-4 bg-red-500 text-white"
						variant={"spotifyGreen"}
						onClick={() =>
							setOpen(
								true,
								"Delete Account",
								"Are you sure you want to delete your account?",
								"Delete",
								() => router.post("/delete-account"),
							)
						}
					>
						Delete Account
					</Button>
				)}
			</div>
		</div>
	)
}
