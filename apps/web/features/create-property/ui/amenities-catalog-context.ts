"use client"

import { createContext, useContext } from "react"

import type { Amenity } from "@/entities/amenity/api/get-amenities"

export type AmenitiesState =
	| { status: "loading" }
	| { status: "success"; data: Amenity[] }
	| { status: "error" }

type AmenitiesCatalogContextValue = {
	state: AmenitiesState
	retry: () => void
}

export const AmenitiesCatalogContext =
	createContext<AmenitiesCatalogContextValue | null>(null)

export function useAmenitiesCatalog() {
	const context = useContext(AmenitiesCatalogContext)

	if (!context) {
		throw new Error("AmenitiesCatalogContext provider is missing")
	}

	return context
}
