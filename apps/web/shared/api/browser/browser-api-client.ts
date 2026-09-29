import { ApiError, parseErrorResponse } from "../api-error"

type ApiRequestOptions = Omit<RequestInit, "body"> & {
	json?: unknown
	auth?: boolean
}

let refreshPromise: Promise<void> | null = null

export async function browserApiClient<T>(
	path: string,
	options: ApiRequestOptions = {},
): Promise<T> {
	return request<T>(path, options, true)
}

async function request<T>(
	path: string,
	options: ApiRequestOptions,
	canRetryAfterRefresh: boolean,
): Promise<T> {
	const apiUrl = getApiUrl()

	const { json, auth = false, ...requestOptions } = options

	const headers = new Headers(requestOptions.headers)

	if (json !== undefined) {
		headers.set("Content-Type", "application/json")
	}

	const method = (requestOptions.method ?? "GET").toUpperCase()

	if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
		headers.set("X-CSRF-Protection", "enabled")
	}

	const response = await fetch(`${apiUrl}${path}`, {
		...requestOptions,
		headers,
		credentials: "include",
		body: json === undefined ? undefined : JSON.stringify(json),
	})

	if (response.status === 401 && auth && canRetryAfterRefresh) {
		await refreshSession()

		return request<T>(path, options, false)
	}

	if (!response.ok) {
		const data = await parseErrorResponse(response)

		throw new ApiError(response.status, data)
	}

	if (response.status === 204) {
		return undefined as T
	}

	return response.json() as Promise<T>
}

async function refreshSession(): Promise<void> {
	if (!refreshPromise) {
		refreshPromise = performRefresh().finally(() => {
			refreshPromise = null
		})
	}

	return refreshPromise
}

async function performRefresh(): Promise<void> {
	const apiUrl = getApiUrl()

	const response = await fetch(`${apiUrl}/auth/refresh`, {
		method: "POST",
		credentials: "include",
		headers: {
			"X-CSRF-Protection": "enabled",
		},
	})

	if (!response.ok) {
		const data = await parseErrorResponse(response)

		throw new ApiError(response.status, data)
	}
}

function getApiUrl(): string {
	const apiUrl = process.env.NEXT_PUBLIC_API_URL

	if (!apiUrl) {
		throw new Error("NEXT_PUBLIC_API_URL is not configured")
	}

	return apiUrl
}
