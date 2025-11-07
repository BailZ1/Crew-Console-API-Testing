<template>
  <div
    class="mt-2 mx-1.5 text-sm text-slate-600 space-y-1.5"
  >
    <!-- Summaries -->
    <p v-if="empSummary">Employees &amp; Foreman — {{ empSummary }}</p>
    <p v-if="staffSummary">Staff — {{ staffSummary }}</p>
    <p v-if="equipSummary">Equipment — {{ equipSummary }}</p>
    <p v-if="jobsSummary">Jobs — {{ jobsSummary }}</p>
    <p v-if="tasksSummary">Tasks — {{ tasksSummary }}</p>
    <p v-if="customersSummary">Customers — {{ customersSummary }}</p>

    <!-- Errors -->
    <div
      v-if="hasErrors"
      class="mt-1.5 ml-4 text-xs text-red-700"
    >
      <p>
        <strong>Errors found while importing:</strong>
      </p>
      <ul class="mt-0.5 list-disc ml-5">
        <li
          v-for="(err, i) in allErrors"
          :key="i"
        >
          {{ err.error }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'ImportConsole' })

const props = defineProps<{
  empSummary?: string
  staffSummary?: string
  equipSummary?: string
  jobsSummary?: string
  tasksSummary?: string
  customersSummary?: string
  empErrors: any[]
  staffErrors: any[]
  equipErrors: any[]
  jobsErrors: any[]
  tasksErrors: any[]
  customersErrors: any[]
}>()

const allErrors = computed(() => [
  ...props.empErrors,
  ...props.staffErrors,
  ...props.equipErrors,
  ...props.jobsErrors,
  ...props.tasksErrors,
  ...props.customersErrors
])

const hasErrors = computed(() => allErrors.value.length > 0)
</script>
