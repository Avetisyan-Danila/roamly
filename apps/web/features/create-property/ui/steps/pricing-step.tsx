"use client"

import { useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"

export function PricingStep() {
	const {
		register,
		formState: { errors },
	} = useFormContext<CreatePropertyFormValues>()

	return (
		<section>
			<h2>Pricing</h2>

			<div>
				<label htmlFor="pricePerNight">Price per night</label>

				<input
					id="pricePerNight"
					type="number"
					min="1"
					step="1"
					{...register("pricePerNight", {
						valueAsNumber: true,
					})}
				/>

				{errors.pricePerNight && <p>{errors.pricePerNight.message}</p>}
			</div>

			<div>
				<label htmlFor="currency">Currency</label>

				<select id="currency" {...register("currency")}>
					<option value="EUR">EUR</option>
					<option value="USD">USD</option>
					<option value="GBP">GBP</option>
					<option value="AMD">AMD</option>
					<option value="RUB">RUB</option>
				</select>

				{errors.currency && <p>{errors.currency.message}</p>}
			</div>
		</section>
	)
}
