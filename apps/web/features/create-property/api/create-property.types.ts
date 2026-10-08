import type { CreatePropertyFormValues } from "../model/create-property.schema"

export type CreatePropertyRequest = Pick<
	CreatePropertyFormValues,
	| "title"
	| "description"
	| "country"
	| "city"
	| "address"
	| "latitude"
	| "longitude"
	| "currency"
	| "maxGuests"
	| "bedrooms"
	| "beds"
	| "bathrooms"
	| "amenityIds"
> & {
	pricePerNight: string
}
