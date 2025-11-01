// server/utils/crewClient.ts
import { useRuntimeConfig } from '#imports'
import { $fetch } from 'ofetch'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Centralized client for Crew API with auth + consistent error objects */
export function createCrewClient() {
  const { crewBaseUrl, crewApiToken } = useRuntimeConfig() as any
  if (!crewBaseUrl || !crewApiToken) {
    const e: any = new Error('Missing API env vars')
    e.response = { status: 500, _data: { message: 'Missing API env vars' } }
    throw e
  }

  const headers = { Authorization: `Bearer ${crewApiToken}` }

  async function request<T>(
    path: string,
    { method = 'GET', body, query }: { method?: Method; body?: any; query?: any } = {}
  ): Promise<T> {
    try {
      return await $fetch<T>(`${crewBaseUrl}${path}`, {
        method,
        headers,
        body,
        query
      })
    } catch (err: any) {
      // Normalize to an error shape routes already expect: err.response.status / err.response._data
      const status = err?.response?.status || err?.statusCode || 500
      const data = err?.response?._data ?? err?.data
      const message =
        (typeof data === 'string' && data) ||
        data?.message ||
        err?.message ||
        'Request failed'
      const e: any = new Error(message)
      e.response = { status, _data: data }
      throw e
    }
  }

  /** Resolve tenant company_id by grabbing the first user’s company_id */
  async function resolveCompanyId(): Promise<number> {
    const users: any = await request('/api/users')
    const cid = users?.data?.[0]?.company_id
    if (cid == null) {
      const e: any = new Error('Unable to resolve company_id from /api/users')
      e.response = { status: 500, _data: { message: 'Unable to resolve company_id from /api/users' } }
      throw e
    }
    return Number(cid)
  }

  /** Find or create a company by name (tries /api/customer-companies then /api/companies) */
  async function findOrCreateCompanyByName(name: string, ownerCompanyId: number): Promise<number | null> {
    const lower = name.trim().toLowerCase()
    for (const ep of ['/api/customer-companies', '/api/companies']) {
      // GET list → match by name
      try {
        const list: any = await request(ep)
        const arr: any[] = list?.data || []
        const found = arr.find((c) => (c?.name || '').toString().trim().toLowerCase() === lower)
        if (found?.id != null) return Number(found.id)
      } catch { /* ignore */ }
      // POST create
      try {
        const created: any = await request(ep, { method: 'POST', body: { name, company_id: ownerCompanyId } })
        const id = created?.data?.id ?? created?.id
        if (id != null) return Number(id)
      } catch { /* ignore */ }
    }
    return null
  }

  return {
    get: <T = any>(path: string, query?: any) => request<T>(path, { method: 'GET', query }),
    post: <T = any>(path: string, body?: any) => request<T>(path, { method: 'POST', body }),
    put:  <T = any>(path: string, body?: any) => request<T>(path, { method: 'PUT', body }),
    del:  <T = any>(path: string)            => request<T>(path, { method: 'DELETE' }),
    resolveCompanyId,
    findOrCreateCompanyByName,
  }
}
