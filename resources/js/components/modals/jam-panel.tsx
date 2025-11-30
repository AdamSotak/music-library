import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useJamSession } from "@/hooks/useJamSession"
import { Modals } from "@/hooks/useModals"
import { Copy, Loader2, WifiOff, X } from "lucide-react"

type JamPanelProps = {
	currentUserName: string | null
}

export function JamPanel({ currentUserName }: JamPanelProps) {
	const { open, setOpen } = Modals.useJamModal()
	const [joinId, setJoinId] = useState("")
	const [copied, setCopied] = useState(false)

	const {
		sessionId,
		isHost,
		participants,
		inviteLink,
		qrUrl,
		status,
		allowControls,
		setAllowControls,
		startJam,
		endJam,
		joinJam,
	} = useJamSession(currentUserName)

	useEffect(() => {
		if (typeof window === "undefined") return
		const pending = localStorage.getItem("pendingJamId")
		if (pending) {
			setOpen(true)
			setJoinId(pending)
			joinJam(pending)
			localStorage.removeItem("pendingJamId")
		}
	}, [setOpen, joinJam])

	useEffect(() => {
		if (!open) {
			endJam()
		}
	}, [open, endJam])

	const handleCopy = async () => {
		if (!inviteLink) return
		await navigator.clipboard?.writeText(inviteLink)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	const closePanel = () => setOpen(false)

	if (!open) return null

	const renderControls = () => {
		if (sessionId) {
			return (
				<div className="flex items-center justify-between gap-2">
					<div className="text-xs text-zinc-400 truncate">
						Jam ID: {sessionId}
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="text-red-400"
						onClick={endJam}
					>
						Leave
					</Button>
				</div>
			)
		}

		return (
			<div className="flex gap-2">
				<Button
					onClick={startJam}
					disabled={status === "connecting"}
					className="flex-1"
				>
					Start Jam
				</Button>
				<input
					type="text"
					placeholder="Paste Jam ID"
					value={joinId}
					onChange={(e) => setJoinId(e.target.value)}
					className="bg-[#242424] border border-white/10 rounded px-3 py-2 text-sm text-white flex-1"
				/>
				<Button
					variant="outline"
					onClick={() => joinJam(joinId)}
					disabled={!joinId}
					className="border-white/20 text-white"
				>
					Join
				</Button>
			</div>
		)
	}

	const renderInviteSection = () => {
		if (!sessionId || !isHost) return null
		return (
			<div className="space-y-3">
				<div className="text-sm text-zinc-400">Invite friends</div>
				<div className="flex items-center gap-2">
					<input
						readOnly
						value={inviteLink ?? ""}
						className="bg-[#242424] border border-white/10 rounded px-3 py-2 text-xs text-white w-full"
					/>
					<Button
						size="sm"
						variant="ghost"
						onClick={handleCopy}
						className="text-white gap-2"
					>
						<Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
					</Button>
				</div>
				<label className="flex items-center gap-2 text-sm text-zinc-300">
					<input
						type="checkbox"
						checked={allowControls}
						onChange={(e) => setAllowControls(e.target.checked)}
					/>
					Allow others to control playback
				</label>
				{qrUrl && (
					<div className="flex flex-col items-center gap-2 bg-[#191919] border border-white/10 rounded-md p-3">
						<img
							src={qrUrl}
							alt="Jam QR"
							className="w-36 h-36 rounded bg-white"
						/>
						<div className="text-xs text-zinc-400">Scan to join</div>
					</div>
				)}
			</div>
		)
	}

	return (
		<aside className="fixed top-0 right-4 z-[80] h-full w-[340px] bg-[#121212] border border-black/50 shadow-2xl rounded-l-xl flex flex-col">
			<div className="flex items-start justify-between p-4 border-b border-white/10">
				<div>
					<p className="text-xs text-green-400 uppercase tracking-[0.25em]">
						Jam
					</p>
					<p className="text-xs text-zinc-400 mt-1">
						Listen together, anywhere
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={closePanel}
					className="text-white"
					aria-label="Close Jam panel"
				>
					<X className="w-4 h-4" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{renderControls()}

				<div className="flex items-center gap-2 text-sm text-zinc-300">
					{status === "connecting" && (
						<span className="inline-flex items-center gap-2">
							<Loader2 className="w-4 h-4 animate-spin" /> Connecting…
						</span>
					)}
					{status === "connected" && <span>Connected</span>}
					{status === "error" && (
						<span className="inline-flex items-center gap-2 text-red-400">
							<WifiOff className="w-4 h-4" /> WebSocket unavailable (local mode)
						</span>
					)}
				</div>

				{renderInviteSection()}

				<div className="space-y-2">
					<div className="text-sm text-zinc-400">Participants</div>
					<div className="flex flex-col gap-2">
						{participants.length === 0 && (
							<div className="text-xs text-zinc-500">
								No one yet. Start a Jam or join one.
							</div>
						)}
						{participants.map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm"
							>
								<div className="flex items-center gap-2">
									<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center uppercase text-xs font-semibold">
										{p.name.slice(0, 2)}
									</div>
									<div>
										<div className="text-white">{p.name}</div>
										<div className="text-[11px] text-zinc-400">{p.role}</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</aside>
	)
}
