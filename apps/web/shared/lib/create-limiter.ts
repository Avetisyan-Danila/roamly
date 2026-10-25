export function createLimiter(limit: number) {
	let active = 0

	const queue: (() => void)[] = []

	return async function run<T>(task: () => Promise<T>): Promise<T> {
		if (active < limit) {
			active++
		} else {
			// A finishing task hands its slot over without decrementing, so a new caller cannot take it in between
			await new Promise<void>(resolve => queue.push(resolve))
		}

		try {
			return await task()
		} finally {
			const next = queue.shift()

			if (next) {
				next()
			} else {
				active--
			}
		}
	}
}
