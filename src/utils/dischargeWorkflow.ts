import type { DischargeState, DischargeTask, DischargeTaskStatus } from '../types/hospital'

export const DISCHARGE_TASK_TEMPLATES = [
  {
    taskType: 'physician_clearance',
    label: 'Physician clearance',
    assignedRole: 'Provider',
  },
  {
    taskType: 'pt_clearance',
    label: 'PT clearance',
    assignedRole: 'PT',
  },
  {
    taskType: 'case_management_clearance',
    label: 'Case management clearance',
    assignedRole: 'Case Manager',
  },
  {
    taskType: 'medication_reconciliation',
    label: 'Medication reconciliation',
    assignedRole: 'Pharmacy',
  },
  {
    taskType: 'family_pickup',
    label: 'Family pickup / transportation',
    assignedRole: 'Case Manager',
  },
  {
    taskType: 'transport_request',
    label: 'Transport request',
    assignedRole: 'Transport',
  },
] as const

export const dischargeStateLabels: Record<DischargeState, string> = {
  not_started: 'Not started',
  pending_md: 'Pending MD',
  pending_pt: 'Pending PT',
  pending_case_manager: 'Pending case manager',
  pending_family_pickup: 'Pending family pickup',
  medication_ready: 'Medication ready',
  transport_delayed: 'Transport delayed',
  complete: 'Complete',
}

export const dischargeStateStyles: Record<DischargeState, string> = {
  not_started:
    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  pending_md:
    'border-violet-200 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
  pending_pt:
    'border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
  pending_case_manager:
    'border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
  pending_family_pickup:
    'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  medication_ready:
    'border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300',
  transport_delayed:
    'border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300',
  complete:
    'border-green-200 dark:border-green-900/60 bg-green-50/60 dark:bg-green-950/30 text-green-700 dark:text-green-300',
}

export function getInitialStatusForNewWorkflow(
  taskType: string,
): DischargeTaskStatus {
  return taskType === 'physician_clearance' ? 'in_progress' : 'pending'
}

export const DISCHARGE_TASK_ORDER = DISCHARGE_TASK_TEMPLATES.map(
  (template) => template.taskType,
)

export const dischargeTaskStatusLabels: Record<DischargeTaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  complete: 'Complete',
  blocked: 'Blocked',
}

export const dischargeTaskStatusStyles: Record<DischargeTaskStatus, string> = {
  pending:
    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  in_progress:
    'border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
  complete:
    'border-green-200 dark:border-green-900/60 bg-green-50/60 dark:bg-green-950/30 text-green-700 dark:text-green-300',
  blocked:
    'border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300',
}

export interface DischargeProgressSummary {
  completedCount: number
  totalCount: number
  blockedCount: number
  inProgressCount: number
  summaryLabel: string
}

export function sortDischargeTasks(tasks: DischargeTask[]): DischargeTask[] {
  return [...tasks].sort((a, b) => {
    const orderA = DISCHARGE_TASK_ORDER.indexOf(
      a.taskType as (typeof DISCHARGE_TASK_TEMPLATES)[number]['taskType'],
    )
    const orderB = DISCHARGE_TASK_ORDER.indexOf(
      b.taskType as (typeof DISCHARGE_TASK_TEMPLATES)[number]['taskType'],
    )

    return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
  })
}

export function getDischargeTasksForPatient(
  tasks: DischargeTask[],
  patientId: string,
): DischargeTask[] {
  return sortDischargeTasks(
    tasks.filter((task) => task.patientId === patientId),
  )
}

export function getDischargeProgressSummary(
  tasks: DischargeTask[],
): DischargeProgressSummary {
  const totalCount = tasks.length
  const completedCount = tasks.filter((task) => task.status === 'complete').length
  const blockedCount = tasks.filter((task) => task.status === 'blocked').length
  const inProgressCount = tasks.filter(
    (task) => task.status === 'in_progress',
  ).length

  let summaryLabel = `${completedCount}/${totalCount} complete`

  if (blockedCount > 0) {
    summaryLabel = `${blockedCount} blocked · ${summaryLabel}`
  } else if (inProgressCount > 0) {
    summaryLabel = `${inProgressCount} in progress · ${summaryLabel}`
  }

  return {
    completedCount,
    totalCount,
    blockedCount,
    inProgressCount,
    summaryLabel,
  }
}

