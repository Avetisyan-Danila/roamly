"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/shared/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

const THEME_OPTIONS = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "System" },
]

export function ThemeToggle() {
	const { theme, setTheme } = useTheme()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon">
					<SunIcon className="dark:hidden" />
					<MoonIcon className="hidden dark:block" />

					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
					{THEME_OPTIONS.map(option => (
						<DropdownMenuRadioItem key={option.value} value={option.value}>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
