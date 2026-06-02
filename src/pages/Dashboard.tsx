import { useEffect, useState } from 'react'
import BedGrid from '../components/dashboard/BedGrid'
import MetricsBar from '../components/dashboard/MetricsBar'
import RequestPanel from '../components/dashboard/RequestPanel'
import SideBar from '../components/dashboard/SideBar'
import {
  initialRequests,
  patients as initialPatients,
} from '../data/mockHospitalData'
import type {
  Patient,
  Request,
  RequestPriority,
  RequestType,
} from '../types/hospital'

export default function Dashboard() {
  const [selectedWardId, setSelectedWardId] = useState(() => {
    return localStorage.getItem('selectedWardId') ?? 'ward-1'
  })
  
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('patients')
    return saved ? JSON.parse(saved) : initialPatients
  })
  
  const [requests, setRequests] = useState<Request[]>(() => {
    const saved = localStorage.getItem('requests')
    return saved ? JSON.parse(saved) : initialRequests
  })

  useEffect(() => {
    localStorage.setItem('selectedWardId', selectedWardId)
  }, [selectedWardId])
  
  useEffect(() => {
    localStorage.setItem('patients', JSON.stringify(patients))
  }, [patients])
  
  useEffect(() => {
    localStorage.setItem('requests', JSON.stringify(requests))
  }, [requests])

  function handlePatientUpdate(
    patientId: string,
    updates: Partial<Patient>,
  ) {
    setPatients((currentPatients) =>
      currentPatients.map((patient) =>
        patient.id === patientId ? { ...patient, ...updates } : patient,
      ),
    )
  }

  function handleAddRequest({
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

    setRequests((currentRequests) => [newRequest, ...currentRequests])

    setPatients((currentPatients) =>
      currentPatients.map((patient) =>
        patient.id === patientId
          ? {
              ...patient,
              activeRequestIds: [
                newRequest.id,
                ...patient.activeRequestIds,
              ],
            }
          : patient,
      ),
    )
  }

  function handleResolveRequest(requestId: string) {
    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              resolved: true,
            }
          : request,
      ),
    )

    setPatients((currentPatients) =>
      currentPatients.map((patient) => ({
        ...patient,
        activeRequestIds: patient.activeRequestIds.filter(
          (activeRequestId) => activeRequestId !== requestId,
        ),
      })),
    )
  }

  function handleEscalateRequest(requestId: string) {
    setRequests((currentRequests) =>
      currentRequests.map((request) => {
        if (request.id !== requestId) return request

        const nextPriority: RequestPriority =
          request.priority === 'low' ? 'normal' : 'urgent'

        return {
          ...request,
          priority: nextPriority,
        }
      }),
    )
  }

  return (
    <div className="relative h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SideBar />

      <div className="flex h-full min-w-0 flex-col pl-20">
        <MetricsBar
          selectedWardId={selectedWardId}
          patients={patients}
          requests={requests}
        />

        <div className="flex min-h-0 flex-1">
          <BedGrid
            selectedWardId={selectedWardId}
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