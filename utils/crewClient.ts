// utils/crewClient.ts
import { ofetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'

function isFormData(body: any): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

export async function crewFetch<T>(
  path: string,
  opts: { method?: string; body?: any; query?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const { crewBaseUrl, crewApiToken } = useRuntimeConfig() as any
  const url = new URL(path.startsWith('/') ? path : `/${path}`, crewBaseUrl)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${crewApiToken}`,
    ...(opts.headers || {})
  }

  const options: any = { method: (opts.method || 'GET').toUpperCase(), headers, query: opts.query }
  const body = opts.body

  if (body !== undefined && body !== null) {
    if (isFormData(body)) {
      // let fetch set multipart boundary
      options.body = body
    } else if (typeof body === 'object') {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
      options.body = JSON.stringify(body)
    } else {
      options.body = body
    }
  }

  return ofetch<T>(url.toString(), options)
}
