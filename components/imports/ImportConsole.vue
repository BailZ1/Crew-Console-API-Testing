<template>
  <div class="console-wrap">
    <p v-if="empSummary">Employees &amp; Foreman — {{ empSummary }}</p>
    <p v-if="staffSummary">Staff — {{ staffSummary }}</p>
    <p v-if="equipSummary">Equipment — {{ equipSummary }}</p>
    <p v-if="jobsSummary">Jobs — {{ jobsSummary }}</p>
    <p v-if="tasksSummary">Tasks — {{ tasksSummary }}</p>
    <p v-if="customersSummary">Customers — {{ customersSummary }}</p>

    <div v-if="hasErrors" class="errors">
      <p><strong>Errors found while importing:</strong></p>
      <ul>
        <li v-for="(err, i) in allErrors" :key="i">
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

<style scoped>
.console-wrap {
  margin: 8px 6px 0;
  color: #475569;
  font-size: 14px;
}
.errors {
  margin-left: 18px;
  margin-top: 6px;
  color: #b91c1c;
  font-size: 13px;
}
.errors ul {
  margin-top: 2px;
  list-style-type: disc;
  margin-left: 18px;
}
</style>
