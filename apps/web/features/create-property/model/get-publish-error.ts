import { ApiError } from "@/shared/api/browser"
import { getResumeStep } from "./property-form-steps"

type PublishError = {
	message: string
	step?: number
}

export function getPublishError(error: unknown): PublishError {
	if (!(error instanceof ApiError)) {
		return { message: "Network error. Check your connection and try again." }
	}

	const errorCode = error.data?.errorCode

	if (errorCode === "PROPERTY_INCOMPLETE") {
		return {
			message: "Some details on this step are missing or invalid.",
			step: getResumeStep(error.data?.invalidFields ?? []),
		}
	}

	if (errorCode === "PHOTO_REQUIRED") {
		return {
			message: "Add at least one photo.",
			step: getResumeStep(["photos"]),
		}
	}

	if (errorCode === "INVALID_PROPERTY_STATUS") {
		return { message: "This property has already been published." }
	}

	if (errorCode === "CONCURRENT_MODIFICATION") {
		return { message: "The draft was changed at the same time. Try again." }
	}

	if (error.status === 401) {
		return { message: "Your session has expired. Please log in again." }
	}

	if (error.status === 403 || error.status === 404) {
		return { message: "Draft not found." }
	}

	return { message: "Could not publish the property. Please try again." }
}
