"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { login } from "../api/login"
import { ApiError } from "@/shared/api/browser"

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
			<label>
				Email
				<input
					type="email"
					value={email}
					onChange={event => setEmail(event.target.value)}
				/>
			</label>

			<label>
				Password
				<input
					type="password"
					value={password}
					onChange={event => setPassword(event.target.value)}
				/>
			</label>

			{error && <p>{error}</p>}

			<button type="submit" disabled={isPending}>
				{isPending ? "Logging in..." : "Login"}
			</button>
		</form>
	)
}
