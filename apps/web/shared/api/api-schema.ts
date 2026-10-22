import type { components } from "./generated/schema"

export type ApiSchema<Name extends keyof components["schemas"]> =
	components["schemas"][Name]
