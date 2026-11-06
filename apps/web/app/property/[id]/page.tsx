import { notFound } from "next/navigation"

import {
	getProperty,
	PropertyAmenities,
	PropertyFacts,
	PropertyGallery,
} from "@/entities/property"
import { BookingWidget } from "@/features/book-property"
import { ApiError } from "@/shared/api/server"

export default async function PropertyPage({
	params,
}: PageProps<"/property/[id]">) {
	const { id } = await params

	const property = await getPropertyOrNotFound(id)

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold">{property.title}</h1>

				<p className="text-muted-foreground">
					{property.city}, {property.country}
				</p>
			</div>

			<PropertyGallery photos={property.photos} title={property.title} />

			<div className="grid gap-8 md:grid-cols-[1fr_22rem]">
				<div className="flex flex-col divide-y">
					<section className="pb-6">
						<PropertyFacts property={property} />
					</section>

					<section className="py-6">
						<p className="whitespace-pre-line">{property.description}</p>
					</section>

					{property.amenities.length > 0 && (
						<section className="flex flex-col gap-4 py-6">
							<h2 className="text-xl font-semibold">What this place offers</h2>

							<PropertyAmenities amenities={property.amenities} />
						</section>
					)}
				</div>

				<aside className="md:sticky md:top-4 md:self-start">
					<BookingWidget
						pricePerNight={property.pricePerNight}
						currency={property.currency}
						maxGuests={property.maxGuests}
					/>
				</aside>
			</div>
		</main>
	)
}

async function getPropertyOrNotFound(id: string) {
	try {
		return await getProperty(id)
	} catch (error) {
		if (
			error instanceof ApiError &&
			(error.status === 400 || error.status === 404)
		) {
			notFound()
		}

		throw error
	}
}
