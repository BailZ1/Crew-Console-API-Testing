// server/api/crew/equipment.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { $fetch } from 'ofetch'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const { crewBaseUrl, crewApiToken } = useRuntimeConfig() as any
  if (!crewBaseUrl || !crewApiToken) {
    throw createError({ statusCode: 500, statusMessage: 'Missing API env vars' })
  }

  // Expect { rows: [...] } from frontend
  const body = await readBody<{ rows: Record<string, any>[] }>(event)
  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  const results: any[] = []
  let validationErrors = 0

  // --- Loop through each row in the uploaded CSV ---
  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i] || {}

    // Extract and sanitize the Equipment name
    const name =
      (r['Equipment name'] ??
        r['equipment name'] ??
        r['Name'] ??
        r['Equipment'] ??
        '')?.toString().trim() || null

    // Validate required field
    if (!name) {
      results.push({
        ok: false,
        error: `Missing required field(s): Equipment name on line ${i + 2}`,
        row: r
      })
      validationErrors++
      continue
    }

    const payload = { name }

    try {
      const res = await $fetch(`${crewBaseUrl}/api/equipment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${crewApiToken}` },
        body: payload
      })
      results.push({ ok: true, res })
    } catch (err: any) {
      results.push({
        ok: false,
        error: err?.message || 'Request failed',
        payload
      })
    }
  }

  const ok = results.filter(r => r.ok).length
  const failed = results.length - ok

  // --- Return final summary for frontend display ---
  return {
    summary: { total: results.length, ok, failed, validationErrors },
    results
  }
})
