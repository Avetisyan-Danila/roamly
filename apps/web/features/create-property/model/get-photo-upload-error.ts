import { ApiError } from "@/shared/api/browser"

type PhotoUploadError = {
	message: string
	canRetry: boolean
}

export function getPhotoUploadError(error: unknown): PhotoUploadError {
	// Network error or a failed PUT to storage: a retry starts over with a new upload URL
	if (!(error instanceof ApiError)) {
		return { message: "Upload failed. Try again.", canRetry: true }
	}

	const errorCode = error.data?.errorCode

	if (errorCode === "INVALID_PHOTO") {
		return { message: "This file is not a valid image.", canRetry: false }
	}

	if (errorCode === "PHOTO_LIMIT_REACHED") {
		return { message: "Maximum 10 photos allowed.", canRetry: false }
	}

	if (errorCode === "INVALID_PROPERTY_STATUS") {
		return {
			message: "This property has already been published.",
			canRetry: false,
		}
	}

	if (errorCode === "PHOTO_UPLOAD_UNAVAILABLE") {
		return { message: "Upload expired. Try again.", canRetry: true }
	}

	if (error.status === 401) {
		return {
			message: "Your session has expired. Please log in again.",
			canRetry: false,
		}
	}

	if (error.status === 403 || error.status === 404) {
		return { message: "Draft not found.", canRetry: false }
	}

	return { message: "Upload failed. Try again.", canRetry: true }
}
