"use client"

import { Controller, useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { NumberInput } from "../number-input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Textarea } from "@/shared/ui/textarea"

export function BasicInformationStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Basic information</h2>

			<FieldGroup>
				<Controller
					name="title"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Title</FieldLabel>

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
					name="description"
					control={control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Description</FieldLabel>

							<Textarea
								{...field}
								id={field.name}
								aria-invalid={fieldState.invalid}
							/>

							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<div className="grid grid-cols-2 gap-5">
					<Controller
						name="maxGuests"
						control={control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Max guests</FieldLabel>

								<NumberInput
									{...field}
									id={field.name}
									aria-invalid={fieldState.invalid}
								/>

								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>

					<Controller
						name="bedrooms"
						control={control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Bedrooms</FieldLabel>

								<NumberInput
									{...field}
									id={field.name}
									aria-invalid={fieldState.invalid}
								/>

								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>

					<Controller
						name="beds"
						control={control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Beds</FieldLabel>

								<NumberInput
									{...field}
									id={field.name}
									aria-invalid={fieldState.invalid}
								/>

								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>

					<Controller
						name="bathrooms"
						control={control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Bathrooms</FieldLabel>

								<NumberInput
									{...field}
									id={field.name}
									step="0.5"
									aria-invalid={fieldState.invalid}
								/>

								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
				</div>
			</FieldGroup>
		</section>
	)
}
