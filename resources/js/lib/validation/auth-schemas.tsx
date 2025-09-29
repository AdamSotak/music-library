import { z } from "zod"

export const loginFormSchema = z.object({
	email: z.email({ error: "Invalid email address" }),
	password: z
		.string()
		.min(8, { error: "Password must be at least 8 characters long" }),
})

export const signupFormSchema = z.object({
	name: z.string().min(1, { error: "Name is required" }),
	email: z.email({ error: "Invalid email address" }),
	password: z
		.string()
		.min(8, { error: "Password must be at least 8 characters long" }),
})
