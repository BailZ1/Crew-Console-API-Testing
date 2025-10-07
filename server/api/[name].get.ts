// server/api/templates/[name].get.ts
import { defineEventHandler, getRouterParam, setHeader, createError } from 'h3'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Whitelisted templates. Map the key used in the UI to the file name in /public/templates
 * (Equipment intentionally omitted for now.)
 */
const ALLOWED = new Map<string, string>([
  ['employees', 'Employee_Foreman.csv'],
  ['staff',      'Staff.csv'],
  ['jobs',       'Jobs.csv'],
  ['tasks',      'Tasks.csv'],
  ['customers',  'Customers.csv']
])

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  const file = ALLOWED.get(name)
  if (!file) {
    throw createError({ statusCode: 404, statusMessage: 'Template not found' })
  }

  const abs = join(process.cwd(), 'public', 'templates', file)
  const buf = await readFile(abs)

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${file}"`)
  return buf
})
