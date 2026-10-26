import type { FieldPath } from "react-hook-form"

import type { DraftProperty } from "../api/create-draft"
import {
	createPropertySchema,
	type CreatePropertyFormValues,
} from "./create-property.schema"

type DraftRequirement = DraftProperty["missingRequirements"][number]

type PropertyFormStep = {
	id: string
	fields: readonly FieldPath<CreatePropertyFormValues>[]
	requirements: readonly DraftRequirement[]
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
		requirements: [
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
		requirements: ["country", "city", "address", "latitude", "longitude"],
	},
	{
		id: "amenities",
		fields: ["amenityIds"],
		requirements: ["amenities"],
	},
	{
		id: "photos",
		fields: [],
		requirements: ["photos"],
	},
	{
		id: "pricing",
		fields: ["pricePerNight", "currency"],
		requirements: ["pricePerNight", "currency"],
	},
	{
		id: "preview",
		fields: [],
		requirements: [],
	},
] as const satisfies readonly PropertyFormStep[]

export type PropertyFormStepId = (typeof PROPERTY_FORM_STEPS)[number]["id"]

// A complete draft has nothing to fill in, so it resumes on the preview
export function getResumeStep(
	missingRequirements: readonly DraftRequirement[],
): number {
	const stepIndex = PROPERTY_FORM_STEPS.findIndex(step =>
		step.requirements.some(requirement =>
			missingRequirements.includes(requirement),
		),
	)

	return stepIndex === -1 ? PROPERTY_FORM_STEPS.length - 1 : stepIndex
}

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
