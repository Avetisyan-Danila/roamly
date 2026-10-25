import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type PropertyPhoto = ApiSchema<"PropertyPhotoResponseDto">

export function getDraftPhotos(draftId: string) {
	return browserApiClient<PropertyPhoto[]>(
		`/properties/drafts/${draftId}/photos`,
		{
			auth: true,
		},
	)
}
