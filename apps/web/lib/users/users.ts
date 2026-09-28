import "server-only"

import { serverApiClient } from "../api/server-client"

export type UserResponse = {
	id: string
	email: string
	firstName: string
	lastName: string
}

export const usersApi = {
	getMe() {
		return serverApiClient<UserResponse>("/users/me", {
			auth: true,
		})
	},
}
