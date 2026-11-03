import "server-only"

import type { Property } from "../model/types"
import { serverApiClient } from "@/shared/api/server"

export function getProperty(id: string) {
	return serverApiClient<Property>(`/properties/${id}`)
}
