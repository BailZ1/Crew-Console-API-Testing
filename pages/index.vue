<template>
  <main class="page">
    <section class="board">
      <!-- Header row -->
      <header class="board-head">
        <div></div>
        <div class="col-title">Download Template</div>
        <div class="col-title">Upload .csv file</div>
      </header>

      <!-- Rows -->
      <article v-for="item in rows" :key="item.key" class="row">
        <!-- Label + tooltip -->
        <h3 class="label">
          <span class="tooltip-wrap" tabindex="0">
            {{ item.name }}
            <span class="tooltip-bubble" role="tooltip">
              <template v-for="(line, i) in item.desc" :key="i">
                <span>{{ line }}</span><br/>
              </template>
              <a href="#" target="_blank" rel="noreferrer">Watch here on how to fill out the .csv file.</a>
            </span>
          </span>
        </h3>

        <!-- Download template (immediate download via blob) -->
        <button
          class="icon-btn"
          :class="{ disabled: !item.template }"
          aria-label="Download CSV template"
          @click="item.template && downloadTemplate(item)"
        >
          <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
            <rect x="10" y="12" width="36" height="44" rx="4" fill="#E7EEF7" stroke="#9CB3D2" stroke-width="2"/>
            <path d="M38 12v12h12" fill="#E7EEF7" stroke="#9CB3D2" stroke-width="2"/>
            <rect x="16" y="42" width="28" height="14" rx="6" :fill="item.template ? '#22C55E' : '#A3A3A3'"/>
            <text x="30" y="52" text-anchor="middle" font-size="11" fill="white" font-weight="700"
                  font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial">CSV</text>
          </svg>
        </button>

        <!-- Upload icon -->
        <button
          class="icon-btn upload"
          :aria-label="`Upload CSV for ${item.name}`"
          @click="handleUploadClick(item.key)"
          :disabled="(item.key === 'employees' && uploadingEmp) || (item.key === 'equipment' && uploadingEquip)"
        >
          <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
            <path d="M22 30l10-12 10 12" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M32 18v26" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M14 44v6a6 6 0 006 6h24a6 6 0 006-6v-6" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </article>

      <!-- Optional summaries -->
      <div style="margin:8px 6px 0; color:#475569; font-size:14px;">
        <p v-if="empSummary">Employees & Foreman — {{ empSummary }}</p>
        <p v-if="equipSummary">Equipment — {{ equipSummary }}</p>
      </div>
    </section>

    <!-- Hidden file inputs (outside v-for) -->
    <input
      ref="empInput"
      type="file"
      class="sr-only"
      accept=".csv,text/csv"
      @change="onEmpPicked"
    />
    <input
      ref="equipInput"
      type="file"
      class="sr-only"
      accept=".csv,text/csv"
      @change="onEquipPicked"
    />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Papa from 'papaparse'

type Row = {
  key: 'employees'|'staff'|'equipment'|'jobs'|'tasks'|'customers'
  name: string
  desc: string[]
  template?: string           // path under /public (e.g., /templates/Jobs.csv)
  downloadName?: string       // suggested filename
}

