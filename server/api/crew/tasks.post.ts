// server/api/crew/tasks.post.ts
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  // Load environment variables for authenticated API access
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

  // Default job_id (update dynamically if needed)
  const DEFAULT_JOB_ID = 45151

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i]

    // Required
    const name =
      r['Task Name'] ??
      r['task name'] ??
      r['Name'] ??
      r['name'] ??
      null

    // Optional
    const cost_code = r['Cost Code'] ?? r['cost code'] ?? ''
    const unit = r['Unit'] ?? r['unit'] ?? null
    const otExempt = r['OT Exempt Task'] ?? r['ot exempt task'] ?? null

    // Validation
    if (!name || !name.toString().trim()) {
      failed++
      results.push({
        ok: false,
        error: `Row ${i + 1}: Missing required Task Name`
      })
      continue
    }

    // Parse OT Exempt
    const countOvertime =
      otExempt &&
      ['yes', 'true', '1'].includes(otExempt.toString().trim().toLowerCase())
        ? 0 // exempt (don’t count OT)
        : 1 // normal OT counting

    // Build Task payload
    const task = {
      company_id: 855,
      job_id: DEFAULT_JOB_ID,
      name: name.toString().trim(),
      cost_code: cost_code.toString().trim() || '',
      complete: 0,
      deleted_at: null,
      unit: unit?.toString().trim() || null,
      estimated_qty: null,
      actual_qty: null,
      estimated_hours: null,
      default_task_id: null,
      total_overtime_hours: 0,
      count_overtime: countOvertime,
      task_category_id: null,
      active: 1
    }

    try {
      const response = await $fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: task
      })

      // ✅ Debug logs to verify backend behavior
      //console.log(`✅ TASK POST RESPONSE (Row ${i + 1}):`, response)

      ok++
      results.push({ ok: true, data: response })
    } catch (err: any) {
      // ❌ Detailed error logging
      console.error(`❌ TASK POST ERROR (Row ${i + 1}):`, err)

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
