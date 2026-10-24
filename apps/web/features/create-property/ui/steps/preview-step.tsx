"use client"

import { useFormContext, useWatch } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { useAmenitiesCatalog } from "../amenities-catalog-context"
import { Separator } from "@/shared/ui/separator"

export function PreviewStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	const { state: amenitiesState } = useAmenitiesCatalog()

	const values = useWatch({
		control,
	})

	const amenityIds = values.amenityIds ?? []
	const photoFiles = values.photoFiles ?? []

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Preview</h2>

			<div className="flex flex-col gap-1">
				<h3 className="font-medium">Basic information</h3>

				<p>Title: {values.title}</p>
				<p>Description: {values.description}</p>
				<p>Max guests: {values.maxGuests}</p>
				<p>Bedrooms: {values.bedrooms}</p>
				<p>Beds: {values.beds}</p>
				<p>Bathrooms: {values.bathrooms}</p>
			</div>

			<Separator />

			<div className="flex flex-col gap-1">
				<h3 className="font-medium">Location</h3>

				<p>Country: {values.country}</p>
				<p>City: {values.city}</p>
				<p>Address: {values.address}</p>
			</div>

			<Separator />

			<div className="flex flex-col gap-1">
				<h3 className="font-medium">Amenities</h3>

				{amenityIds.length === 0 ? (
					<p className="text-muted-foreground">No amenities selected</p>
				) : (
					<ul className="list-inside list-disc">
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

			<Separator />

			<div className="flex flex-col gap-1">
				<h3 className="font-medium">Photos</h3>

				<p>{photoFiles.length} photo(s) selected</p>

				<ul className="list-inside list-disc">
					{photoFiles.map(file => (
						<li key={`${file.name}-${file.size}-${file.lastModified}`}>
							{file.name}
						</li>
					))}
				</ul>
			</div>

			<Separator />

			<div className="flex flex-col gap-1">
				<h3 className="font-medium">Pricing</h3>

				<p>
					Price per night: {values.pricePerNight} {values.currency}
				</p>
			</div>
		</section>
	)
}
