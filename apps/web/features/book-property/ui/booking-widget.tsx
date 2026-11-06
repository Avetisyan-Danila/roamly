"use client"

import { useState } from "react"

import type { Property } from "@/entities/property"
import { formatMoney, toCents } from "@/shared/lib/money"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select"

type BookingWidgetProps = Pick<
	Property,
	"pricePerNight" | "currency" | "maxGuests"
>

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function BookingWidget({
	pricePerNight,
	currency,
	maxGuests,
}: BookingWidgetProps) {
	const [checkIn, setCheckIn] = useState("")
	const [checkOut, setCheckOut] = useState("")
	const [guests, setGuests] = useState("1")

	const nightlyCents = toCents(pricePerNight)
	const nights = countNights(checkIn, checkOut)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl">
					{formatMoney(nightlyCents, currency)}{" "}
					<span className="text-base font-normal text-muted-foreground">
						night
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<FieldGroup>
					<div className="grid grid-cols-2 gap-2">
						<Field>
							<FieldLabel htmlFor="check-in">Check-in</FieldLabel>

							<Input
								id="check-in"
								type="date"
								value={checkIn}
								onChange={event => setCheckIn(event.target.value)}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="check-out">Checkout</FieldLabel>

							<Input
								id="check-out"
								type="date"
								min={checkIn}
								value={checkOut}
								onChange={event => setCheckOut(event.target.value)}
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel htmlFor="guests">Guests</FieldLabel>

						<Select name="guests" value={guests} onValueChange={setGuests}>
							<SelectTrigger id="guests">
								<SelectValue />
							</SelectTrigger>

							<SelectContent>
								{Array.from({ length: maxGuests }, (_, index) => (
									<SelectItem key={index} value={String(index + 1)}>
										{index + 1}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>

				<Button disabled>Reserve</Button>

				<p className="text-center text-sm text-muted-foreground">
					Booking is not available yet
				</p>

				{nights > 0 && (
					<div className="flex justify-between border-t pt-4 font-semibold">
						<span>
							{formatMoney(nightlyCents, currency)} × {nights}{" "}
							{nights === 1 ? "night" : "nights"}
						</span>

						<span>{formatMoney(nightlyCents * nights, currency)}</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function countNights(checkIn: string, checkOut: string) {
	if (!checkIn || !checkOut) return 0

	return Math.max(0, (Date.parse(checkOut) - Date.parse(checkIn)) / MS_PER_DAY)
}
