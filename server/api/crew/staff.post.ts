import { defineEventHandler, readMultipartFormData, createError, readBody } from 'h3'
import { parse } from 'csv-parse/sync'

/**
 * Endpoint: /api/crew/staff
 * Accepts JSON body: { rows: [...] } from the frontend.
 * Required fields: Name First and Last, Employee ID, Email, Password
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const rows = body?.rows

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'CSV file is required' })
    }

    const requiredFields = ['Name First and Last', 'Employee ID', 'Email', 'Password']
    const results: any[] = []
    let ok = 0, failed = 0, validationErrors = 0

    rows.forEach((row: Record<string, any>, index: number) => {
      const missing: string[] = []

      for (const field of requiredFields) {
        if (!row[field] || String(row[field]).trim() === '') {
          missing.push(field)
        }
      }

      if (missing.length > 0) {
        failed++
        validationErrors++
        results.push({
          ok: false,
          error: `Missing required field(s): ${missing.join(', ')} on line ${index + 2}`,
          row
        })
        return
      }

      // Normalize optional fields (set to null if empty)
      const cleaned = {
        name: row['Name First and Last']?.trim() || null,
        employeeId: row['Employee ID']?.trim() || null,
        email: row['Email']?.trim() || null,
        password: row['Password']?.trim() || null,
        cellPhone: row['Cell Phone']?.trim() || null,
        payroll: row['Payroll']?.trim() || null,
        jobs: row['Jobs']?.trim() || null,
        users: row['Users']?.trim() || null,
        analysis: row['Analysis']?.trim() || null
      }

      results.push({ ok: true, data: cleaned })
      ok++
    })

    return {
      summary: { total: rows.length, ok, failed, validationErrors },
      results
    }
  } catch (err: any) {
    console.error('Error in staff.post.ts:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error processing CSV file',
      message: err.message
    })
  }
})
