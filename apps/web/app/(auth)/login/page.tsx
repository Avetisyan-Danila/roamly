import { LoginForm } from "@/features/login"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

export default function LoginPage() {
	return (
		<main className="flex flex-1 items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>
						<h1 className="text-xl">Login</h1>
					</CardTitle>
				</CardHeader>

				<CardContent>
					<LoginForm />
				</CardContent>
			</Card>
		</main>
	)
}
