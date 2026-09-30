const PROTECTED_ROUTE_PREFIXES = ["/profile"] as const

export function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTE_PREFIXES.some(
		route => pathname === route || pathname.startsWith(`${route}/`),
	)
}
