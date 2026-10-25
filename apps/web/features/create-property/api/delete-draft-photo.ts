import { browserApiClient } from "@/shared/api/browser"

export function deleteDraftPhoto(draftId: string, photoId: string) {
	return browserApiClient<void>(
		`/properties/drafts/${draftId}/photos/${photoId}`,
		{
			method: "DELETE",
			auth: true,
		},
	)
}
