<!-- pages/index.vue -->
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
      <ImportRow
        v-for="item in rows"
        :key="item.key"
        :item="item"
        :disabled="isUploading(item.key)"
        :visibleTooltip="visibleTooltip"
        @show="showTooltip"
        @hideDelayed="hideTooltipDelayed"
        @cancelHide="cancelHide"
        @hide="hideTooltip"
        @download="downloadTemplate"
        @request-upload="handleUploadClick"
      />

      <!-- Console / Summaries + errors -->
      <ImportConsole
        :empSummary="summaries.employees.value"
        :staffSummary="summaries.staff.value"
        :equipSummary="summaries.equipment.value"
        :jobsSummary="summaries.jobs.value"
        :tasksSummary="summaries.tasks.value"
        :customersSummary="summaries.customers.value"
        :empErrors="errors.employees.value"
        :staffErrors="errors.staff.value"
        :equipErrors="errors.equipment.value"
        :jobsErrors="errors.jobs.value"
        :tasksErrors="errors.tasks.value"
        :customersErrors="errors.customers.value"
      />
    </section>

    <!-- Hidden inputs -->
    <input ref="empInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onPicked($event, 'employees')" />
    <input ref="staffInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onPicked($event, 'staff')" />
    <input ref="equipInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onPicked($event, 'equipment')" />
    <input ref="jobsInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onPicked($event, 'jobs')" />
    <input ref="tasksInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onPicked($event, 'tasks')" />
    <input ref="customersInput" type="file" class="sr-only" accept=".csv,text/csv" @change="onPicked($event, 'customers')" />
  </main>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import ImportRow from '../components/imports/ImportRow.vue'
import ImportConsole from '../components/imports/ImportConsole.vue'
import { rows, type ImportRow as Row } from '../data/importRows'
import { useUploader } from '../composables/useUploader'
import { useImportState, type ImportKey } from '../composables/useImportState'

// --- File input refs ---
const empInput = ref<HTMLInputElement | null>(null)
const staffInput = ref<HTMLInputElement | null>(null)
const equipInput = ref<HTMLInputElement | null>(null)
const jobsInput = ref<HTMLInputElement | null>(null)
const tasksInput = ref<HTMLInputElement | null>(null)
const customersInput = ref<HTMLInputElement | null>(null)

// 🔁 Centralized import state (summaries, errors, uploading)
const { uploading, summaries, errors, isUploading, resetFor } = useImportState()

// Tooltip state (single visible across rows)
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

// Helpers from composable
const { downloadTemplate, doUpload } = useUploader()

function handleUploadClick(key: Row['key']) {
  if (key === 'employees') empInput.value?.click()
  else if (key === 'staff') staffInput.value?.click()
  else if (key === 'equipment') equipInput.value?.click()
  else if (key === 'jobs') jobsInput.value?.click()
  else if (key === 'tasks') tasksInput.value?.click()
  else if (key === 'customers') customersInput.value?.click()
}

// Map row key -> endpoint/label
const endpointMap: Record<ImportKey, { endpoint: string; label: string; inputRef: any }> = {
  employees: { endpoint: '/api/crew/employees', label: 'Employees & Foreman', inputRef: empInput },
  staff:     { endpoint: '/api/crew/staff',     label: 'Staff',                inputRef: staffInput },
  equipment: { endpoint: '/api/crew/equipment', label: 'Equipment',            inputRef: equipInput },
  jobs:      { endpoint: '/api/crew/jobs',      label: 'Jobs',                 inputRef: jobsInput },
  tasks:     { endpoint: '/api/crew/tasks',     label: 'Tasks',                inputRef: tasksInput },
  customers: { endpoint: '/api/crew/customers', label: 'Customers',            inputRef: customersInput },
}

async function onPicked(e: Event, key: ImportKey) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Only clear THIS entity's console
  resetFor(key)
  uploading[key].value = true

  const { endpoint, label, inputRef } = endpointMap[key]

  try {
    const { summaryLine, rowErrors } = await doUpload(file, endpoint, label)
    summaries[key].value = summaryLine
    errors[key].value = rowErrors
  } finally {
    if (inputRef.value) inputRef.value.value = ''
    uploading[key].value = false
    await nextTick()
    document.querySelector('.board')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }
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
.sr-only {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
