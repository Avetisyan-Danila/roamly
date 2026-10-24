"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { login } from "../api/login"
import { loginSchema, type LoginFormValues } from "../model/login.schema"
import { ApiError } from "@/shared/api/browser"
import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function LoginForm() {
	const router = useRouter()

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	async function handleLogin(values: LoginFormValues) {
		try {
			await login(values)

			router.push("/profile")
		} catch (error) {
			if (error instanceof ApiError) {
				form.setError("root.server", { message: "Invalid email or password" })
				return
			}

			form.setError("root.server", { message: "Something went wrong" })
		}
	}

	const { isSubmitting } = form.formState

	return (
		<form onSubmit={form.handleSubmit(handleLogin)} noValidate>
			<FieldGroup>
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Email</FieldLabel>

							<Input
								{...field}
								id={field.name}
								type="email"
								autoComplete="email"
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Password</FieldLabel>

							<Input
								{...field}
								id={field.name}
								type="password"
								autoComplete="current-password"
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<FieldError errors={[form.formState.errors.root?.server]} />

				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Logging in..." : "Login"}
				</Button>
			</FieldGroup>
		</form>
	)
}
