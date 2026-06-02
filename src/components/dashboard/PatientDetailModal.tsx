import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type {
  DischargeState,
  Patient,
  PatientMood,
  PatientStatus,
  Request,
  RequestPriority,
  RequestType,
} from '../../types/hospital'

interface PatientDetailModalProps {
  patient: Patient | null
  requests: Request[]
  onClose: () => void
  onPatientUpdate: (patientId: string, updates: Partial<Patient>) => void
  onAddRequest: (request: {
    patientId: string
    roomNumber: number
    type: RequestType
    priority: RequestPriority
    description: string
  }) => void
}

const dischargeFlow: DischargeState[] = [
  'pending_md',
  'pending_pt',
  'medication_ready',
  'complete',
]

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function getNextDischargeState(current: DischargeState): DischargeState {
  const currentIndex = dischargeFlow.indexOf(current)

  if (currentIndex === -1) return 'pending_md'
  if (currentIndex === dischargeFlow.length - 1) return 'complete'

  return dischargeFlow[currentIndex + 1]
}

export default function PatientDetailModal({
  patient,
  requests,
  onClose,
  onPatientUpdate,
  onAddRequest,
}: PatientDetailModalProps) {
  const [isAddingRequest, setIsAddingRequest] = useState(false)
  const [requestType, setRequestType] = useState<RequestType>('water')
  const [priority, setPriority] = useState<RequestPriority>('normal')
  const [description, setDescription] = useState('')

  if (!patient) return null

  const activePatient = patient
  const currentDischargeIndex = dischargeFlow.indexOf(activePatient.dischargeState)

  function handleClose() {
    setIsAddingRequest(false)
    setRequestType('water')
    setPriority('normal')
    setDescription('')
    onClose()
  }

  const patientRequests = requests.filter(
    (request) => request.patientId === activePatient.id && !request.resolved,
  )

  function handleSubmitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onAddRequest({
      patientId: activePatient.id,
      roomNumber: activePatient.roomNumber,
      type: requestType,
      priority,
      description: description.trim() || formatLabel(requestType),
    })

    setRequestType('water')
    setPriority('normal')
    setDescription('')
    setIsAddingRequest(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4"
      onClick={handleClose}
    >
      <div
        className={`w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl transition-all ${
          isAddingRequest ? 'max-w-5xl' : 'max-w-xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">
              Room {String(patient.roomNumber).padStart(2, '0')} · {patient.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Patient details and operational status
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className={isAddingRequest ? 'grid grid-cols-[1fr_360px]' : ''}>
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Initials</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
                  {patient.initials}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">LOS</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Day {patient.losDays}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-300">Status</p>
                <select
                  value={patient.status}
                  onChange={(event) =>
                    onPatientUpdate(patient.id, {
                      status: event.target.value as PatientStatus,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm capitalize text-slate-900 dark:text-slate-100"
                >
                  <option value="stable">Stable</option>
                  <option value="needs_pain_meds">Needs Pain Meds</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="high_risk">High Risk</option>
                  <option value="resting">Resting</option>
                  <option value="discharge_ready">Discharge Ready</option>
                  <option value="discharge_today">Discharge Today</option>
                  <option value="discharge_delayed">Discharge Delayed</option>
                  <option value="awaiting_pt">Awaiting PT</option>
                  <option value="family_visit">Family Visit</option>
                  <option value="care_plan_review">Care Plan Review</option>
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-300">Mood</p>
                <select
                  value={patient.mood}
                  onChange={(event) =>
                    onPatientUpdate(patient.id, {
                      mood: event.target.value as PatientMood,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm capitalize text-slate-900 dark:text-slate-100"
                >
                  <option value="calm">Calm</option>
                  <option value="waiting">Waiting</option>
                  <option value="frustrated">Frustrated</option>
                  <option value="sleeping">Sleeping</option>
                  <option value="anxious">Anxious</option>
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                  Satisfaction
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {patient.satisfactionScore}%
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-300">
                  Discharge State
                </p>
                <select
                  value={patient.dischargeState}
                  onChange={(event) =>
                    onPatientUpdate(patient.id, {
                      dischargeState: event.target.value as DischargeState,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm capitalize text-slate-900 dark:text-slate-100"
                >
                  <option value="not_started">Not Started</option>
                  <option value="pending_md">Pending MD</option>
                  <option value="pending_pt">Pending PT</option>
                  <option value="pending_case_manager">
                    Pending Case Manager
                  </option>
                  <option value="pending_family_pickup">
                    Pending Family Pickup
                  </option>
                  <option value="medication_ready">Medication Ready</option>
                  <option value="transport_delayed">Transport Delayed</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Discharge Workflow
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Track progress toward discharge completion.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onPatientUpdate(patient.id, {
                      dischargeState: getNextDischargeState(
                        patient.dischargeState,
                      ),
                    })
                  }
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Move Next
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {dischargeFlow.map((step, index) => {
                  const isComplete =
                    currentDischargeIndex !== -1 && index < currentDischargeIndex
                  const isCurrent = index === currentDischargeIndex

                  return (
                    <div
                      key={step}
                      className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold capitalize ${
                        isCurrent
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : isComplete
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300'
                      }`}
                    >
                      <div className="mb-1 flex justify-center">
                        {isComplete ? (
                          <Check className="size-3.5" />
                        ) : (
                          <span className="size-3.5 rounded-full border border-current" />
                        )}
                      </div>
                      {formatLabel(step)}
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Active Requests
                </h3>

                <button
                  type="button"
                  onClick={() => setIsAddingRequest(true)}
                  className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  <Plus className="size-3.5" />
                  Add Request
                </button>
              </div>

              {patientRequests.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500 dark:text-slate-300">
                  No active requests.
                </div>
              ) : (
                <div className="space-y-2">
                  {patientRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {request.description}
                        </p>

                        <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold uppercase text-red-700">
                          {request.priority}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                        Request ID: {request.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {isAddingRequest && (
            <aside className="border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Add Request
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Room {String(patient.roomNumber).padStart(2, '0')} ·{' '}
                    {patient.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingRequest(false)}
                  className="rounded-lg p-1.5 text-slate-400 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-700"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Request Type
                  </label>
                  <select
                    value={requestType}
                    onChange={(event) =>
                      setRequestType(event.target.value as RequestType)
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="pain_medication">Pain Medication</option>
                    <option value="water">Water</option>
                    <option value="interpreter">Interpreter Needed</option>
                    <option value="family_update">Family Update</option>
                    <option value="bathroom_assistance">
                      Bathroom Assistance
                    </option>
                    <option value="discharge_paperwork">
                      Discharge Paperwork
                    </option>
                    <option value="extra_blanket">Extra Blanket</option>
                    <option value="tv_not_working">TV Not Working</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as RequestPriority)
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder="Describe the patient request..."
                    className="w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-300"
                  />
                </div>

                <div className="rounded-lg border border-violet-100 bg-white dark:bg-slate-900 p-3 text-xs text-slate-500 dark:text-slate-300">
                  This request will be assigned to Room{' '}
                  {String(patient.roomNumber).padStart(2, '0')} automatically.
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  Submit Request
                </button>
              </form>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}