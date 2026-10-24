"use client"

import { XIcon } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/shared/ui/button"

type PhotoPreviewProps = {
	file: File
	onRemove: () => void
}

export function PhotoPreview({ file, onRemove }: PhotoPreviewProps) {
	const imageRef = useRef<HTMLImageElement>(null)

	useEffect(() => {
		const objectUrl = URL.createObjectURL(file)

		if (imageRef.current) {
			imageRef.current.src = objectUrl
		}

		return () => {
			URL.revokeObjectURL(objectUrl)
		}
	}, [file])

	return (
		<div className="relative flex flex-col gap-1">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				ref={imageRef}
				alt={file.name}
				width={200}
				height={150}
				className="aspect-4/3 w-full rounded-lg object-cover"
			/>

			<p className="truncate text-xs text-muted-foreground">{file.name}</p>

			<Button
				type="button"
				variant="secondary"
				size="icon-sm"
				className="absolute top-2 right-2"
				onClick={onRemove}
			>
				<XIcon />

				<span className="sr-only">Remove</span>
			</Button>
		</div>
	)
}
