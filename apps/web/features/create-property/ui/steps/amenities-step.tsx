"use client"

import { useFormContext } from "react-hook-form"

import { useAmenitiesCatalog } from "../amenities-catalog-context"
import type { CreatePropertyFormValues } from "../../model/create-property.schema"

export function AmenitiesStep() {
	const { register } = useFormContext<CreatePropertyFormValues>()

	const { state, retry } = useAmenitiesCatalog()

	return (
		<section>
			<h2>Amenities</h2>

			{state.status === "loading" && <p>Loading amenities...</p>}

			{state.status === "error" && (
				<div>
					<p>Failed to load amenities.</p>

					<button type="button" onClick={retry}>
						Try again
					</button>
				</div>
			)}

			{state.status === "success" && (
				<>
					{state.data.length === 0 && <p>No amenities available.</p>}

					{state.data.map(amenity => (
						<label key={amenity.id}>
							<input
								type="checkbox"
								value={amenity.id}
								{...register("amenityIds")}
							/>

							{amenity.name}
						</label>
					))}
				</>
			)}
		</section>
	)
}
