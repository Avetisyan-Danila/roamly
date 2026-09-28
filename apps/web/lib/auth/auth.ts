import { browserApiClient } from "../api/browser-client"

export type LoginRequest = {
	email: string
	password: string
}

type LoginResponse = {
	user: {
		id: string
		email: string
		firstName: string
		lastName: string
	}
}

export const authApi = {
	login(data: LoginRequest) {
		return browserApiClient<LoginResponse>("/auth/login", {
			method: "POST",
			json: data,
		})
	},
}
