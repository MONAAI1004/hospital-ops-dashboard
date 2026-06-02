import { getSupabaseClient } from '../lib/supabaseClient'
import type {
  Patient,
  Request,
  RequestPriority,
  RequestType,
} from '../types/hospital'

type RequestRow = {
  id: string
  patient_id: string
  type: RequestType
  priority: RequestPriority
  description: string
  resolved: boolean
  created_at: string
}

function mapRequestRow(row: RequestRow, patientsById: Map<string, Patient>): Request {
  const patient = patientsById.get(row.patient_id)

  return {
    id: row.id,
    patientId: row.patient_id,
    roomNumber: patient?.roomNumber ?? 0,
    type: row.type,
    priority: row.priority,
    description: row.description,
    resolved: row.resolved,
    createdAt: row.created_at,
  }
}

export async function fetchRequests(patients: Patient[]): Promise<Request[]> {
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]))

  const { data, error } = await getSupabaseClient()
    .from('requests')
    .select('id, patient_id, type, priority, description, resolved, created_at')
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
    .select('id, patient_id, type, priority, description, resolved, created_at')
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
      resolved: false,
    })
    .select('id, patient_id, type, priority, description, resolved, created_at')
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
    description: data.description,
    resolved: data.resolved,
    createdAt: data.created_at,
  }
}

export async function resolveRequest(requestId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('requests')
    .update({ resolved: true })
    .eq('id', requestId)

  if (error) {
    throw error
  }
}

export async function escalateRequest(
  requestId: string,
  currentPriority: RequestPriority,
): Promise<RequestPriority> {
  const nextPriority: RequestPriority =
    currentPriority === 'low' ? 'normal' : 'urgent'

  const { error } = await getSupabaseClient()
    .from('requests')
    .update({ priority: nextPriority })
    .eq('id', requestId)

  if (error) {
    throw error
  }

  return nextPriority
}
