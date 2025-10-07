// utils/importSchemas.ts
export type EntityKey = 'jobs' | 'customers' | 'staff' | 'tasks'

export const schemas: Record<EntityKey, {
  label: string
  filename: string
  required: string[]
  optional: string[]
}> = {
  jobs: { label: 'Jobs', filename: 'jobs.csv', required: ['name'], optional: ['address','city','state','zip','customer_external_id','notes'] },
  customers: { label: 'Customers', filename: 'customers.csv', required: ['name'], optional: ['email','phone','address','city','state','zip'] },
  staff: { label: 'Staff', filename: 'staff.csv', required: ['first_name','last_name'], optional: ['email','phone','role'] },
  tasks: { label: 'Tasks', filename: 'tasks.csv', required: ['job_external_id','name'], optional: ['description','due_date','priority','status'] }
}
