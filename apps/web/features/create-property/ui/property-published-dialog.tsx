import Link from "next/link"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/ui/alert-dialog"

type PropertyPublishedDialogProps = {
	propertyId: string | null
	onCreateAnother: () => void
}

export function PropertyPublishedDialog({
	propertyId,
	onCreateAnother,
}: PropertyPublishedDialogProps) {
	return (
		<AlertDialog open={propertyId !== null}>
			<AlertDialogContent className="data-[size=default]:sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Property published</AlertDialogTitle>

					<AlertDialogDescription>
						Your property is live. What would you like to do next?
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter>
					<AlertDialogAction variant="outline" onClick={onCreateAnother}>
						Create another
					</AlertDialogAction>

					<AlertDialogAction variant="outline" asChild>
						<Link href="/host/properties" replace>
							Go to my properties
						</Link>
					</AlertDialogAction>

					<AlertDialogAction asChild>
						<Link href={`/property/${propertyId}`} replace>
							View listing
						</Link>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
