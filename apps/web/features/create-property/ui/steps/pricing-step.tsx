"use client"

import { Controller, useFormContext } from "react-hook-form"

import {
	currencySchema,
	type CreatePropertyFormValues,
} from "../../model/create-property.schema"
import { NumberInput } from "../number-input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select"

export function PricingStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Pricing</h2>

			<FieldGroup className="grid grid-cols-[1fr_auto]">
				<Controller
					name="pricePerNight"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Price per night</FieldLabel>

							<NumberInput
								{...field}
								id={field.name}
								min="1"
								step="1"
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="currency"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Currency</FieldLabel>

							<Select
								name={field.name}
								value={field.value}
								onValueChange={field.onChange}
							>
								<SelectTrigger
									id={field.name}
									aria-invalid={fieldState.invalid}
								>
									<SelectValue />
								</SelectTrigger>

								<SelectContent>
									{currencySchema.options.map(currency => (
										<SelectItem key={currency} value={currency}>
											{currency}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</FieldGroup>
		</section>
	)
}
