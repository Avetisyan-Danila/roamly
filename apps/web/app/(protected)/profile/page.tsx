import { usersApi } from "@/lib/users/users"

export default async function ProfilePage() {
	const user = await usersApi.getMe()

	return (
		<main>
			<h1>Profile</h1>

			<p>
				{user.firstName} {user.lastName}
			</p>

			<p>{user.email}</p>
		</main>
	)
}
