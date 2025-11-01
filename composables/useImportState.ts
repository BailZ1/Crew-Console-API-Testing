// composables/useImportState.ts
import { ref } from 'vue'

export type ImportKey =
  | 'employees'
  | 'staff'
  | 'equipment'
  | 'jobs'
  | 'tasks'
  | 'customers'

export function useImportState() {
  const uploading = {
    employees: ref(false),
    staff: ref(false),
    equipment: ref(false),
    jobs: ref(false),
    tasks: ref(false),
    customers: ref(false)
  } as const

  const summaries = {
    employees: ref(''),
    staff: ref(''),
    equipment: ref(''),
    jobs: ref(''),
    tasks: ref(''),
    customers: ref('')
  } as const

  const errors = {
    employees: ref<any[]>([]),
    staff: ref<any[]>([]),
    equipment: ref<any[]>([]),
    jobs: ref<any[]>([]),
    tasks: ref<any[]>([]),
    customers: ref<any[]>([])
  } as const

  const isUploading = (key: ImportKey) => uploading[key].value
  const resetFor = (key: ImportKey) => {
    summaries[key].value = ''
    errors[key].value = []
  }

  return {
    uploading,
    summaries,
    errors,
    isUploading,
    resetFor
  }
}
