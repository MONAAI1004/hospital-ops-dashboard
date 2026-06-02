import type { Bed, DischargeTask, Patient, Request, Ward } from '../types/hospital'

const STORAGE_KEYS = {
  wards: 'hospital:wards',
  beds: 'hospital:beds',
  patients: 'patients',
  requests: 'requests',
  dischargeTasks: 'hospital:dischargeTasks',
  selectedWardId: 'selectedWardId',
} as const

export interface DashboardSnapshot {
  wards: Ward[]
  beds: Bed[]
  patients: Patient[]
  requests: Request[]
  dischargeTasks: DischargeTask[]
}

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadSelectedWardId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.selectedWardId)
}

export function saveSelectedWardId(wardId: string) {
  localStorage.setItem(STORAGE_KEYS.selectedWardId, wardId)
}

export function loadDashboardSnapshot(): Partial<DashboardSnapshot> | null {
  const wards = readJson<Ward[]>(STORAGE_KEYS.wards)
  const beds = readJson<Bed[]>(STORAGE_KEYS.beds)
  const patients = readJson<Patient[]>(STORAGE_KEYS.patients)
  const requests = readJson<Request[]>(STORAGE_KEYS.requests)
  const dischargeTasks = readJson<DischargeTask[]>(STORAGE_KEYS.dischargeTasks)

  if (!wards && !beds && !patients && !requests && !dischargeTasks) {
    return null
  }

  return {
    wards: wards ?? [],
    beds: beds ?? [],
    patients: patients ?? [],
    requests: requests ?? [],
    dischargeTasks: dischargeTasks ?? [],
  }
}

export function saveDashboardSnapshot(snapshot: DashboardSnapshot) {
  localStorage.setItem(STORAGE_KEYS.wards, JSON.stringify(snapshot.wards))
  localStorage.setItem(STORAGE_KEYS.beds, JSON.stringify(snapshot.beds))
  localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(snapshot.patients))
  localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(snapshot.requests))
  localStorage.setItem(
    STORAGE_KEYS.dischargeTasks,
    JSON.stringify(snapshot.dischargeTasks),
  )
}

export function clearDashboardStorage() {
  localStorage.removeItem(STORAGE_KEYS.wards)
  localStorage.removeItem(STORAGE_KEYS.beds)
  localStorage.removeItem(STORAGE_KEYS.patients)
  localStorage.removeItem(STORAGE_KEYS.requests)
  localStorage.removeItem(STORAGE_KEYS.dischargeTasks)
  localStorage.removeItem(STORAGE_KEYS.selectedWardId)
}
