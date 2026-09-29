export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly data: unknown,
	) {
		super(`API request failed with status ${status}`)

		this.name = "ApiError"
	}
}

export async function parseErrorResponse(response: Response): Promise<unknown> {
	try {
		return await response.json()
	} catch {
		return null
	}
}
