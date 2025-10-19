// server/api/crew/customers.post.ts
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

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

    // === Required ===
    const name = r['Name First and Last'] ?? r['name'] ?? r['Name'] ?? null
    if (!name || !name.toString().trim()) {
      failed++
      results.push({
        ok: false,
        error: `Row ${i + 1}: Missing required field "Name First and Last"`
      })
      continue
    }

    // === Optional Fields ===
    const role = r['Role'] ?? null
    const email = r['Email'] ?? null
    const companyName = r['Company'] ?? null
    const phone = r['Cell Phone'] ?? null

    // === Construct payload ===
    const payload = {
      name: name.toString().trim(),
      company_id: 855,
      customer_company_id: 436, // Default company link (from your GET)
      active: 1,
      role: role?.toString().trim() || 'Customer',
      email: email?.toString().trim() || null,
      pin: null,
      type: 'customer',
      phone_country_code: '1',
      phone_number_id: null,
      phone_number: phone?.toString().trim() || null,
      company: companyName?.toString().trim() || null,
      consented_to_sms_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    }

    try {
      const response = await $fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: payload
      })

      console.log(`✅ CUSTOMER POST RESPONSE (Row ${i + 1}):`, response)
      ok++
      results.push({ ok: true, data: response })
    } catch (err: any) {
      console.error(`❌ CUSTOMER POST ERROR (Row ${i + 1}):`, err)
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
