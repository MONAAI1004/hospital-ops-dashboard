import { useEffect, useState } from 'react'
import BedGrid from '../components/dashboard/BedGrid'
import MetricsBar from '../components/dashboard/MetricsBar'
import RequestPanel from '../components/dashboard/RequestPanel'
import SideBar from '../components/dashboard/SideBar'
import {
  beds as fallbackBeds,
  initialRequests,
  patients as fallbackPatients,
  wards as fallbackWards,
} from '../data/mockHospitalData'
import {
  loadDashboardSnapshot,
  loadSelectedWardId,
  saveDashboardSnapshot,
  saveSelectedWardId,
  type DashboardSnapshot,
} from '../lib/dashboardStorage'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { fetchDashboardData } from '../services/dashboardData'
import { updatePatient } from '../services/patients'
import {
  createRequest,
  escalateRequest,
  resolveRequest,
} from '../services/requests'
import type {
  Bed,
  Patient,
  Request,
  RequestPriority,
  RequestType,
  Ward,
} from '../types/hospital'

function getFallbackSnapshot(): DashboardSnapshot {
  return {
    wards: fallbackWards,
    beds: fallbackBeds,
    patients: fallbackPatients,
    requests: initialRequests,
  }
}

function getInitialSnapshot(): DashboardSnapshot {
  const cached = loadDashboardSnapshot()

  if (
    cached?.wards?.length &&
    cached?.beds?.length &&
    cached?.patients &&
    cached?.requests
  ) {
    return {
      wards: cached.wards,
      beds: cached.beds,
      patients: cached.patients,
      requests: cached.requests,
    }
  }

  return getFallbackSnapshot()
}

function resolveSelectedWardId(wards: Ward[], preferredWardId: string | null) {
  if (preferredWardId && wards.some((ward) => ward.id === preferredWardId)) {
    return preferredWardId
  }

  return wards[0]?.id ?? ''
}

