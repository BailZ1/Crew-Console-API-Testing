// server/api/crew/jobs.post.ts
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // ✅ Load environment variables
  const baseUrl = process.env.NUXT_CREW_BASE_URL || ''
  const apiToken = process.env.NUXT_CREW_API_TOKEN || ''

  if (!baseUrl || !apiToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing NUXT_CREW_BASE_URL or NUXT_CREW_API_TOKEN'
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
      company_id: 855,
      active: 1,
      name: name.toString().trim(),
      number: number.toString().trim() || '',
      deleted_at: null,
      color: '#0c4329'
    }

    try {
      // ✅ Authenticated POST request
      const response = await $fetch(`${baseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: job
      })

      ok++
      results.push({ ok: true, data: response })
    } catch (err: any) {
      failed++
      const status = err?.response?.status || err?.statusCode || 'Unknown'
      const msg =
        err?.data?.message ||
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
