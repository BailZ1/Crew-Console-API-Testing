// server/api/crew/employees.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { crewFetch } from '~/utils/crewClient' // utils is at project root

export default defineEventHandler(async (event) => {
  const body = await readBody<{ rows: Record<string, any>[] }>(event)
  if (!body?.rows || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // Required CSV headers (case-insensitive)
  const REQUIRED = ['name', 'id']

  // helpers
  const norm = (v: unknown) => String(v ?? '').trim()
  const toBool = (v: unknown) => {
    const s = String(v ?? '').toLowerCase().trim()
    return ['true', '1', 'yes', 'y', 'on'].includes(s)
  }
  const get = (row: Record<string, any>, keyLower: string) => {
    const hit = Object.keys(row).find(k => k.toLowerCase() === keyLower)
    return hit ? row[hit] : undefined
  }

  // validate required
  const problems: Array<{ index: number; missing: string[] }> = []
  body.rows.forEach((row, i) => {
    const missing = REQUIRED.filter(req => {
      const realKey = Object.keys(row).find(k => k.toLowerCase() === req)
      if (!realKey) return true
      const val = norm(row[realKey])
      return val.length === 0
    })
    if (missing.length) problems.push({ index: i + 1, missing })
  })
  if (problems.length) {
    const msg = problems
      .slice(0, 10)
      .map(p => `Row ${p.index}: missing ${p.missing.join(', ')}`)
      .join(' | ')
    throw createError({ statusCode: 422, statusMessage: 'Validation failed', message: msg })
  }

  // CSV row -> upstream payload (adjust to match your Swagger field names)
  const mapRow = (row: Record<string, any>) => ({
    name:        norm(get(row, 'name')),
    external_id: norm(get(row, 'id')),
    foreman:     toBool(get(row, 'foreman')),
    tracking:    toBool(get(row, 'tracking')),
    active:      get(row, 'active') == null ? true : toBool(get(row, 'active')),
    phone:       norm(get(row, 'phone')),
    email:       norm(get(row, 'email')),
    pin:         norm(get(row, 'pin')),
  })

  // Upstream endpoint (change if your API uses a different path)
  const CREATE_PATH = '/api/users/employees'

  const results: Array<{ ok: boolean; index: number; id?: any; error?: any }> = []
  for (const [i, row] of body.rows.entries()) {
    try {
      const res = await crewFetch<{ data?: { id?: any } }>(CREATE_PATH, {
        method: 'POST',
        body: mapRow(row)
      })
      results.push({ ok: true, index: i + 1, id: res?.data?.id })
    } catch (e: any) {
      results.push({
        ok: false,
        index: i + 1,
        error: e?.data ?? e?.message ?? 'Request failed'
      })
    }
  }

  const ok = results.filter(r => r.ok).length
  return { ok, failed: results.length - ok, results }
})
