import type { FieldPath } from "react-hook-form"

import {
	createPropertySchema,
	type CreatePropertyFormValues,
} from "./create-property.schema"

type PropertyFormStep = {
	id: string
	fields: readonly FieldPath<CreatePropertyFormValues>[]
}

export const PROPERTY_FORM_STEPS = [
	{
		id: "basic-information",
		fields: [
			"title",
			"description",
			"maxGuests",
			"bedrooms",
			"beds",
			"bathrooms",
		],
	},
	{
		id: "location",
		fields: ["country", "city", "address", "latitude", "longitude"],
	},
	{
		id: "amenities",
		fields: ["amenityIds"],
	},
	{
		id: "photos",
		fields: [],
	},
	{
		id: "pricing",
		fields: ["pricePerNight", "currency"],
	},
	{
		id: "preview",
		fields: [],
	},
] as const satisfies readonly PropertyFormStep[]

export type PropertyFormStepId = (typeof PROPERTY_FORM_STEPS)[number]["id"]

export function parseStepValues(
	values: CreatePropertyFormValues,
	fields: readonly (keyof CreatePropertyFormValues)[],
): Partial<CreatePropertyFormValues> {
	const stepValues = Object.fromEntries(
		fields.map(field => [field, values[field]]),
	)

	// RHF stores raw input; parsing applies schema transforms such as trim
	return createPropertySchema.partial().parse(stepValues)
}
