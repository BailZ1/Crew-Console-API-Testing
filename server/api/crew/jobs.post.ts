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

  // ---- Helpers for flexible CSV headers ----
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const getFromColumns = (row: Record<string, any>, candidates: string[]): string => {
    const keyMap = new Map<string, string>()
    for (const k of Object.keys(row || {})) keyMap.set(norm(k), k)
    for (const c of candidates) {
      const hit = keyMap.get(norm(c))
      if (hit != null && row[hit] != null && row[hit] !== '') {
        return String(row[hit]).trim()
      }
    }
    return ''
  }

  // Match your template: Job Name, Job Number, Street Address 2, City, State, Zip, Country (2 letter ISO CODE)
  const JOB_NAME_HEADERS   = ['Job Name', 'job name', 'Name', 'name']
  const JOB_NUMBER_HEADERS = ['Job Number', 'job number', 'Number', 'number']

  const ADDRESS_STREET_HEADERS  = ['Street Address 2', 'Street Address', 'Street', 'Address', 'Address 1', 'Job Street']
  const ADDRESS_STREET2_HEADERS = ['Address 2', 'Street 2', 'Suite', 'Unit', 'Apt'] // not in template, but supported
  const CITY_HEADERS            = ['City', 'Job City']
  const STATE_HEADERS           = ['State', 'Province', 'Job State']
  const ZIP_HEADERS             = ['Zip', 'ZIP', 'Zip Code', 'Postal Code', 'Job Zip']
  const COUNTRY_HEADERS         = ['Country (2 letter ISO CODE)', 'Country']

  // Lat/Lng are not in your template, but supported if you ever add them
  const LAT_HEADERS             = ['Lat', 'Latitude']
  const LNG_HEADERS             = ['Lng', 'Long', 'Longitude']

  const results: any[] = []
  let ok = 0
  let failed = 0

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i] || {}

    const name = getFromColumns(r, JOB_NAME_HEADERS)
    const number = getFromColumns(r, JOB_NUMBER_HEADERS) || '' // optional

    // ✅ Only Job Name is required
    if (!name) {
      failed++
      results.push({
        ok: false,
        error: `Row ${i + 1}: Missing required Job Name`
      })
      continue
    }

    // ---- Build address object from CSV columns (all optional) ----
    const street   = getFromColumns(r, ADDRESS_STREET_HEADERS)
    const street_2 = getFromColumns(r, ADDRESS_STREET2_HEADERS)
    const city     = getFromColumns(r, CITY_HEADERS)
    const state    = getFromColumns(r, STATE_HEADERS)
    const zip      = getFromColumns(r, ZIP_HEADERS)
    const country  = getFromColumns(r, COUNTRY_HEADERS)
    const lat      = getFromColumns(r, LAT_HEADERS)
    const lng      = getFromColumns(r, LNG_HEADERS)

    const address: any = {
      street,
      street_2,
      city,
      state,
      zip,
      country,
      lat,
      lng
    }

    const hasAddress = Object.values(address).some(
      (v) => v != null && String(v).trim() !== ''
    )

    const job: any = {
      company_id: companyId,          // 🔹 dynamically resolved
      active: 1,
      name: name,
      number: number,
      deleted_at: null,
      color: '#0c4329'
    }

    // Attach nested address payload only if at least one field is present
    if (hasAddress) {
      job.address = address
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
