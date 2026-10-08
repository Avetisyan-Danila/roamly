"use client"

import { useFormContext, useWatch } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { useAmenitiesCatalog } from "../amenities-catalog-context"

export function PreviewStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	const { state: amenitiesState } = useAmenitiesCatalog()

	const values = useWatch({
		control,
	})

	const amenityIds = values.amenityIds ?? []
	const photoFiles = values.photoFiles ?? []

	return (
		<section>
			<h2>Preview</h2>

			<div>
				<h3>Basic information</h3>

				<p>Title: {values.title}</p>
				<p>Description: {values.description}</p>
				<p>Max guests: {values.maxGuests}</p>
				<p>Bedrooms: {values.bedrooms}</p>
				<p>Beds: {values.beds}</p>
				<p>Bathrooms: {values.bathrooms}</p>
			</div>

			<div>
				<h3>Location</h3>

				<p>Country: {values.country}</p>
				<p>City: {values.city}</p>
				<p>Address: {values.address}</p>
			</div>

			<div>
				<h3>Amenities</h3>

				{amenityIds.length === 0 ? (
					<p>No amenities selected</p>
				) : (
					<ul>
						{amenityIds.map(amenityId => {
							const amenity =
								amenitiesState.status === "success"
									? amenitiesState.data.find(item => item.id === amenityId)
									: undefined

							return <li key={amenityId}>{amenity?.name ?? amenityId}</li>
						})}
					</ul>
				)}
			</div>

			<div>
				<h3>Photos</h3>

				<p>{photoFiles.length} photo(s) selected</p>

				<ul>
					{photoFiles.map(file => (
						<li key={`${file.name}-${file.size}-${file.lastModified}`}>
							{file.name}
						</li>
					))}
				</ul>
			</div>

			<div>
				<h3>Pricing</h3>

				<p>
					Price per night: {values.pricePerNight} {values.currency}
				</p>
			</div>
		</section>
	)
}
