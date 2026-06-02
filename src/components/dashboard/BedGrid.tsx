import { useMemo, useState } from 'react'
import { BedDouble, ChevronDown } from 'lucide-react'
import type {
  Bed,
  DischargeTask,
  DischargeTaskStatus,
  Patient,
  PatientStatus,
  Request,
  RequestPriority,
  RequestType,
  Ward,
} from '../../types/hospital'
import { calculateWardOccupancy } from '../../utils/dashboardMetrics'
import PatientDetailModal from './PatientDetailModal'
import AdmitPatientModal from './AdmitPatientModal'

const patientStatusStyles: Record<PatientStatus, string> = {
  stable: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 ring-green-200 dark:ring-green-800',
  needs_pain_meds: 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-300 ring-orange-200 dark:ring-orange-800',
  needs_attention: 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-300 ring-yellow-200 dark:ring-yellow-800',
  high_risk: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800',
  resting: 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-800',
  discharge_ready: 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800',
  discharge_today: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  discharge_delayed: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800',
  awaiting_pt: 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800',
  family_visit: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 ring-green-200 dark:ring-green-800',
  care_plan_review: 'bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-800',
}

const legendItems: PatientStatus[] = [
  'stable',
  'needs_attention',
  'high_risk',
  'resting',
  'discharge_ready',
  'discharge_delayed',
]

interface BedGridProps {
  selectedWardId: string
  wards: Ward[]
  beds: Bed[]
  onSelectedWardChange: (wardId: string) => void
  patients: Patient[]
  requests: Request[]
  dischargeTasks: DischargeTask[]
  onPatientUpdate: (
    patientId: string,
    updates: Partial<Patient>,
  ) => void

  onAddRequest: (request: {
    patientId: string
    roomNumber: number
    type: RequestType
    priority: RequestPriority
    description: string
  }) => void
  onDischargeTaskUpdate: (
    taskId: string,
    status: DischargeTaskStatus,
  ) => void
  onStartDischargeWorkflow: (patientId: string) => void

  onAdmitPatient: (patient: {
    bedId: string
    name: string
    initials: string
    ageGroup: 'young' | 'adult' | 'elderly'
    gender: 'male' | 'female'
    status: PatientStatus
    mood: 'calm' | 'waiting' | 'frustrated' | 'sleeping' | 'anxious'
  }) => void
  onDischargePatient: (patientId: string) => void
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

export default function BedGrid({
  selectedWardId,
  wards,
  beds,
  onAdmitPatient,
  onSelectedWardChange,
  patients,
  requests,
  dischargeTasks,
  onPatientUpdate,
  onAddRequest,
  onDischargeTaskUpdate,
  onStartDischargeWorkflow,
  onDischargePatient,
}: BedGridProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showAdmitModal, setShowAdmitModal] = useState(false)
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'high_risk' | 'discharge_ready' | 'los_5' | 'open_requests'
  >('all')

