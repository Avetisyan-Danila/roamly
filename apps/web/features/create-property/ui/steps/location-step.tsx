"use client"

import { useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"

export function LocationStep() {
	const {
		register,
		formState: { errors },
	} = useFormContext<CreatePropertyFormValues>()

	return (
		<section>
			<h2>Location</h2>

			<div>
				<label htmlFor="country">Country</label>

				<input id="country" type="text" {...register("country")} />

				{errors.country && <p>{errors.country.message}</p>}
			</div>

			<div>
				<label htmlFor="city">City</label>

				<input id="city" type="text" {...register("city")} />

				{errors.city && <p>{errors.city.message}</p>}
			</div>

			<div>
				<label htmlFor="address">Address</label>

				<input id="address" type="text" {...register("address")} />

				{errors.address && <p>{errors.address.message}</p>}
			</div>
		</section>
	)
}
