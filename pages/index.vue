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
        <h3 class="label">
          <span
            class="tooltip-wrap"
            tabindex="0"
            @mouseenter="showTooltip(item.key)"
            @mouseleave="hideTooltipDelayed(item.key)"
          >
            {{ item.name }}
            <span
              class="tooltip-bubble"
              :class="{ visible: visibleTooltip === item.key }"
              role="tooltip"
              @mouseenter="cancelHide()"
              @mouseleave="hideTooltip()"
            >
              <template v-for="(line, i) in item.desc" :key="i">
                <span>{{ line }}</span><br />
              </template>
              <a href="#" target="_blank" rel="noreferrer">
                Watch here on how to fill out the .csv file.
              </a>
            </span>
          </span>
        </h3>

        <!-- Download template -->
        <button
          class="icon-btn"
          :class="{ disabled: !item.template }"
          aria-label="Download CSV template"
          @click="item.template && downloadTemplate(item)"
        >
          <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
            <rect
              x="10"
              y="12"
              width="36"
              height="44"
              rx="4"
              fill="#E7EEF7"
              stroke="#9CB3D2"
              stroke-width="2"
            />
            <path
              d="M38 12v12h12"
              fill="#E7EEF7"
              stroke="#9CB3D2"
              stroke-width="2"
            />
            <rect
              x="16"
              y="42"
              width="28"
              height="14"
              rx="6"
              :fill="item.template ? '#22C55E' : '#A3A3A3'"
            />
            <text
              x="30"
              y="52"
              text-anchor="middle"
              font-size="11"
              fill="white"
              font-weight="700"
              font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
            >
              CSV
            </text>
          </svg>
        </button>

        <!-- Upload CSV -->
        <button
          class="icon-btn upload"
          :aria-label="`Upload CSV for ${item.name}`"
          @click="handleUploadClick(item.key)"
          :disabled="
            (item.key === 'employees' && uploadingEmp) ||
            (item.key === 'staff' && uploadingStaff) ||
            (item.key === 'equipment' && uploadingEquip) ||
            (item.key === 'jobs' && uploadingJobs) ||
            (item.key === 'tasks' && uploadingTasks) ||
            (item.key === 'customers' && uploadingCustomers)
          "
        >
          <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
            <path
              d="M22 30l10-12 10 12"
              fill="none"
              stroke="currentColor"
              stroke-width="4.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M32 18v26"
              fill="none"
              stroke="currentColor"
              stroke-width="4.5"
              stroke-linecap="round"
            />
            <path
              d="M14 44v6a6 6 0 006 6h24a6 6 0 006-6v-6"
              fill="none"
              stroke="currentColor"
              stroke-width="4.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </article>

      <!-- Summaries -->
      <div style="margin:8px 6px 0; color:#475569; font-size:14px;">
        <p v-if="empSummary">Employees & Foreman — {{ empSummary }}</p>
        <p v-if="staffSummary">Staff — {{ staffSummary }}</p>
        <p v-if="equipSummary">Equipment — {{ equipSummary }}</p>
        <p v-if="jobsSummary">Jobs — {{ jobsSummary }}</p>
        <p v-if="tasksSummary">Tasks — {{ tasksSummary }}</p>
        <p v-if="customersSummary">Customers — {{ customersSummary }}</p>

        <!-- Display import errors -->
        <div
          v-if="empErrors.length || staffErrors.length || equipErrors.length || jobsErrors.length || tasksErrors.length || customersErrors.length"
          style="margin-left:18px; margin-top:6px; color:#b91c1c; font-size:13px;"
        >
          <p><strong>Errors found while importing:</strong></p>
          <ul style="margin-top:2px; list-style-type:disc; margin-left:18px;">
            <li
              v-for="(err, i) in [...empErrors, ...staffErrors, ...equipErrors, ...jobsErrors, ...tasksErrors, ...customersErrors]"
              :key="i"
            >
              {{ err.error }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Hidden inputs -->
    <input ref="empInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onEmpPicked" />
    <input ref="staffInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onStaffPicked" />
    <input ref="equipInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onEquipPicked" />
    <input ref="jobsInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onJobsPicked" />
    <input ref="tasksInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onTasksPicked" />
    <input ref="customersInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onCustomersPicked" />
  </main>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import Papa from 'papaparse'

type Row = {
  key: 'employees' | 'staff' | 'equipment' | 'jobs' | 'tasks' | 'customers'
  name: string
  desc: string[]
  template?: string
  downloadName?: string
}

const rows: Row[] = [
  {
    key: 'employees',
    name: 'Employees and Foreman',
    desc: [
      'Employees and Foreman are people that can be',
      'scheduled to job events and can keep time.',
      'Foreman can also approve time for others.'
    ],
    template: '/templates/Employee_Foreman.csv',
    downloadName: 'employees_and_foreman_template.csv'
  },
  {
    key: 'staff',
    name: 'Staff',
    desc: [
      'Staff are people with special access privileges.',
      'They can manage schedules, approve time, and more.'
    ],
    template: '/templates/Staff.csv',
    downloadName: 'staff_template.csv'
  },
  {
    key: 'equipment',
    name: 'Equipment',
    desc: [
      'Equipment is any machinery you want to schedule',
      'alongside your Employees, Foreman, and Staff.'
    ],
    template: '/templates/Equipment.csv',
    downloadName: 'equipment_template.csv'
  },
  {
    key: 'jobs',
    name: 'Jobs',
    desc: ['Job sites you’ll be working at.'],
    template: '/templates/Jobs.csv',
    downloadName: 'jobs_template.csv'
  },
  {
    key: 'tasks',
    name: 'Tasks',
    desc: ['Tasks assigned to jobs.'],
    template: '/templates/Tasks.csv',
    downloadName: 'tasks_template.csv'
  },
  {
    key: 'customers',
    name: 'Customers',
    desc: ['Customers can be linked to jobs for filtering.'],
    template: '/templates/Customers.csv',
    downloadName: 'customers_template.csv'
  }
]

// --- Refs for file inputs ---
const empInput = ref<HTMLInputElement | null>(null)
const staffInput = ref<HTMLInputElement | null>(null)
const equipInput = ref<HTMLInputElement | null>(null)
const jobsInput = ref<HTMLInputElement | null>(null)
const tasksInput = ref<HTMLInputElement | null>(null)
const customersInput = ref<HTMLInputElement | null>(null)

// --- Uploading state & summaries ---
const uploadingEmp = ref(false)
const uploadingStaff = ref(false)
const uploadingEquip = ref(false)
const uploadingJobs = ref(false)
const uploadingTasks = ref(false)
const uploadingCustomers = ref(false)

const empSummary = ref('')
const staffSummary = ref('')
const equipSummary = ref('')
const jobsSummary = ref('')
const tasksSummary = ref('')
const customersSummary = ref('')

const empErrors = ref<any[]>([])
const staffErrors = ref<any[]>([])
const equipErrors = ref<any[]>([])
const jobsErrors = ref<any[]>([])
const tasksErrors = ref<any[]>([])
const customersErrors = ref<any[]>([])

// --- Tooltip Logic ---
const visibleTooltip = ref<string | null>(null)
let hideTimeout: any = null

function showTooltip(key: string) {
  clearTimeout(hideTimeout)
  visibleTooltip.value = key
}
function hideTooltipDelayed(key: string) {
  hideTimeout = setTimeout(() => {
    if (visibleTooltip.value === key) visibleTooltip.value = null
  }, 300)
}
function cancelHide() {
  clearTimeout(hideTimeout)
}
function hideTooltip() {
  visibleTooltip.value = null
}

// --- CSV Parser ---
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

// --- Download Template ---
async function downloadTemplate(item: Row) {
  if (!item.template) return
  try {
    const res = await fetch(item.template, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.downloadName || 'template.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Download failed.')
  }
}

// --- Upload Click Handler ---
function handleUploadClick(key: string) {
  if (key === 'employees') empInput.value?.click()
  else if (key === 'staff') staffInput.value?.click()
  else if (key === 'equipment') equipInput.value?.click()
  else if (key === 'jobs') jobsInput.value?.click()
  else if (key === 'tasks') tasksInput.value?.click()
  else if (key === 'customers') customersInput.value?.click()
}

// --- General Upload Handler (Updated with Console Reset + Scroll) ---
async function uploadHandler(file: File | undefined, endpoint: string, summary: any, errors: any, uploading: any, input: any) {
  if (!file) return

  // 🧹 Clear all previous summaries & errors before new upload
  empSummary.value = staffSummary.value = equipSummary.value = jobsSummary.value = tasksSummary.value = customersSummary.value = ''
  empErrors.value = staffErrors.value = equipErrors.value = jobsErrors.value = tasksErrors.value = customersErrors.value = []

  uploading.value = true
  summary.value = ''
  errors.value = []

  try {
    const rows = await readCsvFile(file)
    const res = await $fetch<{ summary: any; results: any[] }>(endpoint, {
      method: 'POST',
      body: { rows }
    })
    summary.value = `Created ${res.summary.ok}, failed ${res.summary.failed}.`
    if (Array.isArray(res.results)) errors.value = res.results.filter((r) => !r.ok && r.error)
  } catch (err: any) {
    summary.value = err?.data?.message || err?.message || 'Upload failed'
  } finally {
    if (input.value) input.value.value = ''
    uploading.value = false

    // 📜 Auto-scroll to the console after upload
    await nextTick()
    document.querySelector('.board')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }
}

// --- Individual Upload Handlers ---
async function onEmpPicked(e: Event) {
  await uploadHandler((e.target as HTMLInputElement).files?.[0], '/api/crew/employees', empSummary, empErrors, uploadingEmp, empInput)
}
async function onStaffPicked(e: Event) {
  await uploadHandler((e.target as HTMLInputElement).files?.[0], '/api/crew/staff', staffSummary, staffErrors, uploadingStaff, staffInput)
}
async function onEquipPicked(e: Event) {
  await uploadHandler((e.target as HTMLInputElement).files?.[0], '/api/crew/equipment', equipSummary, equipErrors, uploadingEquip, equipInput)
}
async function onJobsPicked(e: Event) {
  await uploadHandler((e.target as HTMLInputElement).files?.[0], '/api/crew/jobs', jobsSummary, jobsErrors, uploadingJobs, jobsInput)
}
async function onTasksPicked(e: Event) {
  await uploadHandler((e.target as HTMLInputElement).files?.[0], '/api/crew/tasks', tasksSummary, tasksErrors, uploadingTasks, tasksInput)
}
async function onCustomersPicked(e: Event) {
  await uploadHandler((e.target as HTMLInputElement).files?.[0], '/api/crew/customers', customersSummary, customersErrors, uploadingCustomers, customersInput)
}
</script>



<style scoped>
.page {
  min-height: 100vh;
  background: #EFF3F7;
  padding: 24px 16px;
}
.board {
  max-width: 1000px;
  margin: 0 auto;
  background: #fff;
  border-radius: 26px;
  border: 1px solid #E6E8EE;
  box-shadow: 0 6px 28px rgba(16, 24, 40, 0.08);
  padding: 16px 12px 20px;
}
.board-head {
  display: grid;
  grid-template-columns: 1fr 220px 200px;
  align-items: center;
  padding: 6px 12px 10px;
}
.col-title {
  text-align: center;
  color: #5F6B7A;
  font-weight: 700;
  font-size: 14px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 220px 200px;
  align-items: center;
  gap: 10px;
  padding: 18px 14px;
  margin: 10px 6px;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  transition: 0.15s;
}
.row:hover {
  border-color: #D7DBE3;
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.08);
}
.label {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  color: #243042;
  font-weight: 800;
}
.icon-btn {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 56px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  color: #0B1526;
  cursor: pointer;
}
.icon-btn:hover {
  background: #F3F6FB;
}
.icon-btn.upload {
  font-size: 0;
}
.icon-btn.disabled {
  opacity: 0.45;
  pointer-events: none;
}

/* Tooltip styling */
.tooltip-wrap {
  position: relative;
  display: inline-block;
}
.tooltip-bubble {
  position: absolute;
  left: -20px;
  top: 42px;
  width: 600px;
  max-width: 70vw;
  background: #000;
  color: #fff;
  padding: 18px 20px;
  border-radius: 24px;
  font-size: 18px;
  line-height: 1.45;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 30;
  pointer-events: none;
}
.tooltip-bubble.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.tooltip-bubble::after {
  content: '';
  position: absolute;
  top: -18px;
  right: 160px;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-bottom: 18px solid #000;
}
.tooltip-bubble a {
  color: #60A5FA;
  text-decoration: underline;
}
@media (max-width: 820px) {
  .board-head {
    display: none;
  }
  .row {
    grid-template-columns: 1fr auto auto;
  }
  .tooltip-bubble {
    width: min(90vw, 600px);
    left: -6px;
  }
}
.sr-only {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
