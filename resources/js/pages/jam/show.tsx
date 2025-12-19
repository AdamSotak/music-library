import { useState } from "react"
import { router } from "@inertiajs/react"

export default function JamShow({ jamId }: { jamId: string }) {
	const [joining, setJoining] = useState(false)

	const handleJoin = () => {
		setJoining(true)
		if (typeof window !== "undefined") {
			localStorage.setItem("pendingJamId", jamId)
			// Dispatch event so RightSidebar can listen if already mounted
			window.dispatchEvent(new Event("pending-jam-invite"))
			router.visit("/")
		}
	}

	return (
		<div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
			<div className="max-w-xl text-center space-y-6">
				<div className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center">
					<svg
						className="w-8 h-8 text-black"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
					</svg>
				</div>
				<h1 className="text-3xl font-bold">Join Jam</h1>
				<p className="text-zinc-400 text-sm">
					You've been invited to join a Jam session
				</p>
				<p className="text-zinc-500 text-xs font-mono bg-zinc-900 px-3 py-2 rounded">
					{jamId}
				</p>
				<div className="flex flex-col gap-3">
					<button
						onClick={handleJoin}
						disabled={joining}
						className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-full font-bold text-lg transition-all disabled:opacity-50"
					>
						{joining ? "Joining..." : "Join Session"}
					</button>
					<button
						onClick={() => router.visit("/")}
						className="text-zinc-400 hover:text-white px-4 py-2 text-sm transition-colors"
					>
						Back to app
					</button>
				</div>
			</div>
		</div>
	)
}
