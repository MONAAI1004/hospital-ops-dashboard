import { fetchDischargeTasks } from './dischargeTasks'
import { fetchBeds } from './beds'
import { fetchPatients } from './patients'
import { fetchRequestRows } from './requests'
import { fetchWards } from './wards'
import type { DashboardSnapshot } from '../lib/dashboardStorage'
import type { Patient, Request } from '../types/hospital'
import { isActiveRequest } from '../types/hospital'
import { mapRequestRow } from './requests'

function mapRequestsFromRows(
  rows: Awaited<ReturnType<typeof fetchRequestRows>>,
  patients: Patient[],
): Request[] {
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]))

  return rows.map((row) => mapRequestRow(row, patientsById))
}

export async function fetchDashboardData(): Promise<DashboardSnapshot> {
  const [wards, beds, requestRows, dischargeTasks] = await Promise.all([
    fetchWards(),
    fetchBeds(),
    fetchRequestRows(),
    fetchDischargeTasks(),
  ])

  const provisionalRequests = mapRequestsFromRows(requestRows, [])
  const patients = await fetchPatients(provisionalRequests)
  const requests = mapRequestsFromRows(requestRows, patients)

  const activeRequestIds = new Map<string, string[]>()

  for (const request of requests) {
    if (!isActiveRequest(request)) {
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
    dischargeTasks,
  }
}
