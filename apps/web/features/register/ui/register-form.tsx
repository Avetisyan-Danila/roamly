"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { register } from "../api/register"
import { ApiError } from "@/shared/api/browser"

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
			<label>
				First name
				<input
					value={firstName}
					onChange={event => setFirstName(event.target.value)}
					required
				/>
			</label>

			<label>
				Last name
				<input
					value={lastName}
					onChange={event => setLastName(event.target.value)}
					required
				/>
			</label>

			<label>
				Email
				<input
					type="email"
					value={email}
					onChange={event => setEmail(event.target.value)}
					required
				/>
			</label>

			<label>
				Password
				<input
					type="password"
					value={password}
					onChange={event => setPassword(event.target.value)}
					required
				/>
			</label>

			{error && <p>{error}</p>}

			<button type="submit" disabled={isPending}>
				{isPending ? "Creating account..." : "Register"}
			</button>
		</form>
	)
}