export function computeDischargeStateFromTasks(
  tasks: DischargeTask[],
  fallback: DischargeState = 'not_started',
): DischargeState {
  if (tasks.length === 0) {
    return fallback
  }

  const allComplete = tasks.every((task) => task.status === 'complete')

  if (allComplete) {
    return 'complete'
  }

  const transportBlocked = tasks.some(
    (task) =>
      task.taskType === 'transport_request' && task.status === 'blocked',
  )

  if (transportBlocked) {
    return 'transport_delayed'
  }

  const firstOpen = sortDischargeTasks(tasks).find(
    (task) => task.status !== 'complete',
  )

  if (!firstOpen) {
    return 'complete'
  }

  switch (firstOpen.taskType) {
    case 'physician_clearance':
      return 'pending_md'
    case 'pt_clearance':
      return 'pending_pt'
    case 'case_management_clearance':
      return 'pending_case_manager'
    case 'medication_reconciliation':
      return 'medication_ready'
    case 'family_pickup':
      return 'pending_family_pickup'
    case 'transport_request':
      return 'pending_family_pickup'
    default:
      return fallback
  }
}

export function buildDefaultDischargeTasks(
  patientId: string,
  dischargeState: DischargeState,
): DischargeTask[] {
  const now = new Date().toISOString()

  return DISCHARGE_TASK_TEMPLATES.map((template, index) => {
    const status = getInitialTaskStatus(dischargeState, template.taskType)

    return {
      id: `task-${patientId}-${index + 1}`,
      patientId,
      taskType: template.taskType,
      label: template.label,
      assignedRole: template.assignedRole,
      status,
      completedAt: status === 'complete' ? now : null,
      createdAt: now,
      updatedAt: now,
    }
  })
}

function getInitialTaskStatus(
  dischargeState: DischargeState,
  taskType: string,
): DischargeTaskStatus {
  if (dischargeState === 'complete') {
    return 'complete'
  }

  if (dischargeState === 'transport_delayed') {
    if (taskType === 'transport_request') return 'blocked'
    if (
      taskType === 'physician_clearance' ||
      taskType === 'pt_clearance' ||
      taskType === 'case_management_clearance' ||
      taskType === 'medication_reconciliation' ||
      taskType === 'family_pickup'
    ) {
      return 'complete'
    }

    return 'pending'
  }

  if (dischargeState === 'pending_md') {
    return taskType === 'physician_clearance' ? 'in_progress' : 'pending'
  }

  if (dischargeState === 'pending_pt') {
    if (taskType === 'physician_clearance') return 'complete'
    if (taskType === 'pt_clearance') return 'in_progress'
    return 'pending'
  }

  if (dischargeState === 'pending_case_manager') {
    if (taskType === 'physician_clearance' || taskType === 'pt_clearance') {
      return 'complete'
    }
    if (taskType === 'case_management_clearance') return 'in_progress'
    return 'pending'
  }

  if (dischargeState === 'medication_ready') {
    if (
      taskType === 'physician_clearance' ||
      taskType === 'pt_clearance' ||
      taskType === 'case_management_clearance'
    ) {
      return 'complete'
    }
    if (taskType === 'medication_reconciliation') return 'in_progress'
    return 'pending'
  }

  if (dischargeState === 'pending_family_pickup') {
    if (
      taskType === 'physician_clearance' ||
      taskType === 'pt_clearance' ||
      taskType === 'case_management_clearance' ||
      taskType === 'medication_reconciliation'
    ) {
      return 'complete'
    }
    if (taskType === 'family_pickup') return 'in_progress'
    return 'pending'
  }

  return 'pending'
}
