import type { ComponentProps } from "react"

import { Input } from "@/shared/ui/input"

type NumberInputProps = Omit<
	ComponentProps<typeof Input>,
	"type" | "value" | "onChange"
> & {
	value: number
	onChange: (value: number) => void
}

export function NumberInput({ value, onChange, ...props }: NumberInputProps) {
	return (
		<Input
			{...props}
			type="number"
			// An empty input gives NaN, which React cannot render as a value
			value={Number.isNaN(value) ? "" : value}
			onChange={event => onChange(event.target.valueAsNumber)}
		/>
	)
}
