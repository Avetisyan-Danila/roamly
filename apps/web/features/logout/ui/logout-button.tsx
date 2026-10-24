"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { logout } from "../api/logout"
import { Button } from "@/shared/ui/button"

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
		<Button
			type="button"
			variant="outline"
			onClick={handleLogout}
			disabled={isPending}
		>
			{isPending ? "Logging out..." : "Logout"}
		</Button>
	)
}
