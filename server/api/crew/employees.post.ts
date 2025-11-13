// server/api/crew/users/employees.post.ts
import {
  defineEventHandler,
  readMultipartFormData,
  readBody,
  createError
} from 'h3'
import { parse } from 'csv-parse/sync'
import { createCrewClient } from '~/utils/crewClient'

type CsvRow = Record<string, any>

export default defineEventHandler(async (event) => {
  const client = createCrewClient()

  let rows: CsvRow[] = []

  // 1) Accept CSV upload (multipart) or JSON { rows }
  const form = await readMultipartFormData(event)
  const csvFile = form?.find(
    (f) => f.filename?.toLowerCase().endsWith('.csv') || f.type?.includes('csv')
  )

  if (csvFile?.data) {
    const csvText = csvFile.data.toString('utf-8')
    rows = parse(csvText, { columns: true, skip_empty_lines: true })
  } else {
    const body = await readBody<{ rows?: CsvRow[] }>(event)
    if (body?.rows?.length) rows = body.rows
  }

  if (!rows?.length) {
    throw createError({ statusCode: 400, statusMessage: 'CSV file is required' })
  }

  // 2) Resolve default company_id once
  let resolvedCompanyId: number | null = null
  try {
    resolvedCompanyId = await client.resolveCompanyId()
  } catch (e: any) {
    throw createError({
      statusCode: e?.response?.status || 500,
      statusMessage: e?.message || 'Unable to resolve company_id from /api/users'
    })
  }

  // --- Your exact headers (primary) + a couple safe aliases as fallback ---
  const NAME_HEADERS = ['Name First and Last', 'Name']
  const PIN_HEADERS = ['Pin (4 digits or more)', 'PIN', 'Pin']
  const EMP_ID_HEADERS = ['Employee ID', 'ID']
  const PHONE_HEADERS = ['Cell Number', 'Cell Phone', 'Phone Number', 'Phone']
  const FOREMAN_HEADERS = ['Foreman']
  const TRACKING_HEADERS = ['Tracking'] // maps to time_clock_level

  // Helper: normalize keys lightly to survive minor punctuation/spacing changes
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const getFromColumns = (row: CsvRow, candidates: string[]): string => {
    const keyMap = new Map<string, string>()
    for (const k of Object.keys(row || {})) keyMap.set(norm(k), k)
    for (const c of candidates) {
      const hit = keyMap.get(norm(c))
      if (hit && row[hit] != null && row[hit] !== '') return String(row[hit]).trim()
    }
    return ''
  }

  const parseYes = (v: any): boolean => {
    if (v == null) return false
    const s = v.toString().trim().toLowerCase()
    return s === 'yes' || s === 'y' || s === 'true' || s === '1' || s === 'x'
  }

  const normalizePhone = (raw?: string | null) => {
    if (!raw) return null
    const s = String(raw).trim()
    if (/^\+\d{8,15}$/.test(s)) {
      const cc = (s.match(/^\+(\d{1,3})/) || [])[1] || null
      return { e164: s, country: cc }
    }
    const digits = s.replace(/\D+/g, '')
    if (digits.length === 10) return { e164: `+1${digits}`, country: '1' as const }
    if (digits.length === 11 && digits.startsWith('1')) return { e164: `+${digits}`, country: '1' as const }
    return { e164: s, country: null as string | null }
  }

  const nowSql = (): string => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  // 3) Validate + POST each row
  const results: any[] = []
  let lineNumber = 1

  for (const r of rows) {
    lineNumber++

    // Required fields (using your exact headers)
    const name = getFromColumns(r, NAME_HEADERS)
    const pin = getFromColumns(r, PIN_HEADERS)

    if (!name || !pin) {
      const missing: string[] = []
      if (!name) missing.push('Name First and Last')
      if (!pin) missing.push('Pin (4 digits or more)')
      results.push({
        ok: false,
        error: `Missing required field(s): ${missing.join(', ')} on line ${lineNumber}`,
        row: r
      })
      continue
    }

    // Strict: exactly 4 numeric digits
    if (!/^\d{4}$/.test(pin)) {
      results.push({
        ok: false,
        error: `Invalid PIN on line ${lineNumber}: must be exactly 4 digits (0–9)`,
        row: r
      })
      continue
    }

    // Optional
    const employee_id = getFromColumns(r, EMP_ID_HEADERS) || null
    const phoneRaw = getFromColumns(r, PHONE_HEADERS) || null
    const phoneNorm = phoneRaw ? normalizePhone(phoneRaw) : null
    const foreman = parseYes(getFromColumns(r, FOREMAN_HEADERS)) ? 1 : 0
    const time_clock_level = parseYes(getFromColumns(r, TRACKING_HEADERS)) ? 1 : 0

    // Employees should never be created as admins here; force a safe role.
    const role = 'user'

    const payload: any = {
      name,
      pin,                    // string → preserves leading zeros
      employee_id,            // ← from "Employee ID"
      company_id: resolvedCompanyId,
      role,                   // force regular user
      employee: 1,            // mark as employee
      active: 1,
      foreman,                // ← from "Foreman"
      time_clock_level        // ← from "Tracking" (Y/Yes/true/1/x => 1)
    }

    if (phoneNorm) {
      payload.phone = phoneNorm.e164
      payload.phone_number = phoneNorm.e164
      if (phoneNorm.country) payload.phone_country_code = phoneNorm.country
      payload.consented_to_sms_at = nowSql()
    }

    try {
      const res = await client.post('/api/users', payload)
      results.push({ ok: true, res })
    } catch (err: any) {
      const status = err?.response?.status || 'Unknown'
      const msg =
        err?.response?._data?.message ||
        err?.message ||
        'Request failed'
      results.push({
        ok: false,
        error: `[${status}] ${msg}`,
        payload
      })
    }
  }

  // 4) Summary
  const ok = results.filter((r) => r.ok).length
  const failed = results.length - ok
  const validationErrors = results.filter((r) =>
    String(r.error || '').match(/Missing|required|Invalid PIN/i)
  )

  return {
    summary: {
      total: results.length,
      ok,
      failed,
      validationErrors: validationErrors.length,
      company_id_used: resolvedCompanyId
    },
    results
  }
})
