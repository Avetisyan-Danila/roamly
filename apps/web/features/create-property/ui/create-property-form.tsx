"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { useEffect, useState, type ComponentType, type MouseEvent } from "react"

import {
	createPropertySchema,
	type CreatePropertyFormValues,
} from "../model/create-property.schema"
import {
	PROPERTY_FORM_STEPS,
	parseStepValues,
	type PropertyFormStepId,
} from "../model/property-form-steps"
import { mapUpdateDraftRequest } from "../model/map-update-draft-request"
import { getDraftSaveErrorMessage } from "../model/get-draft-save-error-message"
import { createDraft } from "../api/create-draft"
import { updateDraft } from "../api/update-draft"
import { BasicInformationStep } from "./steps/basic-information-step"
import { LocationStep } from "./steps/location-step"
import { AmenitiesStep } from "./steps/amenities-step"
import { PhotosStep } from "./steps/photos-step"
import { PricingStep } from "./steps/pricing-step"
import { PreviewStep } from "./steps/preview-step"
import { getAmenities } from "@/entities/amenity/api/get-amenities"
import {
	AmenitiesCatalogContext,
	AmenitiesState,
} from "./amenities-catalog-context"

const STEP_COMPONENTS = {
	"basic-information": BasicInformationStep,
	location: LocationStep,
	amenities: AmenitiesStep,
	photos: PhotosStep,
	pricing: PricingStep,
	preview: PreviewStep,
} satisfies Record<PropertyFormStepId, ComponentType>

export function CreatePropertyForm() {
	const [currentStep, setCurrentStep] = useState(0)

	const [draftId, setDraftId] = useState<string | null>(null)

	const [isSaving, setIsSaving] = useState(false)

	const [amenitiesState, setAmenitiesState] = useState<AmenitiesState>({
		status: "loading",
	})

	const [retryCount, setRetryCount] = useState(0)

	useEffect(() => {
		const controller = new AbortController()

		getAmenities(controller.signal)
			.then(amenities => {
				if (controller.signal.aborted) return

				setAmenitiesState({
					status: "success",
					data: amenities,
				})
			})
			.catch(() => {
				if (controller.signal.aborted) return

				setAmenitiesState({ status: "error" })
			})

		return () => {
			controller.abort()
		}
	}, [retryCount])

	const handleAmenitiesRetry = () => {
		setAmenitiesState({ status: "loading" })
		setRetryCount(count => count + 1)
	}

	const form = useForm<CreatePropertyFormValues>({
		resolver: zodResolver(createPropertySchema),
		defaultValues: {
			// Basic information
			title: "",
			description: "",
			maxGuests: 1,
			bedrooms: 1,
			beds: 1,
			bathrooms: 1,

			// Location
			country: "",
			city: "",
			address: "",
			latitude: 0,
			longitude: 0,

			// Amenities
			amenityIds: [],

			// Photos
			photoFiles: [],

			// Pricing
			pricePerNight: 100,
			currency: "EUR",
		},
	})

	const currentStepConfig = PROPERTY_FORM_STEPS[currentStep]

	const CurrentStepComponent = STEP_COMPONENTS[currentStepConfig.id]

	const saveCurrentStep = async (): Promise<boolean> => {
		const { fields } = currentStepConfig

		const isValid = await form.trigger([...fields])

		if (!isValid) {
			return false
		}

		const request = mapUpdateDraftRequest(
			parseStepValues(form.getValues(), fields),
		)

		// Photos step has no draft fields, and the API rejects an empty PATCH
		if (Object.values(request).every(value => value === undefined)) {
			return true
		}

		try {
			const id = draftId ?? (await createDraft()).id

			// Saved before PATCH so a retry after its failure reuses this draft
			setDraftId(id)

			await updateDraft(id, request)

			return true
		} catch (error) {
			form.setError("root.server", {
				message: getDraftSaveErrorMessage(error),
			})

			return false
		}
	}

	const handleNext = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault()

		form.clearErrors("root")
		setIsSaving(true)

		try {
			const isSaved = await saveCurrentStep()

			if (isSaved) {
				setCurrentStep(step =>
					Math.min(step + 1, PROPERTY_FORM_STEPS.length - 1),
				)
			}
		} finally {
			setIsSaving(false)
		}
	}

	const handleBack = () => {
		form.clearErrors("root")
		setCurrentStep(step => Math.max(step - 1, 0))
	}

	const isPreviewStep = currentStepConfig.id === "preview"

	const handlePublish = (values: CreatePropertyFormValues) => {
		const request = mapUpdateDraftRequest(values)

		console.log("Create property request:", request)
		console.log("Photo files:", values.photoFiles)
	}

	return (
		<FormProvider {...form}>
			<AmenitiesCatalogContext.Provider
				value={{
					state: amenitiesState,
					retry: handleAmenitiesRetry,
				}}
			>
				<form onSubmit={form.handleSubmit(handlePublish)}>
					<CurrentStepComponent />

					{form.formState.errors.root?.server && (
						<p>{form.formState.errors.root.server.message}</p>
					)}

					<div>
						{currentStep > 0 && (
							<button type="button" onClick={handleBack}>
								Back
							</button>
						)}

						{isPreviewStep ? (
							<button key="publish" type="submit">
								Publish
							</button>
						) : (
							<button
								key="next"
								type="button"
								onClick={handleNext}
								disabled={
									isSaving ||
									(currentStepConfig.id === "amenities" &&
										amenitiesState.status !== "success")
								}
							>
								{isSaving ? "Saving..." : "Next"}
							</button>
						)}
					</div>
				</form>
			</AmenitiesCatalogContext.Provider>
		</FormProvider>
	)
}
