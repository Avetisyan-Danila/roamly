import { User } from "@/entities/user"
import { browserApiClient } from "@/shared/api/browser"

export type RegisterRequest = {
	email: string
	password: string
	firstName: string
	lastName: string
}

export type RegisterResponse = User

export function register(data: RegisterRequest) {
	return browserApiClient<RegisterResponse>("/auth/register", {
		method: "POST",
		json: data,
	})
}
