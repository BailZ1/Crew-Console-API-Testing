export type ImportRow =
  | {
      key: 'employees' | 'staff' | 'equipment' | 'jobs' | 'tasks' | 'customers'
      name: string
      desc: string[]
      template?: string
      downloadName?: string
    }

export const rows: ImportRow[] = [
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
