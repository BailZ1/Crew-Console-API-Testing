// utils/crewClient.ts
import { $fetch } from 'ofetch'
import { useRuntimeConfig } from '#imports' // works in server routes

export type CrewFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, any>
  body?: any
  headers?: Record<string, string>
}

/**
 * Calls the Crew Console API using baseUrl + bearer token from runtime config.
 * Usage: await crewFetch('/api/users/employees', { method: 'POST', body: {...} })
 */
export async function crewFetch<T = any>(path: string, opts: CrewFetchOptions = {}) {
  const { crewBaseUrl, crewApiToken } = useRuntimeConfig() as any
  if (!crewBaseUrl || !crewApiToken) {
    throw new Error('Missing crewBaseUrl or crewApiToken in runtimeConfig')
  }

  const url =
    path.startsWith('http')
      ? path
      : new URL(path, crewBaseUrl as string).toString()

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${crewApiToken}`,
    ...(opts.headers || {})
  }

  return $fetch<T>(url, {
    method: opts.method || 'GET',
    query: opts.query,
    body: opts.body,
    headers
  })
}