const rows: Row[] = [
  {
    key: 'employees',
    name: 'Employees and Foreman',
    desc: [
      'Employees and Foreman are people that can be',
      'scheduled to job events and can keep time. They will',
      'access the app with the pin number you assign them.',
      'Foreman can also approve time and put in time for other',
      'people.'
    ],
    template: '/templates/Employee_Foreman.csv',
    downloadName: 'employees_and_foreman_template.csv'
  },
  {
    key: 'staff',
    name: 'Staff',
    desc: [
      'Staff, are people who you want to give additional feature',
      'access to. You can assign features to each staff member',
      'individually such as, the ability to edit the schedule, view',
      'the schedule, access payroll, etc. Staff can also be',
      'scheduled like Employees and foreman, set up to',
      'approve time, and enter time for other people. Staff',
      'members will log into the app with the email and',
      'password you set up for them.'
    ],
    template: '/templates/Staff.csv',
    downloadName: 'staff_template.csv'
  },
  {
    key: 'equipment',
    name: 'Equipment',
    desc: [
      'Equipment, is any piece of machinery you want to',
      'schedule along with your Employees, Foreman, and staff.',
      'Equipment can also be added to crews.'
    ],
    template: '/templates/Equipment.csv',
    downloadName: 'equipment_template.csv'
  },
  {
    key: 'jobs',
    name: 'Jobs',
    desc: [
      'Jobs are the locations you will be working at. You can put',
      'them on the schedule, photos, videos, docs, and notes can be',
      'stored in them, tasks can be assigned to them, goals created',
      '(man hour and material), and people can assign time to them.'
    ],
    template: '/templates/Jobs.csv',
    downloadName: 'jobs_template.csv'
  },
  {
    key: 'tasks',
    name: 'Tasks',
    desc: [
      'Tasks can be assigned to jobs. They can be scheduled to job',
      'events, people can put their time to them, and photos, vids,',
      'docs, and notes can be assigned to them under a job.'
    ],
    template: '/templates/Tasks.csv',
    downloadName: 'tasks_template.csv'
  },
  {
    key: 'customers',
    name: 'Customers',
    desc: [
      'Customers can be assigned to jobs. You can filter the schedule',
      'by customer name, view all hours entered on jobs by customer,',
      'and even send event texts to customers from the schedule.'
    ],
    template: '/templates/Customers.csv',
    downloadName: 'customers_template.csv'
  }
]

/** --------- Download templates (from /public) as a real download ---------- */
async function downloadTemplate(item: Row) {
  if (!item.template) return
  try {
    const res = await fetch(item.template, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.downloadName || item.template.split('/').pop() || 'template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Download failed:', e)
    alert('Sorry—download failed. Please try again.')
  }
}

/** --------- Employees & Foreman upload ---------- */
const empInput = ref<HTMLInputElement | null>(null)
const uploadingEmp = ref(false)
const empSummary = ref('')

/** --------- Equipment upload ---------- */
const equipInput = ref<HTMLInputElement | null>(null)
const uploadingEquip = ref(false)
const equipSummary = ref('')

/**
 * Parse CSV where:
 *   Row 1  -> instructions (ignore)
 *   Row 2  -> column headers
 *   Row 3+ -> data rows
 * Returns array of objects keyed by the headers in row 2.
 */
function readCsvFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,          // we'll construct objects manually
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data as unknown as any[][]) || []
        if (rows.length < 2) { resolve([]); return }

        // Row 2 (index 1) is the header row
        const headerRow = rows[1] || []
        const headers = headerRow.map((h) => String(h ?? '').trim())

        // Data starts at row 3 (index 2)
        const dataRows = rows.slice(2)

        const objects = dataRows.map((r) => {
          const obj: Record<string, any> = {}
          headers.forEach((h, i) => { if (h) obj[h] = r[i] })
          return obj
        })

        resolve(objects)
      },
      error: (err) => reject(err)
    })
  })
}

/** Route upload clicks to the correct hidden input */
function handleUploadClick(key: Row['key']) {
  if (key === 'employees') empInput.value?.click()
  else if (key === 'equipment') equipInput.value?.click()
  // Staff/Jobs/Tasks/Customers can be wired the same way later
}

/** Handle Employees CSV selection */
async function onEmpPicked (e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingEmp.value = true
  empSummary.value = ''
  try {
    const rows = await readCsvFile(file)
    // Calls server/api/crew/employees.post.ts
    const res = await $fetch<{ ok: number; failed: number; results: any[] }>(
      '/api/crew/employees',
      { method: 'POST', body: { rows } }
    )
    empSummary.value = `Created ${res.ok}, failed ${res.failed}.`
  } catch (err: any) {
    empSummary.value = err?.data?.message || err?.message || 'Upload failed'
  } finally {
    if (empInput.value) empInput.value.value = ''
    uploadingEmp.value = false
  }
}

