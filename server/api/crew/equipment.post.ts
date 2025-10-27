// server/api/crew/equipment.post.ts
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

  // Ensure the required header exists
  const firstRow = body.rows[0] || {}
  if (!Object.prototype.hasOwnProperty.call(firstRow, 'Equipment name')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV must include a column named "Equipment name".'
    })
  }

  // Resolve company_id: prefer env, else probe API for an existing record
  let resolvedCompanyId: number | null =
    crewCompanyId != null && crewCompanyId !== ''
      ? Number(crewCompanyId)
      : null

  if (!resolvedCompanyId) {
    try {
      const probe: any = await $fetch(`${crewBaseUrl}/api/equipment`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${crewApiToken}` }
      })
      const cid = probe?.data?.[0]?.company_id
      if (cid != null) resolvedCompanyId = Number(cid)
    } catch {
      // Best-effort inference only; continue without blocking
    }
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

    // --- POST to API ---
    try {
      const res = await $fetch(`${crewBaseUrl}/api/equipment`, {
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

      // Friendlier hint for the specific "company is null" failure
      const looksLikeNullCompany =
        /PushToJotformForms::__construct\(\): Argument #1 .* must be of type App\\Company, null given/i.test(
          rawMsg
        )

      const msg = looksLikeNullCompany
        ? `Server rejected the request because 'company' resolved to null. Supply a company context (set runtime env CREW_COMPANY_ID or ensure the API token is scoped to a company). Raw: ${rawMsg}`
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
