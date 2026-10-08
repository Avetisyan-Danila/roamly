"use client"

import { useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"

export function BasicInformationStep() {
	const {
		register,
		formState: { errors },
	} = useFormContext<CreatePropertyFormValues>()

	return (
		<section>
			<h2>Basic information</h2>

			<div>
				<label htmlFor="title">Title</label>

				<input id="title" type="text" {...register("title")} />

				{errors.title && <p>{errors.title.message}</p>}
			</div>

			<div>
				<label htmlFor="description">Description</label>

				<textarea id="description" {...register("description")} />

				{errors.description && <p>{errors.description.message}</p>}
			</div>

			<div>
				<label htmlFor="maxGuests">Max guests</label>

				<input
					id="maxGuests"
					type="number"
					{...register("maxGuests", {
						valueAsNumber: true,
					})}
				/>

				{errors.maxGuests && <p>{errors.maxGuests.message}</p>}
			</div>

			<div>
				<label htmlFor="bedrooms">Bedrooms</label>

				<input
					id="bedrooms"
					type="number"
					{...register("bedrooms", {
						valueAsNumber: true,
					})}
				/>

				{errors.bedrooms && <p>{errors.bedrooms.message}</p>}
			</div>

			<div>
				<label htmlFor="beds">Beds</label>

				<input
					id="beds"
					type="number"
					{...register("beds", {
						valueAsNumber: true,
					})}
				/>

				{errors.beds && <p>{errors.beds.message}</p>}
			</div>

			<div>
				<label htmlFor="bathrooms">Bathrooms</label>

				<input
					id="bathrooms"
					type="number"
					step="0.5"
					{...register("bathrooms", {
						valueAsNumber: true,
					})}
				/>

				{errors.bathrooms && <p>{errors.bathrooms.message}</p>}
			</div>
		</section>
	)
}
