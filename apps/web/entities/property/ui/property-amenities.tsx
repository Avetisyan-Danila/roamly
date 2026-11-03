import type { Property } from "../model/types"

type PropertyAmenitiesProps = {
	amenities: Property["amenities"]
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps) {
	return (
		<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{amenities.map(amenity => (
				<li key={amenity.id}>{amenity.name}</li>
			))}
		</ul>
	)
}
