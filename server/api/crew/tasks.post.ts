// server/api/crew/tasks.post.ts
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

function parseYes(val: any): boolean {
  if (val == null) return false
  const s = val.toString().trim().toLowerCase()
  return s === 'yes' || s === 'y' || s === 'true' || s === '1'
}

export default defineEventHandler(async (event) => {
  const client = createCrewClient()

  // Expect { rows: [...] } from frontend (already parsed from CSV)
  const body = await readBody<{ rows: CsvRow[] }>(event)
  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // Ensure the required header exists exactly as specified
  const firstRow = body.rows[0] || {}
  if (!Object.prototype.hasOwnProperty.call(firstRow, 'Task Name')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV must include a column named "Task Name".'
    })
  }

  // 🔎 Resolve company_id once from /api/users (centralized client)
  let companyId: number
  try {
    companyId = await client.resolveCompanyId()
  } catch (e: any) {
    throw createError({
      statusCode: e?.response?.status || 500,
      statusMessage: e?.message || 'Unable to resolve company_id from /api/users'
    })
  }

  const results: PostResult[] = []
  let validationErrors = 0
  let skippedDuplicates = 0
  let ok = 0
  let failed = 0

  // De-dupe within this upload by Task Name (case-insensitive)
  const seenNames = new Set<string>()

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i] || {}

    // --- Extract and validate required field (exact header only) ---
    const rawName = r['Task Name']
    const name = (rawName ?? '').toString().trim()
    if (!name) {
      results.push({
        ok: false,
        error: `Missing required field: Task Name (line ${i + 2})`,
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
        skippedReason: 'Duplicate in upload (same Task Name)',
        row: r,
        index: i
      })
      skippedDuplicates++
      continue
    }
    seenNames.add(key)

    // --- Optional fields (exact headers) ---
    const cost_code = (r['Cost Code'] ?? '').toString().trim()
    const unitRaw = r['Unit']
    const unit = (unitRaw ?? '').toString().trim() || null

    // OT Exempt Task => count_overtime (0 if exempt, else 1)
    const otExemptRaw = r['OT Exempt Task']
    const count_overtime = parseYes(otExemptRaw) ? 0 : 1

    // --- Build payload for API /api/default-tasks ---
    const payload: any = {
      name,
      cost_code,
      unit,
      count_overtime,
      task_category_id: null,
      company_id: companyId
    }

    try {
      const res = await client.post('/api/default-tasks', payload)
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
        /PushToJotformForms::__construct\(\): Argument #1 .* must be of type App\\Company, null given/i.test(rawMsg) ||
        /company.*null/i.test(rawMsg)

      const msg = looksLikeNullCompany
        ? `Server rejected the request because 'company' resolved to null. Ensure your API token is company-scoped or that /api/users is accessible to resolve company_id. Raw: ${rawMsg}`
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
      company_id_used: companyId
    },
    results
  }
})
