import { getSupabaseClient } from '../lib/supabaseClient'
import type { Bed, BedStatus } from '../types/hospital'

type BedPatientRow = {
  id: string
}

type BedRow = {
  id: string
  ward_id: string
  room_number: number
  label: string
  status: BedStatus
  patients: BedPatientRow[] | BedPatientRow | null
}

function getPatientIdFromRow(
  patients: BedPatientRow[] | BedPatientRow | null,
): string | null {
  if (!patients) {
    return null
  }

  if (Array.isArray(patients)) {
    return patients[0]?.id ?? null
  }

  return patients.id
}

function mapBed(row: BedRow): Bed {
  return {
    id: row.id,
    wardId: row.ward_id,
    roomNumber: row.room_number,
    label: row.label,
    status: row.status,
    patientId: getPatientIdFromRow(row.patients),
  }
}

export async function fetchBeds(): Promise<Bed[]> {
  const { data, error } = await getSupabaseClient()
    .from('beds')
    .select('id, ward_id, room_number, label, status, patients(id)')
    .order('ward_id')
    .order('room_number')

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapBed(row as BedRow))
}
