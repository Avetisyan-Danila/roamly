import type { ApiSchema } from "@/shared/api/api-schema"
import { browserApiClient } from "@/shared/api/browser"

export type Amenity = ApiSchema<"AmenityResponseDto">

export function getAmenities(signal?: AbortSignal): Promise<Amenity[]> {
	return browserApiClient<Amenity[]>("/amenities", {
		signal,
	})
}
