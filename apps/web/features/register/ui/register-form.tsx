"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { register } from "../api/register"
import { ApiError } from "@/shared/api/browser"
import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function RegisterForm() {
	const router = useRouter()

	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [firstName, setFirstName] = useState("")
	const [lastName, setLastName] = useState("")

	const [error, setError] = useState<string | null>(null)
	const [isPending, setIsPending] = useState(false)

	async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault()

		setError(null)
		setIsPending(true)

		try {
			await register({
				email,
				password,
				firstName,
				lastName,
			})

			router.push("/login")
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.status === 409) {
					setError("Email is already in use")
					return
				}

				setError("Registration failed")
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
				<div className="grid grid-cols-2 gap-5">
					<Field>
						<FieldLabel htmlFor="firstName">First name</FieldLabel>

						<Input
							id="firstName"
							autoComplete="given-name"
							value={firstName}
							onChange={event => setFirstName(event.target.value)}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="lastName">Last name</FieldLabel>

						<Input
							id="lastName"
							autoComplete="family-name"
							value={lastName}
							onChange={event => setLastName(event.target.value)}
							required
						/>
					</Field>
				</div>

				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>

					<Input
						id="email"
						type="email"
						autoComplete="email"
						value={email}
						onChange={event => setEmail(event.target.value)}
						required
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>

					<Input
						id="password"
						type="password"
						autoComplete="new-password"
						value={password}
						onChange={event => setPassword(event.target.value)}
						required
					/>
				</Field>

				<FieldError>{error}</FieldError>

				<Button type="submit" disabled={isPending}>
					{isPending ? "Creating account..." : "Register"}
				</Button>
			</FieldGroup>
		</form>
	)
}
