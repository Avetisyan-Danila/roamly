"use client"

import { RotateCwIcon, XIcon } from "lucide-react"
import { useEffect, useState, type ComponentProps } from "react"

import type { PropertyPhoto } from "../../api/get-draft-photos"
import type { PhotoUpload } from "../../model/use-draft-photos"
import { useDraftPhotosContext } from "../draft-photos-context"
import { PhotoPreview } from "./photo-preview"
import { Button } from "@/shared/ui/button"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export function PhotosStep() {
	const {
		photos,
		isLoadFailed,
		uploads,
		remainingSlots,
		error,
		reload,
		addFiles,
		removePhoto,
	} = useDraftPhotosContext()

	// Photo URLs expire in 15 minutes, so every visit gets fresh ones
	useEffect(() => {
		reload()
	}, [reload])

	return (
		<section className="flex flex-col gap-4">
			<h2 className="text-lg font-semibold">Photos</h2>

			<Field data-invalid={Boolean(error)}>
				<FieldLabel htmlFor="photos">Add photos</FieldLabel>

				<Input
					id="photos"
					type="file"
					accept="image/jpeg,image/png,image/webp"
					multiple
					disabled={photos === null || remainingSlots <= 0}
					aria-invalid={Boolean(error)}
					onChange={event => {
						addFiles(Array.from(event.target.files ?? []))

						event.target.value = ""
					}}
				/>

				<FieldError>{error}</FieldError>
			</Field>

			{photos === null && !isLoadFailed && (
				<p className="text-muted-foreground">Loading photos...</p>
			)}

			{isLoadFailed && (
				<div className="flex items-center gap-3">
					<p className="text-destructive">Failed to load photos.</p>

					<Button type="button" variant="outline" onClick={reload}>
						Try again
					</Button>
				</div>
			)}

			<div className="grid grid-cols-3 gap-4">
				{photos?.map((photo, index) => (
					<UploadedPhoto
						key={photo.id}
						photo={photo}
						alt={`Photo ${index + 1}`}
						onRemove={() => removePhoto(photo.id)}
					/>
				))}

				{uploads.map(upload => (
					<UploadingPhoto key={upload.key} upload={upload} />
				))}
			</div>
		</section>
	)
}

type UploadedPhotoProps = {
	photo: PropertyPhoto
	alt: string
	onRemove: () => Promise<void>
}

function UploadedPhoto({ photo, alt, onRemove }: UploadedPhotoProps) {
	const [isRemoving, setIsRemoving] = useState(false)

	const handleRemove = async () => {
		setIsRemoving(true)

		try {
			await onRemove()
		} finally {
			setIsRemoving(false)
		}
	}

	return (
		<PhotoPreview source={photo.url} alt={alt} isDimmed={isRemoving}>
			<RemoveButton disabled={isRemoving} onClick={handleRemove} />
		</PhotoPreview>
	)
}

function UploadingPhoto({ upload }: { upload: PhotoUpload }) {
	const { retryUpload, dismissUpload } = useDraftPhotosContext()

	if (upload.status === "uploading") {
		return (
			<PhotoPreview
				source={upload.file}
				alt={upload.file.name}
				caption="Uploading..."
				isDimmed
			/>
		)
	}

	return (
		<PhotoPreview
			source={upload.file}
			alt={upload.file.name}
			caption={<span className="text-destructive">{upload.message}</span>}
			isDimmed
		>
			{upload.canRetry && (
				<Button
					type="button"
					variant="secondary"
					size="icon-sm"
					onClick={() => retryUpload(upload)}
				>
					<RotateCwIcon />

					<span className="sr-only">Retry</span>
				</Button>
			)}

			<RemoveButton onClick={() => dismissUpload(upload.key)} />
		</PhotoPreview>
	)
}

function RemoveButton(props: ComponentProps<typeof Button>) {
	return (
		<Button type="button" variant="secondary" size="icon-sm" {...props}>
			<XIcon />

			<span className="sr-only">Remove</span>
		</Button>
	)
}
