"use client"

import { createContext, useContext } from "react"

import type { useDraftPhotos } from "../model/use-draft-photos"

type DraftPhotosContextValue = ReturnType<typeof useDraftPhotos>

export const DraftPhotosContext = createContext<DraftPhotosContextValue | null>(
	null,
)

export function useDraftPhotosContext() {
	const context = useContext(DraftPhotosContext)

	if (!context) {
		throw new Error("DraftPhotosContext provider is missing")
	}

	return context
}
