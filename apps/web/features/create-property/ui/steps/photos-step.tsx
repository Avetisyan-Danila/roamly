"use client"

import { useController, useFormContext } from "react-hook-form"

import type { CreatePropertyFormValues } from "../../model/create-property.schema"
import { PhotoPreview } from "./photo-preview"

export function PhotosStep() {
	const {
		control,
		formState: { errors },
	} = useFormContext<CreatePropertyFormValues>()

	const { field } = useController({
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
		<section>
			<h2>Photos</h2>

			<input
				type="file"
				accept="image/jpeg,image/png,image/webp"
				multiple
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

			{errors.photoFiles && <p>{errors.photoFiles.message}</p>}

			<div>
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
