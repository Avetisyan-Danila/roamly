import { browserApiClient } from "@/shared/api/browser"

export type Amenity = {
	id: string
	code: string
	name: string
}

export function getAmenities(signal?: AbortSignal): Promise<Amenity[]> {
	return browserApiClient<Amenity[]>("/amenities", {
		signal,
	})
}
