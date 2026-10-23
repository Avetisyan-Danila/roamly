import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type DraftProperty = ApiSchema<"DraftPropertyResponseDto">

export function createDraft() {
	return browserApiClient<DraftProperty>("/properties/drafts", {
		method: "POST",
		auth: true,
	})
}
