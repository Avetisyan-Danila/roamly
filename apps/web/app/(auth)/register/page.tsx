import { RegisterForm } from "@/features/register"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

export default function RegisterPage() {
	return (
		<main className="flex flex-1 items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>
						<h1 className="text-xl">Register</h1>
					</CardTitle>
				</CardHeader>

				<CardContent>
					<RegisterForm />
				</CardContent>
			</Card>
		</main>
	)
}
