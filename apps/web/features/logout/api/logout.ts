import { browserApiClient } from "@/shared/api/browser"

export function logout() {
	return browserApiClient<void>("/auth/logout", {
		method: "POST",
	})
}
