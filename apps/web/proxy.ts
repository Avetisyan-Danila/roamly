import { NextResponse } from "next/server"
import {
	ACCESS_TOKEN_COOKIE_NAME,
	REFRESH_TOKEN_COOKIE_NAME,
} from "./lib/auth/auth.constants"

import type { NextRequest } from "next/server"

type AccessTokenPayload = {
	exp?: number
}

export async function proxy(request: NextRequest) {
	const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value

	if (accessToken && !isAccessTokenExpired(accessToken)) {
		return NextResponse.next()
	}

	const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value

	if (!refreshToken) {
		return redirectToLogin(request)
	}

	const apiUrl = process.env.API_URL

	if (!apiUrl) {
		throw new Error("API_URL is not configured")
	}

	const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
		method: "POST",
		headers: {
			Cookie: `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}`,
		},
		cache: "no-store",
	})

	if (!refreshResponse.ok) {
		return redirectToLogin(request)
	}

	const setCookieHeaders = refreshResponse.headers.getSetCookie()

	const refreshedCookies = setCookieHeaders
		.map(parseSetCookie)
		.filter(cookie => cookie !== null)

	const newAccessToken = refreshedCookies.find(
		cookie => cookie.name === ACCESS_TOKEN_COOKIE_NAME,
	)?.value

	if (!newAccessToken) {
		throw new Error("Refresh response does not contain access token")
	}

	const requestHeaders = new Headers(request.headers)

	const requestCookies = new Map(
		request.cookies.getAll().map(cookie => [cookie.name, cookie.value]),
	)

	for (const cookie of refreshedCookies) {
		requestCookies.set(cookie.name, cookie.value)
	}

	requestHeaders.set(
		"Cookie",
		[...requestCookies].map(([name, value]) => `${name}=${value}`).join("; "),
	)

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	})

	for (const setCookieHeader of setCookieHeaders) {
		response.headers.append("Set-Cookie", setCookieHeader)
	}

	return response
}

export const config = {
	matcher: ["/profile/:path*"],
}

function isAccessTokenExpired(token: string): boolean {
	try {
		const [, payloadPart] = token.split(".")

		if (!payloadPart) {
			return true
		}

		const payload = JSON.parse(
			Buffer.from(payloadPart, "base64url").toString("utf8"),
		) as AccessTokenPayload

		if (typeof payload.exp !== "number") {
			return true
		}

		return payload.exp * 1000 <= Date.now()
	} catch {
		return true
	}
}

function parseSetCookie(
	setCookie: string,
): { name: string; value: string } | null {
	const [nameValue] = setCookie.split(";")

	if (!nameValue) {
		return null
	}

	const separatorIndex = nameValue.indexOf("=")

	if (separatorIndex === -1) {
		return null
	}

	return {
		name: nameValue.slice(0, separatorIndex),
		value: nameValue.slice(separatorIndex + 1),
	}
}

function redirectToLogin(request: NextRequest) {
	const response = NextResponse.redirect(new URL("/login", request.url))

	response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME)
	response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME)

	return response
}
