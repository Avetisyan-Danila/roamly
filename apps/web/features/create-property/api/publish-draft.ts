import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type PublishedProperty = ApiSchema<"PropertyResponseDto">

export function publishDraft(id: string) {
	return browserApiClient<PublishedProperty>(`/properties/${id}/publish`, {
		method: "POST",
		auth: true,
	})
}
