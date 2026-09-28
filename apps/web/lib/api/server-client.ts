import "server-only"

import { cookies } from "next/headers"
import { ApiError, parseErrorResponse } from "./api-error"
import { ACCESS_TOKEN_COOKIE_NAME } from "../auth/auth.constants"

type ApiRequestOptions = Omit<RequestInit, "body"> & {
	json?: unknown
	auth?: boolean
}

export async function serverApiClient<T>(
	path: string,
	options: ApiRequestOptions = {},
): Promise<T> {
	const apiUrl = process.env.API_URL

	if (!apiUrl) {
		throw new Error("API_URL is not configured")
	}

	const { json, auth = false, ...requestOptions } = options

	const headers = new Headers(requestOptions.headers)

	if (json !== undefined) {
		headers.set("Content-Type", "application/json")
	}

	if (auth) {
		const cookieStore = await cookies()
		const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

		if (accessToken) {
			headers.set("Cookie", `${ACCESS_TOKEN_COOKIE_NAME}=${accessToken}`)
		}
	}

	const response = await fetch(`${apiUrl}${path}`, {
		...requestOptions,
		headers,
		body: json === undefined ? undefined : JSON.stringify(json),
	})

	if (!response.ok) {
		const data = await parseErrorResponse(response)

		throw new ApiError(response.status, data)
	}

	if (response.status === 204) {
		return undefined as T
	}

	return response.json() as Promise<T>
}
