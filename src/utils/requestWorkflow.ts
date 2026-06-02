import type { RequestStatus, RequestType } from '../types/hospital'

export function getAssignedRoleForRequestType(type: RequestType): string {
  const roles: Record<RequestType, string> = {
    pain_medication: 'Nurse',
    water: 'Patient Care Assistant',
    interpreter: 'Language Services',
    family_update: 'Nurse',
    bathroom_assistance: 'Patient Care Assistant',
    discharge_paperwork: 'Case Manager',
    extra_blanket: 'Patient Care Assistant',
    tv_not_working: 'Facilities',
  }

  return roles[type]
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export const requestStatusStyles: Record<RequestStatus, string> = {
  open: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  acknowledged:
    'border-violet-200 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
  in_progress:
    'border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
  resolved:
    'border-green-200 dark:border-green-900/60 bg-green-50/60 dark:bg-green-950/30 text-green-700 dark:text-green-300',
}
