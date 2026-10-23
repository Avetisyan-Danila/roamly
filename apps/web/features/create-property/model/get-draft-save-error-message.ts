import { ApiError } from "@/shared/api/browser"

export function getDraftSaveErrorMessage(error: unknown): string {
	if (!(error instanceof ApiError)) {
		return "Network error. Check your connection and try again."
	}

	if (error.status === 401) {
		return "Your session has expired. Please log in again."
	}

	if (error.data?.errorCode === "INVALID_PROPERTY_STATUS") {
		return "This property has already been published."
	}

	if (error.status === 403 || error.status === 404) {
		return "Draft not found."
	}

	return "Could not save the draft. Please try again."
}
