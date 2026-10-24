"use client"

import { useController, useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { PhotoPreview } from "./photo-preview"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function PhotosStep() {
	const { control } = useFormContext<CreatePropertyFormValues>()

	const { field, fieldState } = useController({
		name: "photoFiles",
		control,
	})

	function getFileKey(file: File) {
		return `${file.name}-${file.size}-${file.lastModified}-${file.type}`
	}

	const handleRemove = (indexToRemove: number) => {
		field.onChange(field.value.filter((_, index) => index !== indexToRemove))
	}

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Photos</h2>

			<Field data-invalid={fieldState.invalid}>
				<FieldLabel htmlFor={field.name}>Add photos</FieldLabel>

				<Input
					id={field.name}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					multiple
					aria-invalid={fieldState.invalid}
					onChange={event => {
						const selectedFiles = Array.from(event.target.files ?? [])

						const filesByKey = new Map(
							field.value.map(file => [getFileKey(file), file]),
						)

						selectedFiles.forEach(file => {
							filesByKey.set(getFileKey(file), file)
						})

						field.onChange(Array.from(filesByKey.values()))

						event.target.value = ""
					}}
				/>

				<FieldError errors={[fieldState.error]} />
			</Field>

			<div className="grid grid-cols-3 gap-4">
				{field.value.map((file, index) => (
					<PhotoPreview
						key={getFileKey(file)}
						file={file}
						onRemove={() => handleRemove(index)}
					/>
				))}
			</div>
		</section>
	)
}
