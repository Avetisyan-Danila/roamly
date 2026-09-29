"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { logout } from "../api/logout"

export function LogoutButton() {
	const router = useRouter()
	const [isPending, setIsPending] = useState(false)

	async function handleLogout() {
		setIsPending(true)

		try {
			await logout()

			router.replace("/login")
		} finally {
			setIsPending(false)
		}
	}

	return (
		<button type="button" onClick={handleLogout} disabled={isPending}>
			{isPending ? "Logging out..." : "Logout"}
		</button>
	)
}