export default function Dashboard() {
  const initialSnapshot = getInitialSnapshot()

  const [wards, setWards] = useState<Ward[]>(initialSnapshot.wards)
  const [beds, setBeds] = useState<Bed[]>(initialSnapshot.beds)
  const [selectedWardId, setSelectedWardId] = useState(() =>
    resolveSelectedWardId(
      initialSnapshot.wards,
      loadSelectedWardId(),
    ),
  )
  const [patients, setPatients] = useState<Patient[]>(initialSnapshot.patients)
  const [requests, setRequests] = useState<Request[]>(initialSnapshot.requests)
  const [usingSupabase, setUsingSupabase] = useState(false)

  useEffect(() => {
    saveSelectedWardId(selectedWardId)
  }, [selectedWardId])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let cancelled = false

    async function loadFromSupabase() {
      try {
        const snapshot = await fetchDashboardData()

        if (cancelled) {
          return
        }

        setWards(snapshot.wards)
        setBeds(snapshot.beds)
        setPatients(snapshot.patients)
        setRequests(snapshot.requests)
        setUsingSupabase(true)
        saveDashboardSnapshot(snapshot)
        setSelectedWardId((currentWardId) =>
          resolveSelectedWardId(snapshot.wards, currentWardId),
        )
      } catch (error) {
        console.error('Failed to load dashboard data from Supabase:', error)

        if (cancelled) {
          return
        }

        const cached = loadDashboardSnapshot()

        if (
          cached?.wards?.length &&
          cached?.beds?.length &&
          cached?.patients &&
          cached?.requests
        ) {
          const cachedWards = cached.wards ?? []
          setWards(cachedWards)
          setBeds(cached.beds ?? [])
          setPatients(cached.patients)
          setRequests(cached.requests)
          setSelectedWardId((currentWardId) =>
            resolveSelectedWardId(cachedWards, currentWardId),
          )
        } else {
          const fallback = getFallbackSnapshot()
          setWards(fallback.wards)
          setBeds(fallback.beds)
          setPatients(fallback.patients)
          setRequests(fallback.requests)
          setSelectedWardId((currentWardId) =>
            resolveSelectedWardId(fallback.wards, currentWardId),
          )
        }

        setUsingSupabase(false)
      }
    }

    void loadFromSupabase()

    return () => {
      cancelled = true
    }
  }, [])

  function persistSnapshot(next: DashboardSnapshot) {
    saveDashboardSnapshot(next)
  }

  async function handlePatientUpdate(
    patientId: string,
    updates: Partial<Patient>,
  ) {
    const nextPatients = patients.map((patient) =>
      patient.id === patientId ? { ...patient, ...updates } : patient,
    )

    setPatients(nextPatients)
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests,
    })

    if (!usingSupabase) {
      return
    }

    try {
      await updatePatient(patientId, updates)
    } catch (error) {
      console.error('Failed to update patient in Supabase:', error)
    }
  }

  async function handleAddRequest({
    patientId,
    roomNumber,
    type,
    priority,
    description,
  }: {
    patientId: string
    roomNumber: number
    type: RequestType
    priority: RequestPriority
    description: string
  }) {
    if (usingSupabase) {
      try {
        const newRequest = await createRequest({
          patientId,
          roomNumber,
          type,
          priority,
          description,
        })

        const nextRequests = [newRequest, ...requests]
        const nextPatients = patients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                activeRequestIds: [
                  newRequest.id,
                  ...patient.activeRequestIds,
                ],
              }
            : patient,
        )

        setRequests(nextRequests)
        setPatients(nextPatients)
        persistSnapshot({
          wards,
          beds,
          patients: nextPatients,
          requests: nextRequests,
        })
        return
      } catch (error) {
        console.error('Failed to create request in Supabase:', error)
      }
    }

    const newRequest: Request = {
      id: `REQ-${Date.now()}`,
      patientId,
      roomNumber,
      type,
      priority,
      description,
      createdAt: new Date().toISOString(),
      resolved: false,
    }

    const nextRequests = [newRequest, ...requests]
    const nextPatients = patients.map((patient) =>
      patient.id === patientId
        ? {
            ...patient,
            activeRequestIds: [newRequest.id, ...patient.activeRequestIds],
          }
        : patient,
    )

    setRequests(nextRequests)
    setPatients(nextPatients)
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests: nextRequests,
    })
  }

  async function handleResolveRequest(requestId: string) {
    const nextRequests = requests.map((request) =>
      request.id === requestId ? { ...request, resolved: true } : request,
    )
    const nextPatients = patients.map((patient) => ({
      ...patient,
      activeRequestIds: patient.activeRequestIds.filter(
        (activeRequestId) => activeRequestId !== requestId,
      ),
    }))

    setRequests(nextRequests)
    setPatients(nextPatients)
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests: nextRequests,
    })

    if (!usingSupabase) {
      return
    }

    try {
      await resolveRequest(requestId)
    } catch (error) {
      console.error('Failed to resolve request in Supabase:', error)
    }
  }

  async function handleEscalateRequest(requestId: string) {
    const currentRequest = requests.find((request) => request.id === requestId)

    if (!currentRequest) {
      return
    }

    let nextPriority: RequestPriority =
      currentRequest.priority === 'low' ? 'normal' : 'urgent'

    if (usingSupabase) {
      try {
        nextPriority = await escalateRequest(requestId, currentRequest.priority)
      } catch (error) {
        console.error('Failed to escalate request in Supabase:', error)
        return
      }
    }

    const nextRequests = requests.map((request) =>
      request.id === requestId
        ? { ...request, priority: nextPriority }
        : request,
    )

    setRequests(nextRequests)
    persistSnapshot({
      wards,
      beds,
      patients,
      requests: nextRequests,
    })
  }

  return (
    <div className="relative h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SideBar />

      <div className="flex h-full min-w-0 flex-col pl-20">
        <MetricsBar
          selectedWardId={selectedWardId}
          wards={wards}
          beds={beds}
          patients={patients}
          requests={requests}
        />

        <div className="flex min-h-0 flex-1">
          <BedGrid
            selectedWardId={selectedWardId}
            wards={wards}
            beds={beds}
            onSelectedWardChange={setSelectedWardId}
            patients={patients}
            requests={requests}
            onPatientUpdate={handlePatientUpdate}
            onAddRequest={handleAddRequest}
          />

          <RequestPanel
            selectedWardId={selectedWardId}
            patients={patients}
            requests={requests}
            onResolveRequest={handleResolveRequest}
            onEscalateRequest={handleEscalateRequest}
          />
        </div>
      </div>
    </div>
  )
}
