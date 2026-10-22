import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type RegisterRequest = ApiSchema<"RegisterDto">

export type RegisterResponse = ApiSchema<"UserResponseDto">

export function register(data: RegisterRequest) {
	return browserApiClient<RegisterResponse>("/auth/register", {
		method: "POST",
		json: data,
	})
}
