"use client"

import { Controller, useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function LocationStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Location</h2>

			<FieldGroup>
				<Controller
					name="country"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Country</FieldLabel>

							<Input
								{...field}
								id={field.name}
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="city"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>City</FieldLabel>

							<Input
								{...field}
								id={field.name}
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="address"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Address</FieldLabel>

							<Input
								{...field}
								id={field.name}
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</FieldGroup>
		</section>
	)
}
