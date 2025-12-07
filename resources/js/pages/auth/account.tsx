import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Modals } from "@/hooks/useModals"
import type { InertiaPageProps } from "@/types"
import { router, usePage } from "@inertiajs/react"
import { format } from "date-fns"
import { useState } from "react"

export default function Account() {
	const { user } = usePage().props as unknown as InertiaPageProps
	const { setOpen } = Modals.useConfirmationModal()
	const [otpCode, setOtpCode] = useState("")
	const [twoFactorModalState, setTwoFactModalState] = useState<{
		open: boolean
		step?: number
		payload?: string
	}>({
		open: false,
		step: 0,
		payload: "",
	})

	const handleSetup2FA = async () => {
		const response = await fetch("/setupTwoFactor")
		const payload = await response.json()

		setTwoFactModalState({
			open: true,
			step: 0,
			payload: payload.qrCode,
		})
	}

	const handleVerify2FA = async () => {
		if (!otpCode || otpCode.length < 6) return

		const csrfToken = document
			.querySelector('meta[name="csrf-token"]')
			?.getAttribute("content")

		const response = await fetch("/verifyTwoFactor", {
			method: "POST",
			body: JSON.stringify({
				code: otpCode,
			}),
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-TOKEN": csrfToken || "",
			},
		})
		const payload = await response.json()

		if (payload.success) {
			setTwoFactModalState((prev) => ({
				...prev,
				step: 2,
			}))
			// Reload page after a short delay to show success message
			setTimeout(() => {
				router.reload()
			}, 1500)
		}
	}

	const handleDisable2FA = async () => {
		const csrfToken = document
			.querySelector('meta[name="csrf-token"]')
			?.getAttribute("content")

		const response = await fetch("/disableTwoFactor", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-TOKEN": csrfToken || "",
			},
		})

		const payload = await response.json()

		if (payload.success) {
			router.reload()
		}
	}

	if (!user) {
		return <div>Loading...</div>
	}

	return (
		<>
			<div className="p-4">
				<h1 className="text-2xl font-bold">Your Account</h1>

				<div className="mt-4 flex flex-col gap-4">
					<div>
						<span className="block text-sm font-medium text-zinc-400 mb-1">
							Name
						</span>
						<div className="text-xl font-semibold text-white">{user?.name}</div>
					</div>
					<div>
						<span className="block text-sm font-medium text-zinc-400 mb-1">
							Email
						</span>
						<div className="text-base text-zinc-200">{user?.email}</div>
					</div>
					<div>
						<span className="block text-sm font-medium text-zinc-400 mb-1">
							Created At
						</span>
						<div className="text-base text-zinc-200">
							{format(user?.createdAt, "MMM d, yyyy")}
						</div>
					</div>
				</div>

				<div className="mt-4">
					<span className="block text-sm font-medium text-zinc-400 mb-1">
						Two-Factor Authentication
					</span>
					<div className="text-base text-zinc-200 mb-3">
						{user?.twoFactorEnabled ? (
							<span className="text-green-500 font-semibold">Enabled</span>
						) : (
							<span className="text-zinc-400">Disabled</span>
						)}
					</div>
					{user?.twoFactorEnabled ? (
						<Button
							className=" bg-red-500 hover:bg-red-600 text-white"
							variant={"spotifyGreen"}
							onClick={() =>
								setOpen(
									true,
									"Disable 2FA",
									"Are you sure you want to disable two-factor authentication?",
									"Disable",
									handleDisable2FA,
								)
							}
						>
							Disable 2FA
						</Button>
					) : (
						<Button variant={"spotifyWhite"} onClick={handleSetup2FA}>
							Setup 2FA
						</Button>
					)}
				</div>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center mt-6 gap-3">
					<Button
						className="w-full sm:w-auto"
						variant={"spotifyGreen"}
						onClick={() => router.post("/logout")}
					>
						Logout
					</Button>

					<Button
						className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
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
				</div>
			</div>

			<Dialog
				open={twoFactorModalState.open}
				onOpenChange={() => setTwoFactModalState({ open: false })}
			>
				<DialogContent className="bg-accent-foreground border-none max-w-[95vw] sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg sm:text-xl">Setup 2FA</DialogTitle>
						<DialogDescription className="text-sm">
							Follow the steps to enhance your account's security
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-center py-4">
						{twoFactorModalState.step === 0 && (
							<div className="text-center w-full">
								<div className="mb-4">
									<div
										// biome-ignore lint/security/noDangerouslySetInnerHtml: Display the qr code
										dangerouslySetInnerHTML={{
											__html: twoFactorModalState.payload as string,
										}}
										className="max-w-[300px] mx-auto"
									/>
								</div>

								<p className="text-xs sm:text-sm text-zinc-400 mb-6 px-2">
									Scan this QR code with your authenticator app (Google
									Authenticator, Authy, etc.)
								</p>

								<Button
									variant={"spotifyGreen"}
									onClick={() =>
										setTwoFactModalState((prev) => ({
											...prev,
											step: 1,
										}))
									}
									className="w-full sm:w-auto px-8"
								>
									I scanned the code
								</Button>
							</div>
						)}

						{twoFactorModalState.step === 1 && (
							<div className="flex flex-col justify-center items-center text-center w-full gap-4">
								<p className="text-xs sm:text-sm text-zinc-400 mb-2">
									Enter the 6-digit code from your app
								</p>
								<Input
									className="w-full text-center text-xl sm:text-2xl tracking-[0.5em] sm:tracking-widest py-6"
									value={otpCode}
									onChange={(e) =>
										setOtpCode(e.target.value.replace(/[^\d]/, ""))
									}
									placeholder="000000"
									maxLength={6}
									inputMode="numeric"
									autoComplete="one-time-code"
								/>
								<Button
									variant={"spotifyGreen"}
									onClick={handleVerify2FA}
									className="w-full mt-2"
									disabled={otpCode.length !== 6}
								>
									Verify
								</Button>
							</div>
						)}

						{twoFactorModalState.step === 2 && (
							<div className="text-center w-full py-4">
								<div className="mb-4">
									<svg
										className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-500"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<title>Success</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<div className="text-green-500 text-lg sm:text-xl font-semibold mb-3">
									Success!
								</div>
								<p className="text-zinc-400 text-sm sm:text-base px-4">
									Two-factor authentication has been enabled for your account.
								</p>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
