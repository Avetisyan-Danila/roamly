import type { DraftProperty } from "../api/create-draft"
import type { CreatePropertyFormValues } from "./create-property.schema"

export const DEFAULT_FORM_VALUES: CreatePropertyFormValues = {
	// Basic information
	title: "",
	description: "",
	maxGuests: 1,
	bedrooms: 1,
	beds: 1,
	bathrooms: 1,

	// Location
	country: "",
	city: "",
	address: "",
	latitude: 0,
	longitude: 0,

	// Amenities
	amenityIds: [],

	// Pricing
	pricePerNight: 100,
	currency: "EUR",
}

export function mapDraftToFormValues(
	draft: DraftProperty,
): CreatePropertyFormValues {
	return {
		title: draft.title ?? DEFAULT_FORM_VALUES.title,
		description: draft.description ?? DEFAULT_FORM_VALUES.description,
		maxGuests: draft.maxGuests ?? DEFAULT_FORM_VALUES.maxGuests,
		bedrooms: draft.bedrooms ?? DEFAULT_FORM_VALUES.bedrooms,
		beds: draft.beds ?? DEFAULT_FORM_VALUES.beds,
		bathrooms: draft.bathrooms ?? DEFAULT_FORM_VALUES.bathrooms,

		country: draft.country ?? DEFAULT_FORM_VALUES.country,
		city: draft.city ?? DEFAULT_FORM_VALUES.city,
		address: draft.address ?? DEFAULT_FORM_VALUES.address,
		latitude: draft.latitude ?? DEFAULT_FORM_VALUES.latitude,
		longitude: draft.longitude ?? DEFAULT_FORM_VALUES.longitude,

		amenityIds: draft.amenities.map(amenity => amenity.id),

		pricePerNight:
			draft.pricePerNight === null
				? DEFAULT_FORM_VALUES.pricePerNight
				: Number(draft.pricePerNight),
		currency: draft.currency ?? DEFAULT_FORM_VALUES.currency,
	}
}
