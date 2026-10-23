import type { UpdateDraftRequest } from "../api/update-draft"
import type { CreatePropertyFormValues } from "./create-property.schema"

// Fields left undefined are dropped by JSON.stringify and stay unchanged in the draft
export function mapUpdateDraftRequest(
	values: Partial<CreatePropertyFormValues>,
): UpdateDraftRequest {
	return {
		title: values.title,
		description: values.description,

		country: values.country,
		city: values.city,
		address: values.address,
		latitude: values.latitude,
		longitude: values.longitude,

		pricePerNight: values.pricePerNight?.toFixed(2),
		currency: values.currency,

		maxGuests: values.maxGuests,
		bedrooms: values.bedrooms,
		beds: values.beds,
		bathrooms: values.bathrooms,

		amenityIds: values.amenityIds,
	}
}
