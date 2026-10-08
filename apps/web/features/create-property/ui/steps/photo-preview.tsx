"use client"

import { useEffect, useRef } from "react"

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
		<div>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img ref={imageRef} alt={file.name} width={200} height={150} />

			<p>{file.name}</p>

			<button type="button" onClick={onRemove}>
				Remove
			</button>
		</div>
	)
}
