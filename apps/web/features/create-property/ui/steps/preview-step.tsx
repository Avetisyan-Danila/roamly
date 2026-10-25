"use client"

import { useEffect } from "react"
import { useFormContext, useWatch } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { useAmenitiesCatalog } from "../amenities-catalog-context"
import { useDraftPhotosContext } from "../draft-photos-context"
import { PhotoPreview } from "./photo-preview"
import { Separator } from "@/shared/ui/separator"

export function PreviewStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	const { state: amenitiesState } = useAmenitiesCatalog()

	const { photos, reload } = useDraftPhotosContext()

	// Photo URLs from the photos step may have expired by now
	useEffect(() => {
		reload()
	}, [reload])

	const values = useWatch({
		control,
	})

	const amenityIds = values.amenityIds ?? []

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

				<div className="grid grid-cols-4 gap-2">
					{photos?.map((photo, index) => (
						<PhotoPreview
							key={photo.id}
							source={photo.url}
							alt={`Photo ${index + 1}`}
						/>
					))}
				</div>
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
