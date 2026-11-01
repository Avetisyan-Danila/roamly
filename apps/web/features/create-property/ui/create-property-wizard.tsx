"use client"

import { useState } from "react"

import type { DraftProperty } from "../api/create-draft"
import { CreatePropertyForm } from "./create-property-form"

type CreatePropertyWizardProps = {
	initialDraft: DraftProperty | null
}

export function CreatePropertyWizard({
	initialDraft,
}: CreatePropertyWizardProps) {
	const [formKey, setFormKey] = useState(0)

	const [draft, setDraft] = useState(initialDraft)

	const handleCreateAnother = () => {
		window.history.replaceState(null, "", "/host/properties/new")

		setDraft(null)
		setFormKey(key => key + 1)
	}

	return (
		<CreatePropertyForm
			key={formKey}
			initialDraft={draft}
			onCreateAnother={handleCreateAnother}
		/>
	)
}
