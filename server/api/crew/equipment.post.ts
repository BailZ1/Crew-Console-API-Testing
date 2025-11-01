// server/api/crew/equipment.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { createCrewClient } from '~/utils/crewClient'

type CsvRow = Record<string, any>

interface PostResult {
  ok: boolean
  res?: any
  error?: string
  row?: CsvRow
  payload?: any
  skippedReason?: string
  index?: number
}

export default defineEventHandler(async (event) => {
  // Centralized client (handles auth + errors)
  const client = createCrewClient()

  // Expect { rows: [...] } from frontend (already parsed from CSV)
  const body = await readBody<{ rows: CsvRow[] }>(event)
  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // Ensure the required header exists (exact match)
  const firstRow = body.rows[0] || {}
  if (!Object.prototype.hasOwnProperty.call(firstRow, 'Equipment name')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV must include a column named "Equipment name".'
    })
  }

  // Resolve company_id from /api/users (best-effort; continue if unavailable)
  let resolvedCompanyId: number | null = null
  try {
    resolvedCompanyId = await client.resolveCompanyId()
  } catch {
    // Allow to proceed; backend may default or return a helpful error we surface below
    resolvedCompanyId = null
  }

  const results: PostResult[] = []
  let validationErrors = 0
  let skippedDuplicates = 0
  let ok = 0
  let failed = 0

  // De-dupe within this upload (case-insensitive)
  const seenNames = new Set<string>()

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i] || {}

    // --- Extract and validate required field (exact header only) ---
    const raw = r['Equipment name']
    const name = (raw ?? '').toString().trim()
    if (!name) {
      results.push({
        ok: false,
        error: `Missing required field: Equipment name (line ${i + 2})`,
        row: r,
        index: i
      })
      validationErrors++
      continue
    }

    // --- Skip duplicates in the same upload ---
    const key = name.toLowerCase()
    if (seenNames.has(key)) {
      results.push({
        ok: false,
        skippedReason: 'Duplicate in upload (same Equipment name)',
        row: r,
        index: i
      })
      skippedDuplicates++
      continue
    }
    seenNames.add(key)

    // --- Build payload for API ---
    const payload: any = { name, type: 'equipment' as const }
    if (resolvedCompanyId != null) {
      payload.company_id = resolvedCompanyId
    }

    // --- POST to API via centralized client ---
    try {
      const res = await client.post('/api/equipment', payload)
      results.push({ ok: true, res, index: i })
      ok++
    } catch (err: any) {
      const status = err?.response?.status
      const rawData = err?.response?._data
      const rawMsg =
        (typeof rawData === 'string' && rawData) ||
        rawData?.message ||
        err?.message ||
        'Request failed'

      // Friendlier hint for the specific "company is null" failure
      const looksLikeNullCompany =
        /PushToJotformForms::__construct\(\): Argument #1 .* must be of type App\\Company, null given/i.test(
          rawMsg
        )

      const msg = looksLikeNullCompany
        ? `Server rejected the request because 'company' resolved to null. Supply a company context (ensure your API token is company-scoped or that /api/users is accessible to resolve company_id). Raw: ${rawMsg}`
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
      company_id_used: resolvedCompanyId ?? null
    },
    results
  }
})
