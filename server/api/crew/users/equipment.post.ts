// server/api/crew/equipment.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { crewFetch } from '~/utils/crewClient'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ rows: Record<string, any>[] }>(event)

  if (!body?.rows || !Array.isArray(body.rows)) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // Adjust required columns to match your template
  const REQUIRED = ['name']

  // Helpers
  const norm = (v: unknown) => String(v ?? '').trim()
  const toBool = (v: unknown) => {
    const s = String(v ?? '').toLowerCase().trim()
    return ['true', '1', 'yes', 'y', 'on'].includes(s)
  }
  const get = (row: Record<string, any>, keyLower: string) => {
    const hit = Object.keys(row).find(k => k.toLowerCase() === keyLower)
    return hit ? (row as Record<string, any>)[hit] : undefined
  }

  // ---- Validation: guard every access
  const problems: Array<{ index: number; missing: string[] }> = []
  body.rows.forEach((row, i) => {
    const missing = REQUIRED.filter((req) => {
      // find the actual header in a case-insensitive way
      const realKey = Object.keys(row).find(k => k.toLowerCase() === req)
      if (!realKey) return true // header not present at all
      const val = norm((row as Record<string, any>)[realKey])
      return val.length === 0 // header present but empty
    })
    if (missing.length) problems.push({ index: i + 1, missing })
  })

  if (problems.length) {
    const msg = problems
      .slice(0, 10)
      .map(p => `Row ${p.index}: missing ${p.missing.join(', ')}`)
      .join(' | ')
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      message: msg
    })
  }

  // Map CSV row -> API payload (adjust keys for your backend)
  const mapRow = (row: Record<string, any>) => ({
    name:          norm(get(row, 'name')),
    external_id:   norm(get(row, 'id')),
    active:        get(row, 'active') == null ? true : toBool(get(row, 'active')),
    serial_number: norm(get(row, 'serial') ?? get(row, 'serial number')),
    notes:         norm(get(row, 'notes')),
  })

  // Remote endpoint (change if your Swagger uses a different path)
  const CREATE_PATH = '/api/equipment'

  const results: Array<{ ok: boolean; index: number; id?: any; error?: any }> = []

  // entries() guarantees row is never undefined
  for (const [i, row] of body.rows.entries()) {
    const payload = mapRow(row)
    try {
      const res = await crewFetch<{ data?: { id?: any } }>(CREATE_PATH, {
        method: 'POST',
        body: payload
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
  const failed = results.length - ok

  return { ok, failed, results }
})
