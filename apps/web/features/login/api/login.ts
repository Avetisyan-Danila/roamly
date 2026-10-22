import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type LoginRequest = ApiSchema<"LoginDto">

export type LoginResponse = ApiSchema<"LoginResponseDto">

export function login(data: LoginRequest) {
	return browserApiClient<LoginResponse>("/auth/login", {
		method: "POST",
		json: data,
	})
}
