import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type ConfirmedPhoto = ApiSchema<"ConfirmedPhotoResponseDto">

export function confirmPhotoUpload(draftId: string, uploadId: string) {
	return browserApiClient<ConfirmedPhoto>(
		`/properties/drafts/${draftId}/photos/${uploadId}/confirm`,
		{
			method: "POST",
			auth: true,
		},
	)
}
