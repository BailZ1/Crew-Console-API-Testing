// server/api/crew/customers.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { createCrewClient } from '~/utils/crewClient'

type CsvRow = Record<string, any>

interface PostResult {
  ok: boolean
  res?: any
  error?: string
  row?: CsvRow
  payload?: any
  index?: number
  skippedReason?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ rows: CsvRow[] }>(event)
  if (!body?.rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'rows[] required' })
  }

  const client = createCrewClient()

  // Resolve owner company_id from first user (via central client)
  let baseCompanyId: number
  try {
    baseCompanyId = await client.resolveCompanyId()
  } catch (e: any) {
    throw createError({
      statusCode: e?.response?.status || 500,
      statusMessage: e?.message || 'Unable to resolve company_id from /api/users'
    })
  }

  const results: PostResult[] = []
  let ok = 0, failed = 0, validationErrors = 0, skippedDuplicates = 0

  // De-dupe within a single upload (Name+Email+Company)
  const seenKeys = new Set<string>()

  // Cache company name → id (avoid repeated GET/POST)
  const customerCompanyCache = new Map<string, number | null>()

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i] || {}

    // --- Required: Name First and Last ---
    const rawName = r['Name First and Last'] ?? r['name'] ?? r['Name']
    const name = (rawName ?? '').toString().trim()
    if (!name) {
      validationErrors++; failed++
      results.push({
        ok: false,
        error: `Row ${i + 2}: Missing required field "Name First and Last"`,
        row: r,
        index: i
      })
      continue
    }

    // --- Optional fields ---
    const role = (r['Role'] ?? '').toString().trim() || 'Customer'
    const email = (r['Email'] ?? '').toString().trim() || null
    const companyName = (r['Company'] ?? '').toString().trim() || ''
    const phone = (r['Cell Phone'] ?? '').toString().trim() || null

    // De-dupe key
    const deDupeKey = `${name.toLowerCase()}|${(email || '').toLowerCase()}|${companyName.toLowerCase()}`
    if (seenKeys.has(deDupeKey)) {
      skippedDuplicates++
      results.push({
        ok: false,
        skippedReason: 'Duplicate row in upload (same Name/Email/Company)',
        row: r,
        index: i
      })
      continue
    }
    seenKeys.add(deDupeKey)

    // Resolve or create customer_company_id if Company is provided; else null
    let customer_company_id: number | null = null
    if (companyName) {
      const key = companyName.toLowerCase()
      if (customerCompanyCache.has(key)) {
        customer_company_id = customerCompanyCache.get(key) ?? null
      } else {
        try {
          const id = await client.findOrCreateCompanyByName(companyName, baseCompanyId)
          customerCompanyCache.set(key, id)
          customer_company_id = id
        } catch (e: any) {
          // Log as a soft error, continue with null
          results.push({
            ok: false,
            error: `Row ${i + 2}: Could not resolve/create customer company "${companyName}". Proceeding with null. ${e?.message || ''}`,
            row: r,
            index: i
          })
        }
      }
    }

    const payload: any = {
      name,
      company_id: baseCompanyId,
      customer_company_id, // dynamic or null
      active: 1,
      role,
      email,
      pin: null,
      type: 'customer',
      phone_country_code: phone ? '1' : null,
      phone_number_id: null,
      phone_number: phone,
      company: companyName || null,
      consented_to_sms_at: phone ? nowSql() : null
    }

    try {
      const res = await client.post('/api/customers', payload)
      results.push({ ok: true, res, index: i })
      ok++
    } catch (err: any) {
      const status = err?.response?.status || 'Unknown'
      const msg =
        err?.response?._data?.message ||
        err?.message ||
        'Request failed'
      results.push({
        ok: false,
        error: `Row ${i + 1}: [${status}] ${msg}`,
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
      company_id_used: baseCompanyId
    },
    results
  }
})

function nowSql(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
