import type { FieldPath } from "react-hook-form"

import type { CreatePropertyFormValues } from "./create-property.schema"

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
		fields: ["country", "city", "address"],
	},
	{
		id: "amenities",
		fields: ["amenityIds"],
	},
	{
		id: "photos",
		fields: ["photoFiles"],
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
