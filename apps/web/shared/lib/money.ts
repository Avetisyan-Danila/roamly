export function toCents(amount: string) {
	return Math.round(Number(amount) * 100)
}

export function formatMoney(cents: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(cents / 100)
}
