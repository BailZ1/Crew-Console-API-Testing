import Papa from 'papaparse'

export function useUploader() {
  function getFixHint(label: string, errors: string[], s?: any): string {
    const has = (re: RegExp) => errors.some((e) => re.test(e))

    if (has(/CSV must include a column named "Task Name"/i)) {
      return `Make sure your CSV header row contains an exact "Task Name" column. Download a fresh template if needed.`
    }
    if (has(/CSV must include a column named "Equipment name"/i)) {
      return `Make sure your CSV header row contains an exact "Equipment name" column. Use the Equipment template.`
    }
    if (has(/Missing required field/i)) {
      const req =
        label === 'Tasks' ? 'Task Name' :
        label === 'Equipment' ? 'Equipment name' :
        'all required columns'
      return `Fill the "${req}" column for every row (no blanks).`
    }
    if (has(/Duplicate in upload/i)) {
      return `Remove duplicate rows/names in your CSV before uploading.`
    }
    if (has(/company.*null/i) || has(/must be of type App\\Company, null given/i)) {
      const cid = s?.company_id_used
      return `Set a company context. Recommended: set CREW_COMPANY_ID in your environment (e.g., ${cid ?? '855'}) or use a company-scoped API token.`
    }
    if (has(/HTTP 422/i) || has(/Unprocessable Entity/i)) {
      return `One or more fields failed validation. Check cost codes/units formatting and required columns.`
    }
    if (has(/HTTP 4\d\d/i)) {
      return `Request was rejected by the server. Verify your CSV matches the template and your token has permission.`
    }
    if (has(/HTTP 5\d\d|Request failed|Server error/i)) {
      return `Server error. Try again in a moment; if it persists, contact support with the first error shown.`
    }
    return `Check the first few errors below, fix the CSV (headers + required fields), then re-upload.`
  }

  function buildSummaryLine(label: string, s: any, errs: any[]) {
    const ok = Number(s?.ok ?? 0)
    const failed = Number(s?.failed ?? 0)
    const validationErrors = Number(s?.validationErrors ?? 0)
    const skipped = Number(s?.skippedDuplicates ?? 0)
    const errTexts = Array.from(new Set((errs || []).map((e: any) => e?.error || '')))
    const topErrs = errTexts.slice(0, 3).join(' | ')
    const hint = getFixHint(label, errTexts, s)

    if ((failed === 0) && (validationErrors === 0) && errTexts.length === 0) {
      const extra = skipped ? ` (${skipped} duplicate${skipped > 1 ? 's' : ''} skipped)` : ''
      return `✅ ${label} — Success: created ${ok}${extra}.`
    }

    const parts: string[] = [
      `❌ ${label} — Imported with issues`,
      `(created ${ok}, failed ${failed}${validationErrors ? `, validation ${validationErrors}` : ''}${skipped ? `, dupes skipped ${skipped}` : ''})`
    ]
    if (topErrs) parts.push(`Top errors: ${topErrs}`)
    if (hint) parts.push(`Hint: ${hint}`)
    return parts.join(' — ')
  }

  function readCsvFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = (res.data as unknown as any[][]) || []
          if (rows.length < 2) {
            resolve([])
            return
          }
          const headers = (rows[1] || []).map((h) => String(h ?? '').trim())
          const dataRows = rows.slice(2)
          const objects = dataRows.map((r) => {
            const obj: Record<string, any> = {}
            headers.forEach((h, i) => {
              if (h) obj[h] = r[i]
            })
            return obj
          })
          resolve(objects)
        },
        error: (err) => reject(err)
      })
    })
  }

  async function downloadTemplate(item: { template?: string; downloadName?: string }) {
    if (!item.template) return
    const res = await fetch(item.template, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.downloadName || 'template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Returns a friendly summary + collected row errors
  async function doUpload(file: File, endpoint: string, label: string): Promise<{ summaryLine: string; rowErrors: any[] }> {
    try {
      const rows = await readCsvFile(file)
      const res = await $fetch<{ summary: any; results: any[] }>(endpoint, {
        method: 'POST',
        body: { rows }
      })
      const rowErrors = Array.isArray(res.results)
        ? res.results.filter((r: any) => !r?.ok && r?.error)
        : []
      const summaryLine = buildSummaryLine(label, res.summary, rowErrors)
      return { summaryLine, rowErrors }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Upload failed'
      return {
        summaryLine: `❌ ${label} — ${msg}. Hint: ensure your CSV uses the exact template headers and that the server is reachable.`,
        rowErrors: []
      }
    }
  }

  return { getFixHint, buildSummaryLine, readCsvFile, downloadTemplate, doUpload }
}
