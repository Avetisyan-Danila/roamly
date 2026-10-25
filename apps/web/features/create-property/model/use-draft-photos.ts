"use client"

import { useCallback, useRef, useState } from "react"

import { confirmPhotoUpload } from "../api/confirm-photo-upload"
import {
	createPhotoUploadUrl,
	type CreatePhotoUploadUrlRequest,
} from "../api/create-photo-upload-url"
import { deleteDraftPhoto } from "../api/delete-draft-photo"
import { getDraftPhotos, type PropertyPhoto } from "../api/get-draft-photos"
import { uploadPhotoToStorage } from "../api/upload-photo-to-storage"
import { photoFileSchema } from "./create-property.schema"
import { getPhotoUploadError } from "./get-photo-upload-error"
import { ApiError } from "@/shared/api/browser"
import { createLimiter } from "@/shared/lib/create-limiter"

const MAX_PHOTOS = 10

const runTransfer = createLimiter(3)

// Parallel confirms of one draft fail each other's Serializable transaction with 409,
// and each one holds a decoded image in API memory
const runConfirm = createLimiter(1)

export type PhotoUpload = {
	key: string
	file: File
} & (
	| { status: "uploading" }
	| { status: "failed"; message: string; canRetry: boolean }
)

async function uploadPhoto(draftId: string, file: File): Promise<void> {
	const uploadId = await runTransfer(async () => {
		const uploadUrl = await createPhotoUploadUrl(draftId, {
			// Checked by photoFileSchema before the upload starts
			contentType: file.type as CreatePhotoUploadUrlRequest["contentType"],
			sizeBytes: file.size,
		})

		await uploadPhotoToStorage(uploadUrl.uploadUrl, file)

		return uploadUrl.uploadId
	})

	await runConfirm(() => confirmPhotoUpload(draftId, uploadId))
}

export function useDraftPhotos(draftId: string | null) {
	const [photos, setPhotos] = useState<PropertyPhoto[] | null>(null)

	const [isLoadFailed, setIsLoadFailed] = useState(false)

	const [uploads, setUploads] = useState<PhotoUpload[]>([])

	const [error, setError] = useState<string | null>(null)

	const lastReloadIdRef = useRef(0)

	const reload = useCallback(async () => {
		if (!draftId) return

		const reloadId = ++lastReloadIdRef.current

		try {
			const result = await getDraftPhotos(draftId)

			// A slower older response must not overwrite the list after a later change
			if (reloadId !== lastReloadIdRef.current) return

			setPhotos(result)
			setIsLoadFailed(false)
		} catch {
			if (reloadId !== lastReloadIdRef.current) return

			setIsLoadFailed(true)
		}
	}, [draftId])

	const isUploading = uploads.some(upload => upload.status === "uploading")

	const remainingSlots =
		MAX_PHOTOS -
		(photos?.length ?? 0) -
		uploads.filter(upload => upload.status === "uploading").length

	const replaceUpload = (upload: PhotoUpload) => {
		setUploads(items =>
			items.map(item => (item.key === upload.key ? upload : item)),
		)
	}

	const startUpload = async (key: string, file: File) => {
		if (!draftId) return

		try {
			await uploadPhoto(draftId, file)
		} catch (uploadError) {
			replaceUpload({
				key,
				file,
				status: "failed",
				...getPhotoUploadError(uploadError),
			})

			return
		}

		// The tile stays until the photo is in the list, otherwise it blinks
		await reload()

		setUploads(items => items.filter(item => item.key !== key))
	}

	const addFiles = (files: File[]) => {
		setError(null)

		if (files.length > remainingSlots) {
			setError(`You can upload up to ${MAX_PHOTOS} photos.`)
		}

		const newUploads = files
			.slice(0, Math.max(remainingSlots, 0))
			.map((file): PhotoUpload => {
				const key = crypto.randomUUID()

				const result = photoFileSchema.safeParse(file)

				return result.success
					? { key, file, status: "uploading" }
					: {
							key,
							file,
							status: "failed",
							message: result.error.issues[0].message,
							canRetry: false,
						}
			})

		setUploads(items => [...items, ...newUploads])

		newUploads.forEach(upload => {
			if (upload.status === "uploading") {
				startUpload(upload.key, upload.file)
			}
		})
	}

	const retryUpload = (upload: PhotoUpload) => {
		setError(null)

		replaceUpload({ key: upload.key, file: upload.file, status: "uploading" })

		startUpload(upload.key, upload.file)
	}

	const dismissUpload = (key: string) => {
		setUploads(items => items.filter(item => item.key !== key))
	}

	const removePhoto = async (photoId: string) => {
		if (!draftId) return

		setError(null)

		try {
			await deleteDraftPhoto(draftId, photoId)
		} catch (deleteError) {
			// 404: already deleted, the reload below drops it from the list
			if (!(deleteError instanceof ApiError && deleteError.status === 404)) {
				setError("Could not remove the photo. Please try again.")

				return
			}
		}

		await reload()
	}

	const validate = () => {
		if (photos && photos.length > 0) return true

		setError("Add at least one photo.")

		return false
	}

	return {
		photos,
		isLoadFailed,
		uploads,
		isUploading,
		remainingSlots,
		error,
		reload,
		addFiles,
		retryUpload,
		dismissUpload,
		removePhoto,
		validate,
	}
}
