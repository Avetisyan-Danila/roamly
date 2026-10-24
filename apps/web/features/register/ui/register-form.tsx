"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

import { register } from "../api/register"
import {
	registerSchema,
	type RegisterFormValues,
} from "../model/register.schema"
import { ApiError } from "@/shared/api/browser"
import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function RegisterForm() {
	const router = useRouter()

	const form = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			password: "",
		},
	})

	async function handleRegister(values: RegisterFormValues) {
		try {
			await register(values)

			router.push("/login")
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.status === 409) {
					form.setError("email", { message: "Email is already in use" })
					return
				}

				form.setError("root.server", { message: "Registration failed" })
				return
			}

			form.setError("root.server", { message: "Something went wrong" })
		}
	}

	const { isSubmitting } = form.formState

	return (
		<form onSubmit={form.handleSubmit(handleRegister)} noValidate>
			<FieldGroup>
				<div className="grid grid-cols-2 gap-5">
					<Controller
						name="firstName"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>First name</FieldLabel>

								<Input
									{...field}
									id={field.name}
									autoComplete="given-name"
									aria-invalid={fieldState.invalid}
								/>

								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>

					<Controller
						name="lastName"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Last name</FieldLabel>

								<Input
									{...field}
									id={field.name}
									autoComplete="family-name"
									aria-invalid={fieldState.invalid}
								/>

								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
				</div>

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
								autoComplete="new-password"
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<FieldError errors={[form.formState.errors.root?.server]} />

				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Creating account..." : "Register"}
				</Button>
			</FieldGroup>
		</form>
	)
}
