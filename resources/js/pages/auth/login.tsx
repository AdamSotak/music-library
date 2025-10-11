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
import { loginFormSchema } from "@/lib/validation/auth-schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { router } from "@inertiajs/react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

export default function Login() {
	const form = useForm<z.infer<typeof loginFormSchema>>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	const onSubmit = (data: z.infer<typeof loginFormSchema>) => {
		router.post("/login", data, {
			onError: (_) => {
				form.reset()
				form.setError("email", {
					message: "Invalid email address",
				})
				form.setError("password", {
					message: "Invalid password",
				})
			},
		})
	}

	return (
		<div className="w-screen min-h-screen bg-gradient-to-b from-zinc-800/95 to-black flex justify-center px-4">
			<div
				className={cn(
					"flex flex-col justify-start items-center bg-background-base rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-3xl my-8 max-h-[75vh] overflow-y-auto",
					Object.keys(form.formState.errors).length && "max-h-[80vh]",
				)}
			>
				<div className="flex flex-col justify-center items-center w-full">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="40"
						height="40"
						className="sm:w-12 sm:h-12"
					>
						<title>Spotify logo</title>
						<image
							href="/icons/svg/spotify-logo-white.svg"
							width="40"
							height="40"
						/>
					</svg>

					<h1 className="text-[32px] font-bold text-center">
						Log in to Spotify
					</h1>

					<div className="space-y-3 sm:space-y-2 mt-6 w-[47%] min-w-[300px]">
						<div className="flex items-center gap-4 border border-zinc-500 hover:border-white rounded-full py-2.5 cursor-pointer transition-colors">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								className="w-6 h-6 translate-x-8"
							>
								<title>Google logo</title>
								<image
									href="/icons/svg/google-logo.svg"
									width="24"
									height="24"
								/>
							</svg>
							<span className="font-bold text-sm sm:text-base w-full text-center -translate-x-1 sm:-translate-x-2">
								Continue with Google
							</span>
						</div>

						<div className="flex items-center gap-4 border border-zinc-500 hover:border-white rounded-full py-2.5 cursor-pointer transition-colors">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="24"
								viewBox="0 0 30 30"
								width="24"
								className="w-6 h-6 translate-x-8"
							>
								<title>Facebook logo</title>
								<image
									href="/icons/svg/facebook-logo.svg"
									width="30"
									height="30"
								/>
							</svg>
							<span className="font-bold text-sm sm:text-base w-full text-center -translate-x-1 sm:-translate-x-2">
								Continue with Facebook
							</span>
						</div>

						<div className="flex items-center gap-4 border border-zinc-500 hover:border-white rounded-full py-2.5 cursor-pointer transition-colors">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								height="24"
								viewBox="0 0 30 30"
								width="24"
								className="w-6 h-6 translate-x-8"
							>
								<title>Apple logo</title>
								<image href="/icons/svg/apple-logo-white.svg" height="30" />
							</svg>
							<span className="font-bold text-sm sm:text-base w-full text-center -translate-x-1 sm:-translate-x-2">
								Continue with Apple
							</span>
						</div>
					</div>
				</div>

				<hr className="w-[80%] border-t border-zinc-700/50 my-6 sm:my-8" />

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-[47%] min-w-[300px] flex flex-col justify-center items-center gap-4"
					>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Email" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input {...field} type="password" placeholder="Password" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex flex-col gap-10 justify-center mt-3 w-full">
							<Button
								className="w-full py-3 sm:py-2 text-sm sm:text-base"
								variant={"spotifyGreen"}
							>
								Continue
							</Button>

							<span className="text-zinc-400 font-medium text-sm sm:text-base text-center">
								Don&apos;t have an account?
								<a
									href="/signup"
									className="underline cursor-pointer text-white ml-1 sm:ml-2"
								>
									Sign up for Spotify
								</a>
							</span>
						</div>
					</form>
				</Form>
			</div>

			<div className="fixed bottom-0 w-full h-16 sm:h-20 bg-background-base flex justify-center items-center px-4">
				<span className="text-[12px] text-zinc-400 text-center leading-relaxed">
					This site is protected by reCAPTCHA and the Google{" "}
					<span className="underline">Privacy Policy</span> and{" "}
					<span className="underline">Terms of Service</span> apply.
				</span>
			</div>
		</div>
	)
}
