import { defineEventHandler, getQuery, setHeader, createError } from 'h3'
import { schemas } from '~/utils/importSchemas'

export default defineEventHandler((event) => {
  const { entity } = getQuery(event) as { entity?: string }
  if (!entity || !(entity in schemas)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown or missing ?entity' })
  }
  const s = schemas[entity as keyof typeof schemas]
  const headers = [...s.required, ...s.optional]
  const csv = headers.join(',') + '\r\n'

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${s.filename}"`)
  return csv
})
