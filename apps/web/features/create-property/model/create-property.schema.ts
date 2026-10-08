import { z } from "zod"

const MAX_PHOTO_SIZE = 10 * 1024 * 1024

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]

const photoFileSchema = z
	.custom<File>(value => value instanceof File, {
		message: "Invalid file",
	})
	.refine(
		file => ALLOWED_PHOTO_TYPES.includes(file.type),
		"Only JPEG, PNG and WebP images are allowed",
	)
	.refine(file => file.size <= MAX_PHOTO_SIZE, "Photo must be 10 MB or less")

export const currencySchema = z.enum(["EUR", "USD", "GBP", "AMD", "RUB"])

export const createPropertySchema = z.object({
	// Basic information
	title: z
		.string()
		.trim()
		.min(3, "Title must be at least 3 characters")
		.max(150, "Title must be 150 characters or less"),

	description: z
		.string()
		.trim()
		.min(10, "Description must be at least 10 characters")
		.max(5000, "Description must be 5000 characters or less"),

	maxGuests: z
		.number()
		.int("Max guests must be a whole number")
		.min(1, "At least 1 guest is required"),

	bedrooms: z
		.number()
		.int("Bedrooms must be a whole number")
		.min(0, "Bedrooms cannot be negative"),

	beds: z
		.number()
		.int("Beds must be a whole number")
		.min(1, "At least 1 bed is required"),

	bathrooms: z
		.number()
		.min(0.5)
		.refine(
			value => Number.isInteger(value * 10),
			"Bathrooms can have at most 1 decimal place",
		),

	// Location
	country: z
		.string()
		.trim()
		.min(2, "Country must be at least 2 characters")
		.max(100, "Country must be 100 characters or less"),

	city: z
		.string()
		.trim()
		.min(1, "City is required")
		.max(100, "City must be 100 characters or less"),

	address: z
		.string()
		.trim()
		.min(3, "Address must be at least 3 characters")
		.max(300, "Address must be 300 characters or less"),

	latitude: z.number(),
	longitude: z.number(),

	// Amenities
	amenityIds: z.array(z.string()),

	// Photos
	photoFiles: z
		.array(photoFileSchema)
		.min(1, "Add at least one photo")
		.max(10, "You can upload up to 10 photos"),

	// Pricing
	pricePerNight: z
		.number()
		.positive("Price must be greater than 0")
		.max(100_000, "Price is too high"),

	currency: currencySchema,
})

export type CreatePropertyFormValues = z.infer<typeof createPropertySchema>
