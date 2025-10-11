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
import { signupFormSchema } from "@/lib/validation/auth-schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { router } from "@inertiajs/react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

export default function Signup() {
	const form = useForm<z.infer<typeof signupFormSchema>>({
		resolver: zodResolver(signupFormSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
	})

	const onSubmit = (data: z.infer<typeof signupFormSchema>) => {
		router.post("/signup", data, {
			onError: (_) => {
				form.reset()
				form.setError("email", {
					message: "Email already in use",
				})
			},
		})
	}

	return (
		<div className="w-screen min-h-screen bg-background-base flex flex-col justify-center items-center px-4 pt-4 pb-20">
			<div className="w-full flex flex-col justify-center items-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
					<title>Spotify logo</title>
					<image
						href="/icons/svg/spotify-logo-white.svg"
						width="36"
						height="36"
					/>
				</svg>

				<h1 className="lg:text-5xl text-4xl font-bold text-center mt-2">
					Sign up to
					<br />
					start listening
				</h1>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="w-full max-w-xs flex flex-col justify-center items-center mt-8 gap-5"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Mike Wazowski" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input {...field} placeholder="name@domain.com" />
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
										<Input {...field} type="password" placeholder="••••••••" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" variant={"spotifyGreen"}>
							Next
						</Button>
					</form>
				</Form>

				<div className="w-full max-w-xs flex flex-col justify-center items-center">
					<span className="font-bold my-4">or</span>

					<div className="w-full space-y-2">
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
								<title>Apple logo</title>
								<image href="/icons/svg/apple-logo-white.svg" height="30" />
							</svg>
							<span className="font-bold text-sm sm:text-base w-full text-center -translate-x-1 sm:-translate-x-2">
								Continue with Apple
							</span>
						</div>
					</div>
				</div>

				<div className="mt-14 flex flex-col justify-center items-center gap-1.5">
					<span className="text-zinc-400">Already have an account?</span>
					<Button
						variant={"spotifyTransparent"}
						onClick={() => router.visit("/login")}
					>
						Log in
					</Button>
				</div>
			</div>

			<div className="fixed bottom-0 bg-background-base w-full flex justify-center items-center px-4 py-4 pb-6">
				<span className="text-[12px] text-zinc-400 text-center max-w-xs">
					This site is protected by reCAPTCHA and the Google{" "}
					<span className="underline">Privacy Policy</span> and{" "}
					<span className="underline">Terms of Service</span> apply.
				</span>
			</div>
		</div>
	)
}
