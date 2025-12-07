import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { twoFactorVerifySchema } from "@/lib/validation/auth-schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { router } from "@inertiajs/react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

export default function VerifyTwoFactor() {
	const form = useForm<z.infer<typeof twoFactorVerifySchema>>({
		resolver: zodResolver(twoFactorVerifySchema),
		defaultValues: {
			code: "",
		},
	})

	const onSubmit = (data: z.infer<typeof twoFactorVerifySchema>) => {
		router.post("/verifyTwoFactorLogin", data, {
			onError: (_) => {
				form.reset()
				form.setError("code", {
					message: "Invalid verification code",
				})
			},
		})
	}

	return (
		<div className="w-screen min-h-screen bg-gradient-to-b from-zinc-800/95 to-black flex justify-center items-center px-4 py-8">
			<div
				className={cn(
					"flex flex-col justify-start items-center bg-background-base rounded-lg p-6 sm:p-8 md:p-10 w-full max-w-md",
					Object.keys(form.formState.errors).length && "pb-8",
				)}
			>
				<div className="flex flex-col justify-center items-center w-full">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						className="mb-4"
					>
						<title>Spotify logo</title>
						<image
							href="/icons/svg/spotify-logo-white.svg"
							width="48"
							height="48"
						/>
					</svg>

					<h1 className="text-2xl sm:text-3xl font-bold text-center mb-3">
						Two-Factor Authentication
					</h1>

					<p className="text-zinc-400 text-sm sm:text-base text-center max-w-sm px-4">
						Enter the 6-digit code from your authenticator app
					</p>
				</div>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full flex flex-col justify-center items-center gap-6 mt-8"
					>
						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel className="text-sm font-semibold">
										Verification Code
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder="000000"
											maxLength={6}
											inputMode="numeric"
											autoComplete="one-time-code"
											className="text-center text-xl sm:text-2xl tracking-[0.5em] sm:tracking-widest py-6 sm:py-7"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							className="w-full py-6 sm:py-7 text-base sm:text-lg font-bold"
							variant={"spotifyGreen"}
						>
							Verify
						</Button>
					</form>
				</Form>
			</div>
		</div>
	)
}
