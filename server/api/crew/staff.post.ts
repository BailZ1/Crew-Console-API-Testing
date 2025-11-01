// server/api/crew/staff.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { createCrewClient } from '~/utils/crewClient'

type CsvRow = Record<string, any>

interface PostResult {
  ok: boolean
  res?: any
  error?: string
  row?: CsvRow
  payload?: any
  index?: number
  skippedReason?: string
}

/**
 * Expected CSV headers (exact):
 * - Name First and Last (required)  -> name
 * - Email (required)                -> email
 * - Password (required)             -> password
 * - Employee ID (optional)          -> accounting_id
 * - Payroll (optional)              -> time_clock_level (0/1 or number)
 * - Jobs (optional)                 -> scheduler_level (0/1 or number)
 * - Users (optional)                -> role: 'admin' if truthy, else 'user'
 * - Analysis (optional)             -> metrics_level (0/1 or number); metrics_enabled derived
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ rows: CsvRow[] }>(event)
  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // Ensure the required headers exist on first row (defensive)
  const first = body.rows[0] || {}
  for (const h of ['Name First and Last', 'Email', 'Password']) {
    if (!Object.prototype.hasOwnProperty.call(first, h)) {
      throw createError({
        statusCode: 400,
        statusMessage: `CSV must include a column named "${h}".`
      })
    }
  }

  // 🔁 Centralized Crew API client
  const client = createCrewClient()

  // 🔎 Resolve company_id once from /api/users
  let resolvedCompanyId: number
  try {
    resolvedCompanyId = await client.resolveCompanyId()
  } catch (e: any) {
    throw createError({
      statusCode: e?.response?.status || 500,
      statusMessage: e?.message || 'Unable to resolve company_id from /api/users'
    })
  }

  // 🔍 Preload existing users' emails → prevent server-side duplicate errors
  const existingEmailMap = new Map<string, { id?: number; name?: string }>()
  try {
    const users: any = await client.get('/api/users')
    const arr: any[] = users?.data || []
    for (const u of arr) {
      const e = (u?.email ?? '').toString().trim().toLowerCase()
      if (e) existingEmailMap.set(e, { id: u?.id, name: u?.name })
    }
  } catch {
    // If this fails, we still proceed; backend duplicate catch below will handle it
  }

  // Helpers
  const parseYes = (v: any): boolean => {
    if (v == null) return false
    const s = v.toString().trim().toLowerCase()
    return s === 'yes' || s === 'y' || s === 'true' || s === '1' || s === 'x'
  }
  const parseLevel = (v: any): number => {
    if (v == null || v === '') return 0
    const s = v.toString().trim()
    const num = Number(s)
    if (!Number.isNaN(num)) return Math.max(0, Math.floor(num))
    return parseYes(s) ? 1 : 0
  }

  const results: PostResult[] = []
  let ok = 0
  let failed = 0
  let validationErrors = 0
  let skippedDuplicates = 0

  // De-dupe inside the same CSV upload
  const seenEmails = new Set<string>()

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i] || {}

    // --- Extract required fields ---
    const name = (r['Name First and Last'] ?? '').toString().trim()
    const email = (r['Email'] ?? '').toString().trim()
    const password = (r['Password'] ?? '').toString().trim()

    const missing: string[] = []
    if (!name) missing.push('Name First and Last')
    if (!email) missing.push('Email')
    if (!password) missing.push('Password')

    if (missing.length) {
      validationErrors++
      failed++
      results.push({
        ok: false,
        error: `Missing required field(s): ${missing.join(', ')} on line ${i + 2}`,
        row: r,
        index: i
      })
      continue
    }

    // --- Skip duplicate emails in same upload ---
    const emailKey = email.toLowerCase()
    if (seenEmails.has(emailKey)) {
      skippedDuplicates++
      results.push({
        ok: false,
        skippedReason: 'Duplicate email in upload',
        row: r,
        index: i
      })
      continue
    }

    // --- Skip if email already exists on the server (pre-check) ---
    if (existingEmailMap.has(emailKey)) {
      const existing = existingEmailMap.get(emailKey)
      failed++
      results.push({
        ok: false,
        error: `Duplicate email: "${email}" already exists in the system${existing?.name ? ` (belongs to ${existing.name}${existing?.id ? ` #${existing.id}` : ''})` : ''}. Skipped row ${i + 2}.`,
        row: r,
        index: i
      })
      continue
    }

    // Mark as seen to prevent duplicates later in the same upload
    seenEmails.add(emailKey)

    // --- Optional mappings ---
    const accounting_id = (r['Employee ID'] ?? '').toString().trim() || null
    const time_clock_level = parseLevel(r['Payroll'])
    const scheduler_level = parseLevel(r['Jobs'])
    const metrics_level = parseLevel(r['Analysis'])
    const metrics_enabled = metrics_level > 0 ? 1 : 0
    const role = parseYes(r['Users']) ? 'admin' : 'user'

    // --- Build API payload for /api/users ---
    const payload: any = {
      name,
      email,
      password,
      role,               // 'admin' if "Users" truthy, else 'user'
      employee: 0,        // mark as "staff" (not an Employee)
      active: 1,
      time_clock_level,
      scheduler_level,
      metrics_level,
      metrics_enabled,
      accounting_id,
      employee_id: null,  // do not link to an Employee row
      company_id: resolvedCompanyId
    }

    try {
      const res = await client.post('/api/users', payload)
      results.push({ ok: true, res, index: i })
      ok++

      // Also add to existingEmailMap so later rows detect it
      existingEmailMap.set(emailKey, { name, id: res?.data?.id ?? res?.id })
    } catch (err: any) {
      const status = err?.response?.status
      const rawData = err?.response?._data
      const rawMsg =
        (typeof rawData === 'string' && rawData) ||
        rawData?.message ||
        err?.message ||
        'Request failed'

      // Friendly duplicate mapping for MySQL unique constraint
      const isDup =
        /duplicate entry '.*' for key 'users\.users_email_unique'/i.test(rawMsg) ||
        /duplicate entry/i.test(rawMsg)

      const msg = isDup
        ? `Duplicate email: "${email}" already exists in the system. Skipped row ${i + 2}.`
        : (status ? `HTTP ${status}: ${rawMsg}` : rawMsg)

      results.push({
        ok: false,
        error: msg,
        payload,
        row: r,
        index: i
      })
      failed++
    }
  }

  return {
    summary: {
      total: results.length,
      ok,
      failed,
      validationErrors,
      skippedDuplicates,
      company_id_used: resolvedCompanyId
    },
    results
  }
})
