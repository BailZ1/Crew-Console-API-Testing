import { defineEventHandler, getQuery, readBody, createError } from 'h3'
import { $fetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  // Read secrets safely (server-only)
  const { crewBaseUrl, crewApiToken } = useRuntimeConfig() as any
  if (!crewBaseUrl || !crewApiToken) {
    throw createError({ statusCode: 500, statusMessage: 'Missing API env vars' })
  }

  // Forward client body + optional query params
  const body = await readBody(event)
  const query = getQuery(event)

  const url = new URL('/api/equipment/search', crewBaseUrl as string)
  for (const [k, v] of Object.entries(query)) {
    if (v != null) url.searchParams.append(k, String(v))
  }

  // Call Crew Console
  return await $fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${crewApiToken}`
    },
    body
  })
})