/** Handle Equipment CSV selection */
async function onEquipPicked (e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingEquip.value = true
  equipSummary.value = ''
  try {
    const rows = await readCsvFile(file)
    // Calls server/api/crew/equipment.post.ts
    const res = await $fetch<{ ok: number; failed: number; results: any[] }>(
      '/api/crew/equipment',
      { method: 'POST', body: { rows } }
    )
    equipSummary.value = `Created ${res.ok}, failed ${res.failed}.`
  } catch (err: any) {
    equipSummary.value = err?.data?.message || err?.message || 'Upload failed'
  } finally {
    if (equipInput.value) equipInput.value.value = ''
    uploadingEquip.value = false
  }
}
</script>

<style scoped>
/* Page background */
.page { min-height: 100vh; background: #EFF3F7; padding: 24px 16px; }

/* Main rounded card */
.board {
  max-width: 1000px; margin: 0 auto; background: #fff; border-radius: 26px;
  border: 1px solid #E6E8EE; box-shadow: 0 6px 28px rgba(16,24,40,.08);
  padding: 16px 12px 20px; overflow: visible;
}

/* Header strip */
.board-head {
  display: grid; grid-template-columns: 1fr 220px 200px; align-items: center;
  padding: 6px 12px 10px;
}
.col-title { text-align: center; color: #5F6B7A; font-weight: 700; font-size: 14px; }

/* Rows */
.row {
  display: grid; grid-template-columns: 1fr 220px 200px; align-items: center;
  gap: 10px; padding: 18px 14px; margin: 10px 6px; background: #fff;
  border: 1px solid #E5E7EB; border-radius: 16px; transition: box-shadow .15s, border-color .15s;
}
.row:hover { border-color: #D7DBE3; box-shadow: 0 4px 18px rgba(16,24,40,.08); }

.label { margin: 0; font-size: 22px; line-height: 1.2; color: #243042; font-weight: 800; }

/* Icon buttons */
.icon-btn {
  justify-self: center; display: inline-flex; align-items: center; justify-content: center;
  width: 72px; height: 56px; border-radius: 12px; background: #F8FAFC; border: 1px solid #E2E8F0;
  color: #0B1526; cursor: pointer; text-decoration: none;
}
.icon-btn:hover { background: #F3F6FB; }
.icon-btn.upload { font-size: 0; }
.icon-btn.disabled { opacity: .45; pointer-events: none; }

/* Tooltips */
.tooltip-wrap { position: relative; display: inline-block; }
.tooltip-bubble {
  position: absolute; left: -20px; top: 42px; width: 600px; max-width: 70vw;
  background: #000; color: #fff; padding: 18px 20px; border-radius: 24px; font-size: 18px; line-height: 1.45;
  box-shadow: 0 10px 28px rgba(0,0,0,.35); opacity: 0; transform: translateY(6px); pointer-events: none;
  transition: opacity .12s ease, transform .12s ease; z-index: 30;
}
.tooltip-wrap:hover .tooltip-bubble, .tooltip-wrap:focus-within .tooltip-bubble { opacity: 1; transform: translateY(0); pointer-events: auto; }
.tooltip-bubble::after {
  content: ""; position: absolute; top: -18px; right: 160px; width: 0; height: 0;
  border-left: 18px solid transparent; border-right: 18px solid transparent; border-bottom: 18px solid #000;
  transform: rotate(-16deg);
}
.tooltip-bubble a { color: #60A5FA; text-decoration: underline; }

/* Responsive */
@media (max-width: 820px) {
  .board-head { display: none; }
  .row { grid-template-columns: 1fr auto auto; }
  .tooltip-bubble { width: min(90vw, 600px); left: -6px; }
}

/* Screen-reader only (for hidden inputs) */
.sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>
