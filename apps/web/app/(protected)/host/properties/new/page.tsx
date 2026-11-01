import { notFound } from "next/navigation"

import { getDraft } from "@/features/create-property/api/get-draft"
import { CreatePropertyWizard } from "@/features/create-property/ui/create-property-wizard"
import { ApiError } from "@/shared/api/server"

export default async function NewPropertyPage({
	searchParams,
}: PageProps<"/host/properties/new">) {
	const { draftId } = await searchParams

	const draft =
		typeof draftId === "string" ? await getDraftOrNotFound(draftId) : null

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
			<h1 className="text-2xl font-semibold">Become a host</h1>

			<CreatePropertyWizard initialDraft={draft} />
		</main>
	)
}

async function getDraftOrNotFound(id: string) {
	try {
		return await getDraft(id)
	} catch (error) {
		// 400: id is not a UUID, 404: missing, not yours or already published
		if (
			error instanceof ApiError &&
			(error.status === 400 || error.status === 404)
		) {
			notFound()
		}

		throw error
	}
}
