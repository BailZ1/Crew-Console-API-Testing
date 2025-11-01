// server/api/crew/jobs.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { createCrewClient } from '~/utils/crewClient'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // 🔁 Centralized client (handles auth + base URL + error normalization)
  const client = createCrewClient()

  // 🔎 Dynamically resolve company_id from /api/users (first user's company_id)
  let companyId: number
  try {
    companyId = await client.resolveCompanyId()
  } catch (e: any) {
    throw createError({
      statusCode: e?.response?.status || 500,
      statusMessage: e?.message || 'Unable to resolve company_id from /api/users'
    })
  }

  const results: any[] = []
  let ok = 0
  let failed = 0

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i]

    const name =
      r['Job Name'] ??
      r['job name'] ??
      r['Name'] ??
      r['name'] ??
      null

    const number =
      r['Job Number'] ??
      r['job number'] ??
      r['Number'] ??
      r['number'] ??
      '' // optional

    // Validation
    if (!name || !name.toString().trim()) {
      failed++
      results.push({
        ok: false,
        error: `Row ${i + 1}: Missing required Job Name`
      })
      continue
    }

    const job = {
      company_id: companyId,          // 🔹 dynamically resolved
      active: 1,
      name: name.toString().trim(),
      number: number.toString().trim() || '',
      deleted_at: null,
      color: '#0c4329'
    }

    try {
      // ✅ POST via centralized client
      const response = await client.post('/api/jobs', job)
      ok++
      results.push({ ok: true, data: response })
    } catch (err: any) {
      failed++
      const status = err?.response?.status || 'Unknown'
      const msg =
        err?.response?._data?.message ||
        err?.message ||
        'Request failed'

      results.push({
        ok: false,
        error: `Row ${i + 1}: [${status}] ${msg}`
      })
    }
  }

  return {
    summary: { ok, failed },
    results
  }
})
