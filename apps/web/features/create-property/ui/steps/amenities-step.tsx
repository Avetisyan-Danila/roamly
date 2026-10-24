"use client"

import { Controller, useFormContext } from "react-hook-form"

import { useAmenitiesCatalog } from "../amenities-catalog-context"
import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"

export function AmenitiesStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	const { state, retry } = useAmenitiesCatalog()

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Amenities</h2>

			{state.status === "loading" && (
				<p className="text-muted-foreground">Loading amenities...</p>
			)}

			{state.status === "error" && (
				<div className="flex items-center gap-3">
					<p className="text-destructive">Failed to load amenities.</p>

					<Button type="button" variant="outline" onClick={retry}>
						Try again
					</Button>
				</div>
			)}

			{state.status === "success" && (
				<>
					{state.data.length === 0 && (
						<p className="text-muted-foreground">No amenities available.</p>
					)}

					<Controller
						name="amenityIds"
						control={control}
						render={({ field, fieldState }) => (
							<>
								<FieldGroup
									data-slot="checkbox-group"
									className="grid grid-cols-2"
								>
									{state.data.map(amenity => (
										<Field
											key={amenity.id}
											orientation="horizontal"
											data-invalid={fieldState.invalid}
										>
											<Checkbox
												id={`amenity-${amenity.id}`}
												name={field.name}
												aria-invalid={fieldState.invalid}
												checked={field.value.includes(amenity.id)}
												onCheckedChange={checked => {
													field.onChange(
														checked
															? [...field.value, amenity.id]
															: field.value.filter(id => id !== amenity.id),
													)
												}}
											/>

											<FieldLabel
												htmlFor={`amenity-${amenity.id}`}
												className="font-normal"
											>
												{amenity.name}
											</FieldLabel>
										</Field>
									))}
								</FieldGroup>

								<FieldError errors={[fieldState.error]} />
							</>
						)}
					/>
				</>
			)}
		</section>
	)
}
