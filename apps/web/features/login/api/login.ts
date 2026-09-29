import { User } from "@/entities/user"
import { browserApiClient } from "@/shared/api/browser"

export type LoginRequest = {
	email: string
	password: string
}

export type LoginResponse = {
	user: User
}

export function login(data: LoginRequest) {
	return browserApiClient<LoginResponse>("/auth/login", {
		method: "POST",
		json: data,
	})
}
