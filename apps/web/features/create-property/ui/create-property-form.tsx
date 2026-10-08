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
	type PropertyFormStepId,
} from "../model/property-form-steps"
import { mapCreatePropertyRequest } from "../model/map-create-property-request"
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

	const handleNext = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault()

		const isValid = await form.trigger([...currentStepConfig.fields])

		if (!isValid) {
			return
		}

		setCurrentStep(step => Math.min(step + 1, PROPERTY_FORM_STEPS.length - 1))
	}

	const handleBack = () => {
		setCurrentStep(step => Math.max(step - 1, 0))
	}

	const isPreviewStep = currentStepConfig.id === "preview"

	const handlePublish = (values: CreatePropertyFormValues) => {
		const request = mapCreatePropertyRequest(values)

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
									currentStepConfig.id === "amenities" &&
									amenitiesState.status !== "success"
								}
							>
								Next
							</button>
						)}
					</div>
				</form>
			</AmenitiesCatalogContext.Provider>
		</FormProvider>
	)
}
