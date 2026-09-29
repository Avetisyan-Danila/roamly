import { LogoutButton } from "@/features/logout"
import { getCurrentUser } from "@/entities/user"

export default async function ProfilePage() {
	const user = await getCurrentUser()

	return (
		<main>
			<h1>Profile</h1>

			<p>
				{user.firstName} {user.lastName}
			</p>

			<p>{user.email}</p>

			<LogoutButton />
		</main>
	)
}
