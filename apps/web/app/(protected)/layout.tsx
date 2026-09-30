import { redirect } from "next/navigation"

import { getCurrentUser } from "@/entities/user"
import { ApiError } from "@/shared/api/api-error"

import type { ReactNode } from "react"

type ProtectedLayoutProps = {
	children: ReactNode
}

export default async function ProtectedLayout({
	children,
}: ProtectedLayoutProps) {
	try {
		await getCurrentUser()
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			redirect("/login")
		}

		throw error
	}

	return children
}