  const [searchTerm, setSearchTerm] = useState('')

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  )

  const selectedPatient = selectedPatientId
    ? patientById.get(selectedPatientId) ?? null
    : null

  const selectedWard =
    wards.find((ward) => ward.id === selectedWardId) ?? wards[0]

  const wardBeds = beds.filter((bed) => bed.wardId === selectedWard.id)

  const occupancy = calculateWardOccupancy(selectedWard, beds)

  const visibleBeds = wardBeds.filter((bed) => {
    const patient = bed.patientId ? patientById.get(bed.patientId) : undefined
    const search = searchTerm.trim().toLowerCase()
    const patientRequests = patient
      ? requests.filter((r) => r.patientId === patient.id)
      : []
    const matchesSearch =
      search === '' ||
      bed.label.includes(search) ||
      selectedWard.name.toLowerCase().includes(search) ||
      bed.status.toLowerCase().includes(search) ||
      patient?.name.toLowerCase().includes(search) ||
      patient?.initials.toLowerCase().includes(search) ||
      patient?.status.toLowerCase().includes(search) ||
      patient?.mood.toLowerCase().includes(search) ||
      patient?.dischargeState.toLowerCase().includes(search) ||
      patientRequests.some((r) => r.description.toLowerCase().includes(search))
  
    if (!matchesSearch) return false
  
    if (activeFilter === 'all') return true
    if (!patient) return false
  
    if (activeFilter === 'high_risk') {
      return patient.status === 'high_risk'
    }
  
    if (activeFilter === 'discharge_ready') {
      return (
        patient.status === 'discharge_ready' ||
        patient.status === 'discharge_today' ||
        patient.dischargeState === 'complete' ||
        patient.dischargeState === 'medication_ready'
      )
    }
  
    if (activeFilter === 'los_5') {
      return patient.losDays >= 5
    }
  
    if (activeFilter === 'open_requests') {
      return patient.activeRequestIds.length > 0
    }
  
    return true
  })

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
        <div className="shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bed Grid</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time patient status by floor
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs">
          {legendItems.map((status) => (
            <span
              key={status}
              className="flex shrink-0 items-center gap-1.5 capitalize text-slate-600"
            >
              <span
                className={`size-2.5 rounded-full ring-1 ${
                  patientStatusStyles[status]
                }`}
              />
              {formatStatus(status)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search patient, room, status, mood..."
            className="mb-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />

          <div className="mb-5 flex items-center justify-between">
            <div className="relative">
              <BedDouble
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-600"
                strokeWidth={2}
              />

              <select
                value={selectedWardId}
                onChange={(event) => onSelectedWardChange(event.target.value)}
                className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-10 pr-10 text-lg font-bold text-slate-900 dark:text-slate-100 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-600"
                strokeWidth={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {occupancy.occupied}/{occupancy.total} occupied
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedBedId(null)
                  setShowAdmitModal(true)
                }}
                className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-medium text-white hover:bg-violet-700"
              >
                + Admit Patient
              </button>
            </div>
          
            <select
              value={activeFilter}
              onChange={(event) =>
                setActiveFilter(
                  event.target.value as
                    | 'all'
                    | 'high_risk'
                    | 'discharge_ready'
                    | 'los_5'
                    | 'open_requests',
                )
              }
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">All patients</option>
              <option value="high_risk">High risk only</option>
              <option value="discharge_ready">Discharge ready</option>
              <option value="los_5">LOS 5+ days</option>
              <option value="open_requests">Open requests</option>
            </select>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
            {visibleBeds.map((bed) => {
              const patient = bed.patientId
                ? patientById.get(bed.patientId)
                : undefined

              const cardClasses = `rounded-xl border p-3 text-left shadow-sm transition-all hover:shadow-md ${
                patient
                  ? 'cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-200 hover:ring-2 hover:ring-violet-100'
                  : 'cursor-default border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 opacity-70 dark:opacity-80'
              }`

              return patient ? (
                <button
                  key={bed.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={cardClasses}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {bed.label}
                    </span>

                    <span className="text-[10px] uppercase text-slate-400">
                      occupied
                    </span>
                  </div>

                  <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/10 text-xl font-bold text-violet-600 dark:text-violet-400">
                    {patient.initials}
                  </div>

                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                    {patient.name}
                  </p>

                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
                    LOS: Day {patient.losDays}
                  </p>

                  <div
                    className={`mt-2 rounded-md px-2 py-1 text-center text-[10px] font-medium ring-1 ${
                      patientStatusStyles[patient.status]
                    }`}
                  >
                    {formatStatus(patient.status)}
                  </div>
                </button>
              ) : (
                <button
                  key={bed.id}
                  type="button"
                  onClick={() => {
                    setSelectedBedId(bed.id)
                    setShowAdmitModal(true)
                  }}
                  className={cardClasses}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {bed.label}
                    </span>

                    <span className="text-[10px] uppercase text-slate-400 dark:text-slate-400">
                      {bed.status}
                    </span>
                  </div>

                  <div className="flex h-24 items-center justify-center text-xs text-slate-400">
                    Empty
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <PatientDetailModal
        patient={selectedPatient}
        requests={requests}
        dischargeTasks={dischargeTasks}
        onClose={() => setSelectedPatientId(null)}
        onPatientUpdate={onPatientUpdate}
        onAddRequest={onAddRequest}
        onDischargeTaskUpdate={onDischargeTaskUpdate}
        onStartDischargeWorkflow={onStartDischargeWorkflow} 
        onDischargePatient={onDischargePatient}
      />

      <AdmitPatientModal
        isOpen={showAdmitModal}
        wards={wards}
        beds={beds}
        selectedWardId={selectedWardId}
        preselectedBedId={selectedBedId}
        onClose={() => {
          setShowAdmitModal(false)
          setSelectedBedId(null)
        }}
        onAdmitPatient={(patient) => {
          onAdmitPatient(patient)
          setShowAdmitModal(false)
          setSelectedBedId(null)
        }}
      />
    </main>
  )
}