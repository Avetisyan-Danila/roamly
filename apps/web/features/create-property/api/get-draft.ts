import "server-only"

import { serverApiClient } from "@/shared/api/server"
import type { DraftProperty } from "./create-draft"

export function getDraft(id: string) {
	return serverApiClient<DraftProperty>(`/properties/drafts/${id}`, {
		auth: true,
	})
}
