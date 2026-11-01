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
	open: boolean
	onCreateAnother: () => void
}

export function PropertyPublishedDialog({
	open,
	onCreateAnother,
}: PropertyPublishedDialogProps) {
	return (
		<AlertDialog open={open}>
			<AlertDialogContent>
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

					<AlertDialogAction asChild>
						<Link href="/host/properties" replace>
							Go to my properties
						</Link>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
