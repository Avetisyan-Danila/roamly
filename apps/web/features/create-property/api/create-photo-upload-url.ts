import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type CreatePhotoUploadUrlRequest = ApiSchema<"CreatePhotoUploadUrlDto">

export type PhotoUploadUrl = ApiSchema<"PhotoUploadUrlResponseDto">

export function createPhotoUploadUrl(
	draftId: string,
	data: CreatePhotoUploadUrlRequest,
) {
	return browserApiClient<PhotoUploadUrl>(
		`/properties/drafts/${draftId}/photos/upload-url`,
		{
			method: "POST",
			json: data,
			auth: true,
		},
	)
}
