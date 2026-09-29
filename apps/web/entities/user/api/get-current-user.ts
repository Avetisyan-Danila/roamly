import "server-only"

import type { User } from "../model/types"
import { serverApiClient } from "@/shared/api/server"

export function getCurrentUser() {
	return serverApiClient<User>("/users/me", {
		auth: true,
	})
}
