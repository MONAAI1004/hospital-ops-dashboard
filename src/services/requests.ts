import { getSupabaseClient } from '../lib/supabaseClient'
import type {
  Patient,
  Request,
  RequestPriority,
  RequestStatus,
  RequestType,
} from '../types/hospital'

export type RequestRow = {
  id: string
  patient_id: string
  type: RequestType
  priority: RequestPriority
  status: RequestStatus
  assigned_role: string
  description: string
  resolved: boolean
  created_at: string
}

const REQUEST_SELECT =
  'id, patient_id, type, priority, status, assigned_role, description, resolved, created_at'

export { getAssignedRoleForRequestType } from '../utils/requestWorkflow'

export function mapRequestRow(
  row: RequestRow,
  patientsById: Map<string, Patient>,
): Request {
  const patient = patientsById.get(row.patient_id)

  return {
    id: row.id,
    patientId: row.patient_id,
    roomNumber: patient?.roomNumber ?? 0,
    type: row.type,
    priority: row.priority,
    status: row.status,
    assignedRole: row.assigned_role,
    description: row.description,
    resolved: row.resolved,
    createdAt: row.created_at,
  }
}

export async function fetchRequests(patients: Patient[]): Promise<Request[]> {
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]))

  const { data, error } = await getSupabaseClient()
    .from('requests')
    .select(REQUEST_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) =>
    mapRequestRow(row as RequestRow, patientsById),
  )
}

export async function fetchRequestRows(): Promise<RequestRow[]> {
  const { data, error } = await getSupabaseClient()
    .from('requests')
    .select(REQUEST_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as RequestRow[]
}

export async function createRequest(input: {
  patientId: string
  roomNumber: number
  type: RequestType
  priority: RequestPriority
  description: string
}): Promise<Request> {
  const { data, error } = await getSupabaseClient()
    .from('requests')
    .insert({
      patient_id: input.patientId,
      type: input.type,
      priority: input.priority,
      description: input.description,
      status: 'open',
    })
    .select(REQUEST_SELECT)
    .single()

  if (error) {
    throw error
  }

  return {
    id: data.id,
    patientId: data.patient_id,
    roomNumber: input.roomNumber,
    type: data.type,
    priority: data.priority,
    status: data.status,
    assignedRole: data.assigned_role,
    description: data.description,
    resolved: data.resolved,
    createdAt: data.created_at,
  }
}

async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('requests')
    .update({ status })
    .eq('id', requestId)

  if (error) {
    throw error
  }
}

export async function acknowledgeRequest(requestId: string): Promise<void> {
  await updateRequestStatus(requestId, 'acknowledged')
}

export async function startWorkRequest(requestId: string): Promise<void> {
  await updateRequestStatus(requestId, 'in_progress')
}

export async function resolveRequest(requestId: string): Promise<void> {
  await updateRequestStatus(requestId, 'resolved')
}
