import { useEffect, useState } from 'react'
import BedGrid from '../components/dashboard/BedGrid'
import MetricsBar from '../components/dashboard/MetricsBar'
import RequestPanel from '../components/dashboard/RequestPanel'
import SideBar from '../components/dashboard/SideBar'
import {
  beds as fallbackBeds,
  initialRequests,
  mockDischargeTasks,
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
import { subscribeToDashboardChanges } from '../services/dashboardRealtime'
import {
  createDefaultDischargeTasksForPatient,
  updateDischargeTaskStatus,
} from '../services/dischargeTasks'
import { createPatient, dischargePatient, updatePatient } from '../services/patients'
import {
  acknowledgeRequest,
  createRequest,
  resolveRequest,
  startWorkRequest,
} from '../services/requests'
import type {
  Bed,
  DischargeTask,
  DischargeTaskStatus,
  Patient,
  PatientStatus,
  Request,
  RequestPriority,
  RequestStatus,
  RequestType,
  Ward,
} from '../types/hospital'
import { getAssignedRoleForRequestType } from '../utils/requestWorkflow'
import {
  buildDefaultDischargeTasks,
  computeDischargeStateFromTasks,
} from '../utils/dischargeWorkflow'
import SettingsPage from './SettingsPage'

function getFallbackSnapshot(): DashboardSnapshot {
  return {
    wards: fallbackWards,
    beds: fallbackBeds,
    patients: fallbackPatients,
    requests: initialRequests,
    dischargeTasks: mockDischargeTasks,
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
      dischargeTasks: cached.dischargeTasks ?? mockDischargeTasks,
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

function applyDashboardSnapshot(
  snapshot: DashboardSnapshot,
  setters: {
    setWards: (wards: Ward[]) => void
    setBeds: (beds: Bed[]) => void
    setPatients: (patients: Patient[]) => void
    setRequests: (requests: Request[]) => void
    setDischargeTasks: (tasks: DischargeTask[]) => void
    setSelectedWardId: (value: string | ((current: string) => string)) => void
  },
  options?: { persist?: boolean },
) {
  setters.setWards(snapshot.wards)
  setters.setBeds(snapshot.beds)
  setters.setPatients(snapshot.patients)
  setters.setRequests(snapshot.requests)
  setters.setDischargeTasks(snapshot.dischargeTasks)
  setters.setSelectedWardId((currentWardId) =>
    resolveSelectedWardId(snapshot.wards, currentWardId),
  )

  if (options?.persist !== false) {
    saveDashboardSnapshot(snapshot)
  }
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
  const [dischargeTasks, setDischargeTasks] = useState<DischargeTask[]>(
    initialSnapshot.dischargeTasks,
  )
  const [usingSupabase, setUsingSupabase] = useState(false)

  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>(
    'dashboard',
  )

  useEffect(() => {
    saveSelectedWardId(selectedWardId)
  }, [selectedWardId])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let cancelled = false
    let unsubscribeRealtime: (() => void) | undefined

    async function loadFromSupabase() {
      try {
        const snapshot = await fetchDashboardData()

        if (cancelled) {
          return
        }

        applyDashboardSnapshot(snapshot, {
          setWards,
          setBeds,
          setPatients,
          setRequests,
          setDischargeTasks,
          setSelectedWardId,
        })
        setUsingSupabase(true)

        unsubscribeRealtime = subscribeToDashboardChanges((nextSnapshot) => {
          if (cancelled) {
            return
          }

          applyDashboardSnapshot(nextSnapshot, {
            setWards,
            setBeds,
            setPatients,
            setRequests,
            setDischargeTasks,
            setSelectedWardId,
          })
        })
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
          setDischargeTasks(cached.dischargeTasks ?? mockDischargeTasks)
          setSelectedWardId((currentWardId) =>
            resolveSelectedWardId(cachedWards, currentWardId),
          )
        } else {
          const fallback = getFallbackSnapshot()
          setWards(fallback.wards)
          setBeds(fallback.beds)
          setPatients(fallback.patients)
          setRequests(fallback.requests)
          setDischargeTasks(fallback.dischargeTasks)
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
      unsubscribeRealtime?.()
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
      dischargeTasks,
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

  async function handleAdmitPatient(patientData: {
    bedId: string
    name: string
    initials: string
    ageGroup: 'young' | 'adult' | 'elderly'
    gender: 'male' | 'female'
    status: PatientStatus
    mood: 'calm' | 'waiting' | 'frustrated' | 'sleeping' | 'anxious'
  }) {
    const selectedBed = beds.find((bed) => bed.id === patientData.bedId)

    if (!selectedBed || selectedBed.status !== 'available' || selectedBed.patientId) {
      console.error('Cannot admit patient: selected bed is not available.')
      return
    }

    if (!usingSupabase) {
      return
    }
  
    try {
      await createPatient(patientData)
    } catch (error) {
      console.error('Failed to admit patient:', error)
    }
  }

  async function handleDischargePatient(patientId: string) {
    const nextPatients = patients.filter((patient) => patient.id !== patientId)
    const nextRequests = requests.filter((request) => request.patientId !== patientId)
    const nextTasks = dischargeTasks.filter((task) => task.patientId !== patientId)
  
    setPatients(nextPatients)
    setRequests(nextRequests)
    setDischargeTasks(nextTasks)
  
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests: nextRequests,
      dischargeTasks: nextTasks,
    })
  
    if (!usingSupabase) return
  
    try {
      await dischargePatient(patientId)
    } catch (error) {
      console.error('Failed to discharge patient:', error)
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
          dischargeTasks,
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
      status: 'open',
      assignedRole: getAssignedRoleForRequestType(type),
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
      dischargeTasks,
    })
  }

  function applyRequestStatusUpdate(
    requestId: string,
    status: RequestStatus,
  ) {
    const nextRequests = requests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            status,
            resolved: status === 'resolved',
          }
        : request,
    )
    const nextPatients =
      status === 'resolved'
        ? patients.map((patient) => ({
            ...patient,
            activeRequestIds: patient.activeRequestIds.filter(
              (activeRequestId) => activeRequestId !== requestId,
            ),
          }))
        : patients

    setRequests(nextRequests)
    setPatients(nextPatients)
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests: nextRequests,
      dischargeTasks,
    })
  }

  function applyDischargeTaskStatusUpdate(
    taskId: string,
    status: DischargeTaskStatus,
  ) {
    const nextTasks = dischargeTasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status,
            completedAt: status === 'complete' ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          }
        : task,
    )

    const updatedTask = nextTasks.find((task) => task.id === taskId)

    if (!updatedTask) {
      return
    }

    const patientTasks = nextTasks.filter(
      (task) => task.patientId === updatedTask.patientId,
    )
    const nextDischargeState = computeDischargeStateFromTasks(
      patientTasks,
      patients.find((patient) => patient.id === updatedTask.patientId)
        ?.dischargeState ?? 'not_started',
    )

    const nextPatients = patients.map((patient) =>
      patient.id === updatedTask.patientId
        ? { ...patient, dischargeState: nextDischargeState }
        : patient,
    )

    setDischargeTasks(nextTasks)
    setPatients(nextPatients)
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests,
      dischargeTasks: nextTasks,
    })
  }

  async function handleStartDischargeWorkflow(patientId: string) {
    const existingTasks = dischargeTasks.filter(
      (task) => task.patientId === patientId,
    )

    if (existingTasks.length > 0) {
      return
    }

    if (usingSupabase) {
      try {
        const createdTasks =
          await createDefaultDischargeTasksForPatient(patientId)
        const nextTasks = [
          ...dischargeTasks.filter((task) => task.patientId !== patientId),
          ...createdTasks,
        ]
        const nextDischargeState = computeDischargeStateFromTasks(
          createdTasks,
          'pending_md',
        )
        const nextPatients = patients.map((patient) =>
          patient.id === patientId
            ? { ...patient, dischargeState: nextDischargeState }
            : patient,
        )

        setDischargeTasks(nextTasks)
        setPatients(nextPatients)
        persistSnapshot({
          wards,
          beds,
          patients: nextPatients,
          requests,
          dischargeTasks: nextTasks,
        })
        return
      } catch (error) {
        console.error('Failed to start discharge workflow in Supabase:', error)
      }
    }

    const createdTasks = buildDefaultDischargeTasks(patientId, 'pending_md')
    const nextTasks = [...dischargeTasks, ...createdTasks]
    const nextPatients = patients.map((patient) =>
      patient.id === patientId
        ? {
            ...patient,
            dischargeState: computeDischargeStateFromTasks(
              createdTasks,
              'pending_md',
            ),
          }
        : patient,
    )

    setDischargeTasks(nextTasks)
    setPatients(nextPatients)
    persistSnapshot({
      wards,
      beds,
      patients: nextPatients,
      requests,
      dischargeTasks: nextTasks,
    })
  }

  async function handleDischargeTaskUpdate(
    taskId: string,
    status: DischargeTaskStatus,
  ) {
    applyDischargeTaskStatusUpdate(taskId, status)

    if (!usingSupabase) {
      return
    }

    try {
      await updateDischargeTaskStatus(taskId, status)
    } catch (error) {
      console.error('Failed to update discharge task in Supabase:', error)
    }
  }

  async function handleAcknowledgeRequest(requestId: string) {
    applyRequestStatusUpdate(requestId, 'acknowledged')

    if (!usingSupabase) {
      return
    }

    try {
      await acknowledgeRequest(requestId)
    } catch (error) {
      console.error('Failed to acknowledge request in Supabase:', error)
    }
  }

  async function handleStartWorkRequest(requestId: string) {
    applyRequestStatusUpdate(requestId, 'in_progress')

    if (!usingSupabase) {
      return
    }

    try {
      await startWorkRequest(requestId)
    } catch (error) {
      console.error('Failed to start request work in Supabase:', error)
    }
  }

  async function handleResolveRequest(requestId: string) {
    applyRequestStatusUpdate(requestId, 'resolved')

    if (!usingSupabase) {
      return
    }

    try {
      await resolveRequest(requestId)
    } catch (error) {
      console.error('Failed to resolve request in Supabase:', error)
    }
  }
  
  return (
    <div className="relative h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SideBar currentView={currentView} onViewChange={setCurrentView} />
      <div className="ml-20 h-full">
      {currentView === 'settings' ? (
        <SettingsPage />
      ) : (
        <>
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
              dischargeTasks={dischargeTasks}
              onPatientUpdate={handlePatientUpdate}
              onAddRequest={handleAddRequest}
              onDischargeTaskUpdate={handleDischargeTaskUpdate}
              onStartDischargeWorkflow={handleStartDischargeWorkflow}
              onAdmitPatient={handleAdmitPatient}
              onDischargePatient={handleDischargePatient}
            />

            <RequestPanel
              selectedWardId={selectedWardId}
              patients={patients}
              requests={requests}
              dischargeTasks={dischargeTasks}
              onAcknowledgeRequest={handleAcknowledgeRequest}
              onStartWorkRequest={handleStartWorkRequest}
              onResolveRequest={handleResolveRequest}
            />
          </div>
        </>
      )}
      </div>
    </div>
  )
}
