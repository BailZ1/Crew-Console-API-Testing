// server/api/crew/tasks.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { $fetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'

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
  const { crewBaseUrl, crewApiToken, crewCompanyId } = useRuntimeConfig() as any
  if (!crewBaseUrl || !crewApiToken) {
    throw createError({ statusCode: 500, statusMessage: 'Missing API env vars' })
  }

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

  // Resolve company_id: prefer env, else probe API for an existing default-task/company
  let resolvedCompanyId: number | null =
    crewCompanyId != null && crewCompanyId !== '' ? Number(crewCompanyId) : null

  if (!resolvedCompanyId) {
    try {
      const probe: any = await $fetch(`${crewBaseUrl}/api/default-tasks`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${crewApiToken}` }
      })
      const cid = probe?.data?.[0]?.company_id
      if (cid != null) resolvedCompanyId = Number(cid)
    } catch {
      // best-effort only; proceed
    }
    // Fallback probe via equipment (optional)
    if (!resolvedCompanyId) {
      try {
        const probeEq: any = await $fetch(`${crewBaseUrl}/api/equipment`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${crewApiToken}` }
        })
        const cid2 = probeEq?.data?.[0]?.company_id
        if (cid2 != null) resolvedCompanyId = Number(cid2)
      } catch {
        // ignore
      }
    }
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
      // You can set task_category_id if you add it to your CSV; null otherwise
      task_category_id: null
    }
    if (resolvedCompanyId != null) {
      payload.company_id = resolvedCompanyId
    }

    try {
      const res = await $fetch(`${crewBaseUrl}/api/default-tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${crewApiToken}` },
        body: payload
      })
      results.push({ ok: true, res, index: i })
      ok++
    } catch (err: any) {
      const status = err?.response?.status
      const data = err?.response?._data ?? err?.data
      const rawMsg =
        (typeof data === 'string' && data) ||
        (data?.message as string) ||
        err?.message ||
        'Request failed'

      const looksLikeNullCompany =
        /PushToJotformForms::__construct\(\): Argument #1 .* must be of type App\\Company, null given/i.test(
          rawMsg
        )

      const msg = looksLikeNullCompany
        ? `Server rejected the request because 'company' resolved to null. Provide a company context (set runtime env CREW_COMPANY_ID or ensure the API token is scoped to a company). Raw: ${rawMsg}`
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
