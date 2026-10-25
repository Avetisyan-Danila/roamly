// Not browserApiClient: S3 is authorized by the URL signature, API cookies and CSRF header are not needed
export async function uploadPhotoToStorage(
	uploadUrl: string,
	file: File,
): Promise<void> {
	const response = await fetch(uploadUrl, {
		method: "PUT",
		// Content-Type is signed into the URL, a different value gets 403
		headers: { "Content-Type": file.type },
		body: file,
	})

	if (!response.ok) {
		throw new Error(`Storage upload failed with status ${response.status}`)
	}
}
