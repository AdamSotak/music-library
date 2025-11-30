import { useEffect } from "react"
import { router } from "@inertiajs/react"

export default function JamShow({ jamId }: { jamId: string }) {
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("pendingJamId", jamId)
			router.visit("/")
		}
	}, [jamId])

	return (
		<div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
			<div className="max-w-xl text-center space-y-4">
				<h1 className="text-3xl font-bold">Join Jam</h1>
				<p className="text-zinc-300">
					Open the app to join Jam <span className="font-mono">{jamId}</span>. If the app is already open
					in this browser, simply return to it; the join prompt will appear.
				</p>
				<button
					onClick={() => router.visit("/")}
					className="bg-white text-black px-4 py-2 rounded font-medium"
				>
					Back to app
				</button>
			</div>
		</div>
	)
}
