import type { CreatePropertyRequest } from "../api/create-property.types"
import type { CreatePropertyFormValues } from "./create-property.schema"

export function mapCreatePropertyRequest(
	values: CreatePropertyFormValues,
): CreatePropertyRequest {
	return {
		title: values.title,
		description: values.description,

		country: values.country,
		city: values.city,
		address: values.address,
		latitude: values.latitude,
		longitude: values.longitude,

		pricePerNight: values.pricePerNight.toFixed(2),
		currency: values.currency,

		maxGuests: values.maxGuests,
		bedrooms: values.bedrooms,
		beds: values.beds,
		bathrooms: values.bathrooms,

		amenityIds: values.amenityIds,
	}
}
