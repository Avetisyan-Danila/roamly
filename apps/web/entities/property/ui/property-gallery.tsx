import { cn } from "@/shared/lib/utils"

import type { Property } from "../model/types"

type PropertyGalleryProps = {
	photos: Property["photos"]
	title: string
}

export function PropertyGallery({ photos, title }: PropertyGalleryProps) {
	return (
		<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
			{photos.slice(0, 5).map((photo, index) => (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					key={photo.id}
					src={photo.url}
					alt={`${title}, photo ${index + 1}`}
					loading={index === 0 ? "eager" : "lazy"}
					fetchPriority={index === 0 ? "high" : "auto"}
					className={cn(
						"aspect-4/3 size-full rounded-lg object-cover",
						index === 0 && "col-span-2 md:row-span-2",
					)}
				/>
			))}
		</div>
	)
}
