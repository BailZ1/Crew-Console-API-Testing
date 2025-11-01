// server/api/crew/users/employees.post.ts
import { defineEventHandler, readMultipartFormData, readBody, createError } from 'h3'
import { parse } from 'csv-parse/sync'
import { createCrewClient } from '~/utils/crewClient'

export default defineEventHandler(async (event) => {
  const client = createCrewClient()

  let rows: Record<string, any>[] = []

  // --- 1️⃣ Handle CSV upload or JSON payload ---
  const form = await readMultipartFormData(event)
  const csvFile = form?.find(
    (f) => f.filename?.endsWith('.csv') || f.type?.includes('csv')
  )

  if (csvFile?.data) {
    const csvText = csvFile.data.toString('utf-8')
    rows = parse(csvText, { columns: true, skip_empty_lines: true })
  } else {
    const body = await readBody<{ rows?: Record<string, any>[] }>(event)
    if (body?.rows?.length) rows = body.rows
  }

  if (!rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'CSV file is required' })
  }

  // 🔎 Resolve default company_id once from /api/users (can be overridden per row)
  let resolvedCompanyId: number | null = null
  try {
    resolvedCompanyId = await client.resolveCompanyId()
  } catch (e: any) {
    throw createError({
      statusCode: e?.response?.status || 500,
      statusMessage: e?.message || 'Unable to resolve company_id from /api/users'
    })
  }

  // --- 2️⃣ Validate and normalize each line ---
  const results: any[] = []
  let lineNumber = 1

  for (const r of rows) {
    lineNumber++

    // Normalize and check required fields
    const name = (r['Name First and Last'] ?? r['Name'] ?? r.name)?.toString().trim()
    const pin = (r.PIN ?? r['Pin'] ?? r['pin'])?.toString().trim()

    if (!name || !pin) {
      results.push({
        ok: false,
        error: `Missing required field(s):${!name ? ' Name' : ''}${!pin ? ' PIN' : ''} on line ${lineNumber}`,
        row: r
      })
      continue
    }

    // Normalize optional fields — convert blanks to null
    const employee_id = r['Employee ID'] ? String(r['Employee ID']).trim() : null
    const email = r.Email && String(r.Email).trim() !== '' ? String(r.Email).trim() : null
    const role = r.Role && String(r.Role).trim() !== '' ? String(r.Role).trim() : 'user'
    // Allow per-row override; otherwise use resolved company_id
    const company_id = (() => {
      const raw = r['Company ID']
      if (raw === undefined || raw === null || String(raw).trim() === '') return resolvedCompanyId
      const n = Number(String(raw).trim())
      return Number.isNaN(n) ? resolvedCompanyId : n
    })()
    const foreman =
      r.Foreman && String(r.Foreman).toLowerCase().includes('true') ? 1 : 0

    const payload = {
      name,
      pin,
      employee_id,
      email,
      company_id,
      role,
      employee: 1,
      active: 1,
      foreman
    }

    // --- 3️⃣ POST to the API (centralized client handles auth + errors) ---
    try {
      const res = await client.post('/api/users', payload)
      results.push({ ok: true, res })
    } catch (err: any) {
      const status = err?.response?.status || 'Unknown'
      const msg =
        err?.response?._data?.message ||
        err?.message ||
        'Request failed'
      results.push({
        ok: false,
        error: `[${status}] ${msg}`,
        payload
      })
    }
  }

  // --- 4️⃣ Return summary ---
  const ok = results.filter((r) => r.ok).length
  const failed = results.length - ok
  const validationErrors = results.filter((r) => !r.ok && String(r.error || '').includes('Missing'))

  return {
    summary: {
      total: results.length,
      ok,
      failed,
      validationErrors: validationErrors.length,
      company_id_used: resolvedCompanyId
    },
    results
  }
})
