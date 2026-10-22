import type { ApiSchema } from "./api-schema"

export type ApiErrorResponse = ApiSchema<"ErrorResponseDto">

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly data: ApiErrorResponse | null,
	) {
		super(`API request failed with status ${status}`)

		this.name = "ApiError"
	}
}

// Trusts that error JSON comes from our API in the ErrorResponseDto shape
export async function parseErrorResponse(
	response: Response,
): Promise<ApiErrorResponse | null> {
	try {
		return (await response.json()) as ApiErrorResponse
	} catch {
		return null
	}
}
