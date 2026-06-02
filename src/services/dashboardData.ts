import { fetchBeds } from './beds'
import { fetchPatients } from './patients'
import { fetchRequestRows } from './requests'
import { fetchWards } from './wards'
import type { DashboardSnapshot } from '../lib/dashboardStorage'
import type { Patient, Request } from '../types/hospital'

function mapRequestsFromRows(
  rows: Awaited<ReturnType<typeof fetchRequestRows>>,
  patients: Patient[],
): Request[] {
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]))

  return rows.map((row) => {
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
  })
}

export async function fetchDashboardData(): Promise<DashboardSnapshot> {
  const [wards, beds, requestRows] = await Promise.all([
    fetchWards(),
    fetchBeds(),
    fetchRequestRows(),
  ])

  const provisionalRequests = mapRequestsFromRows(requestRows, [])
  const patients = await fetchPatients(provisionalRequests)
  const requests = mapRequestsFromRows(requestRows, patients)

  const activeRequestIds = new Map<string, string[]>()

  for (const request of requests) {
    if (request.resolved) {
      continue
    }

    const current = activeRequestIds.get(request.patientId) ?? []
    current.push(request.id)
    activeRequestIds.set(request.patientId, current)
  }

  const patientsWithActiveRequests = patients.map((patient) => ({
    ...patient,
    activeRequestIds: activeRequestIds.get(patient.id) ?? [],
  }))

  return {
    wards,
    beds,
    patients: patientsWithActiveRequests,
    requests,
  }
}
