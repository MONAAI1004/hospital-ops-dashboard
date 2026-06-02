import { getSupabaseClient } from '../lib/supabaseClient'
import type {
  DischargeState,
  Patient,
  PatientMood,
  PatientStatus,
  Request,
} from '../types/hospital'

type PatientBedRow = {
  ward_id: string
  room_number: number
}

type PatientRow = {
  id: string
  bed_id: string
  name: string
  initials: string
  age_group: 'young' | 'adult' | 'elderly'
  gender: 'male' | 'female'
  los_days: number
  status: PatientStatus
  mood: PatientMood
  satisfaction_score: number
  discharge_state: DischargeState
  beds: PatientBedRow | PatientBedRow[] | null
}

function getBedFromRow(
  beds: PatientBedRow | PatientBedRow[] | null,
): PatientBedRow | null {
  if (!beds) {
    return null
  }

  if (Array.isArray(beds)) {
    return beds[0] ?? null
  }

  return beds
}

function buildActiveRequestIds(requests: Request[]): Map<string, string[]> {
  const activeRequestIds = new Map<string, string[]>()

  for (const request of requests) {
    if (request.resolved) {
      continue
    }

    const current = activeRequestIds.get(request.patientId) ?? []
    current.push(request.id)
    activeRequestIds.set(request.patientId, current)
  }

  return activeRequestIds
}

export function mapPatientRow(
  row: PatientRow,
  activeRequestIds: Map<string, string[]>,
): Patient {
  const bed = getBedFromRow(row.beds)

  if (!bed) {
    throw new Error(`Patient ${row.id} is missing bed assignment.`)
  }

  return {
    id: row.id,
    wardId: bed.ward_id,
    roomNumber: bed.room_number,
    name: row.name,
    initials: row.initials,
    ageGroup: row.age_group,
    gender: row.gender,
    losDays: row.los_days,
    status: row.status,
    mood: row.mood,
    satisfactionScore: row.satisfaction_score,
    dischargeState: row.discharge_state,
    activeRequestIds: activeRequestIds.get(row.id) ?? [],
  }
}

export async function fetchPatients(requests: Request[]): Promise<Patient[]> {
  const { data, error } = await getSupabaseClient()
    .from('patients')
    .select(
      `
      id,
      bed_id,
      name,
      initials,
      age_group,
      gender,
      los_days,
      status,
      mood,
      satisfaction_score,
      discharge_state,
      beds (
        ward_id,
        room_number
      )
    `,
    )
    .order('name')

  if (error) {
    throw error
  }

  const activeRequestIds = buildActiveRequestIds(requests)

  return (data ?? []).map((row) =>
    mapPatientRow(row as PatientRow, activeRequestIds),
  )
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Patient>,
): Promise<void> {
  const payload: Record<string, unknown> = {}

  if (updates.name !== undefined) payload.name = updates.name
  if (updates.initials !== undefined) payload.initials = updates.initials
  if (updates.ageGroup !== undefined) payload.age_group = updates.ageGroup
  if (updates.gender !== undefined) payload.gender = updates.gender
  if (updates.losDays !== undefined) payload.los_days = updates.losDays
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.mood !== undefined) payload.mood = updates.mood
  if (updates.satisfactionScore !== undefined) {
    payload.satisfaction_score = updates.satisfactionScore
  }
  if (updates.dischargeState !== undefined) {
    payload.discharge_state = updates.dischargeState
  }

  if (Object.keys(payload).length === 0) {
    return
  }

  const { error } = await getSupabaseClient()
    .from('patients')
    .update(payload)
    .eq('id', patientId)

  if (error) {
    throw error
  }
}
