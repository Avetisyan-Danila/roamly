"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { cn } from "@/shared/lib/utils"

type PhotoPreviewProps = {
	source: File | string
	alt: string
	caption?: ReactNode
	isDimmed?: boolean
	children?: ReactNode
}

export function PhotoPreview({
	source,
	alt,
	caption,
	isDimmed = false,
	children,
}: PhotoPreviewProps) {
	const imageRef = useRef<HTMLImageElement>(null)

	useEffect(() => {
		if (typeof source === "string") return

		const objectUrl = URL.createObjectURL(source)

		if (imageRef.current) {
			imageRef.current.src = objectUrl
		}

		return () => {
			URL.revokeObjectURL(objectUrl)
		}
	}, [source])

	return (
		<div className="relative flex flex-col gap-1">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				ref={imageRef}
				src={typeof source === "string" ? source : undefined}
				alt={alt}
				width={200}
				height={150}
				className={cn(
					"aspect-4/3 w-full rounded-lg object-cover",
					isDimmed && "opacity-50",
				)}
			/>

			{caption && (
				<div className="truncate text-xs text-muted-foreground">{caption}</div>
			)}

			{children && (
				<div className="absolute top-2 right-2 flex gap-1">{children}</div>
			)}
		</div>
	)
}
