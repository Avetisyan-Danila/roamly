import { LogoutButton } from "@/features/logout"
import { getCurrentUser } from "@/entities/user"
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card"

export default async function ProfilePage() {
	const user = await getCurrentUser()

	return (
		<main className="flex flex-1 items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>
						<h1 className="text-xl">Profile</h1>
					</CardTitle>
				</CardHeader>

				<CardContent className="flex flex-col gap-1">
					<p className="font-medium">
						{user.firstName} {user.lastName}
					</p>

					<p className="text-muted-foreground">{user.email}</p>
				</CardContent>

				<CardFooter>
					<LogoutButton />
				</CardFooter>
			</Card>
		</main>
	)
}
