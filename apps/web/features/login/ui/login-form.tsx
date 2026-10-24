"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { login } from "../api/login"
import { ApiError } from "@/shared/api/browser"
import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function LoginForm() {
	const router = useRouter()

	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [isPending, setIsPending] = useState(false)

	async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault()

		setError(null)
		setIsPending(true)

		try {
			await login({
				email,
				password,
			})

			router.push("/profile")
		} catch (error) {
			if (error instanceof ApiError) {
				setError("Invalid email or password")
				return
			}

			setError("Something went wrong")
		} finally {
			setIsPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>

					<Input
						id="email"
						type="email"
						autoComplete="email"
						value={email}
						onChange={event => setEmail(event.target.value)}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>

					<Input
						id="password"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={event => setPassword(event.target.value)}
					/>
				</Field>

				<FieldError>{error}</FieldError>

				<Button type="submit" disabled={isPending}>
					{isPending ? "Logging in..." : "Login"}
				</Button>
			</FieldGroup>
		</form>
	)
}
