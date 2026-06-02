import { getSupabaseClient } from '../lib/supabaseClient'
import type { DischargeTask, DischargeTaskStatus } from '../types/hospital'
import {
  DISCHARGE_TASK_TEMPLATES,
  getInitialStatusForNewWorkflow,
} from '../utils/dischargeWorkflow'

export type DischargeTaskRow = {
  id: string
  patient_id: string
  task_type: string
  label: string
  assigned_role: string
  status: DischargeTaskStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

const DISCHARGE_TASK_SELECT =
  'id, patient_id, task_type, label, assigned_role, status, completed_at, created_at, updated_at'

export function mapDischargeTaskRow(row: DischargeTaskRow): DischargeTask {
  return {
    id: row.id,
    patientId: row.patient_id,
    taskType: row.task_type,
    label: row.label,
    assignedRole: row.assigned_role,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchDischargeTasksForPatient(
  patientId: string,
): Promise<DischargeTask[]> {
  const { data, error } = await getSupabaseClient()
    .from('discharge_tasks')
    .select(DISCHARGE_TASK_SELECT)
    .eq('patient_id', patientId)
    .order('created_at')

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapDischargeTaskRow(row as DischargeTaskRow))
}

export async function fetchDischargeTasks(): Promise<DischargeTask[]> {
  const { data, error } = await getSupabaseClient()
    .from('discharge_tasks')
    .select(DISCHARGE_TASK_SELECT)
    .order('created_at')

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapDischargeTaskRow(row as DischargeTaskRow))
}

export async function createDefaultDischargeTasksForPatient(
  patientId: string,
): Promise<DischargeTask[]> {
  const existingTasks = await fetchDischargeTasksForPatient(patientId)

  if (existingTasks.length > 0) {
    return existingTasks
  }

  const rows = DISCHARGE_TASK_TEMPLATES.map((template) => ({
    patient_id: patientId,
    task_type: template.taskType,
    label: template.label,
    assigned_role: template.assignedRole,
    status: getInitialStatusForNewWorkflow(template.taskType),
  }))

  const { data, error } = await getSupabaseClient()
    .from('discharge_tasks')
    .insert(rows)
    .select(DISCHARGE_TASK_SELECT)

  if (error) {
    if (error.code === '23505') {
      return fetchDischargeTasksForPatient(patientId)
    }

    throw error
  }

  return (data ?? []).map((row) => mapDischargeTaskRow(row as DischargeTaskRow))
}

export async function updateDischargeTaskStatus(
  taskId: string,
  status: DischargeTaskStatus,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('discharge_tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) {
    throw error
  }
}
