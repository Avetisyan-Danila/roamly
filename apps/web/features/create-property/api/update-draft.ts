import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"
import type { DraftProperty } from "./create-draft"

export type UpdateDraftRequest = ApiSchema<"UpdatePropertyDto">

export function updateDraft(id: string, data: UpdateDraftRequest) {
	return browserApiClient<DraftProperty>(`/properties/drafts/${id}`, {
		method: "PATCH",
		json: data,
		auth: true,
	})
}
