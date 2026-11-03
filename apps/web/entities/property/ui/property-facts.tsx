import type { Property } from "../model/types"

type PropertyFactsProps = {
	property: Pick<Property, "maxGuests" | "bedrooms" | "beds" | "bathrooms">
}

export function PropertyFacts({ property }: PropertyFactsProps) {
	const facts = [
		pluralize(property.maxGuests, "guest", "guests"),
		pluralize(property.bedrooms, "bedroom", "bedrooms"),
		pluralize(property.beds, "bed", "beds"),
		pluralize(property.bathrooms, "bath", "baths"),
	]

	return <p>{facts.join(" · ")}</p>
}

function pluralize(count: number, one: string, many: string) {
	return `${count} ${count === 1 ? one : many}`
}
