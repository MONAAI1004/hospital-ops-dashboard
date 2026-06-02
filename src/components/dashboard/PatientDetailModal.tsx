import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type {
  DischargeTask,
  DischargeTaskStatus,
  Patient,
  PatientMood,
  PatientStatus,
  Request,
  RequestPriority,
  RequestType,
} from '../../types/hospital'
import { isActiveRequest } from '../../types/hospital'
import {
  dischargeStateLabels,
  dischargeStateStyles,
  dischargeTaskStatusLabels,
  dischargeTaskStatusStyles,
  getDischargeProgressSummary,
  getDischargeTasksForPatient,
} from '../../utils/dischargeWorkflow'

interface PatientDetailModalProps {
  patient: Patient | null
  requests: Request[]
  dischargeTasks: DischargeTask[]
  onClose: () => void
  onPatientUpdate: (patientId: string, updates: Partial<Patient>) => void
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
  onDischargePatient: (patientId: string) => void
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}

export default function PatientDetailModal({
  patient,
  requests,
  dischargeTasks,
  onClose,
  onPatientUpdate,
  onAddRequest,
  onDischargeTaskUpdate,
  onStartDischargeWorkflow,
  onDischargePatient,
}: PatientDetailModalProps) {
  const [isAddingRequest, setIsAddingRequest] = useState(false)
  const [requestType, setRequestType] = useState<RequestType>('water')
  const [priority, setPriority] = useState<RequestPriority>('normal')
  const [description, setDescription] = useState('')

  if (!patient) return null

  const activePatient = patient
  const patientDischargeTasks = getDischargeTasksForPatient(
    dischargeTasks,
    activePatient.id,
  )
  const dischargeProgress = getDischargeProgressSummary(patientDischargeTasks)
  const workflowStarted = patientDischargeTasks.length > 0
  const showStartDischarge = !workflowStarted

  function handleClose() {
    setIsAddingRequest(false)
    setRequestType('water')
    setPriority('normal')
    setDescription('')
    onClose()
  }

  const patientRequests = requests.filter(
    (request) =>
      request.patientId === activePatient.id && isActiveRequest(request),
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
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl transition-all ${
          isAddingRequest ? 'max-w-5xl' : workflowStarted ? 'max-w-2xl' : 'max-w-xl'
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

        <div
          className={`min-h-0 flex-1 overflow-y-auto ${
            isAddingRequest ? 'grid grid-cols-[1fr_360px]' : ''
          }`}
        >
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

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 col-span-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
                  Satisfaction
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {patient.satisfactionScore}%
                </p>
              </div>
            </div>

            {showStartDischarge ? (
              <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Discharge Workflow
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      Start the discharge checklist to coordinate clearance,
                      medication, and transport tasks.
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      dischargeStateStyles.not_started
                    }`}
                  >
                    {dischargeStateLabels.not_started}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onStartDischargeWorkflow(activePatient.id)}
                  className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  Start Discharge Workflow
                </button>
              </section>
            ) : workflowStarted ? (
              <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Discharge Checklist
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {dischargeProgress.summaryLabel}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      dischargeStateStyles[activePatient.dischargeState]
                    }`}
                  >
                    {dischargeStateLabels[activePatient.dischargeState]}
                  </span>
                </div>

                <div className="space-y-2">
                  {patientDischargeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {task.label}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                dischargeTaskStatusStyles[task.status]
                              }`}
                            >
                              {dischargeTaskStatusLabels[task.status]}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {task.assignedRole}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {task.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onDischargeTaskUpdate(task.id, 'in_progress')
                                }
                                className="rounded-md bg-blue-50 dark:bg-blue-900/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-900 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              >
                                Start
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDischargeTaskUpdate(task.id, 'complete')
                                }
                                className="rounded-md bg-green-50 dark:bg-green-900/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-green-100 dark:ring-green-900 transition-colors hover:bg-green-100 dark:hover:bg-green-900/20"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDischargeTaskUpdate(task.id, 'blocked')
                                }
                                className="rounded-md bg-red-50 dark:bg-red-900/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 ring-1 ring-red-100 dark:ring-red-900 transition-colors hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                Block
                              </button>
                            </>
                          )}

                          {task.status === 'in_progress' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onDischargeTaskUpdate(task.id, 'complete')
                                }
                                className="rounded-md bg-green-50 dark:bg-green-900/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-green-100 dark:ring-green-900 transition-colors hover:bg-green-100 dark:hover:bg-green-900/20"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDischargeTaskUpdate(task.id, 'blocked')
                                }
                                className="rounded-md bg-red-50 dark:bg-red-900/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 ring-1 ring-red-100 dark:ring-red-900 transition-colors hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                Block
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDischargeTaskUpdate(task.id, 'pending')
                                }
                                className="rounded-md bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                Back to Pending
                              </button>
                            </>
                          )}

                          {task.status === 'complete' && (
                            <button
                              type="button"
                              onClick={() =>
                                onDischargeTaskUpdate(task.id, 'in_progress')
                              }
                              className="rounded-md bg-orange-50 dark:bg-orange-900/10 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 ring-1 ring-orange-100 dark:ring-orange-900 transition-colors hover:bg-orange-100 dark:hover:bg-orange-900/20"
                            >
                              Undo Complete
                            </button>
                          )}

                          {task.status === 'blocked' && (
                            <button
                              type="button"
                              onClick={() =>
                                onDischargeTaskUpdate(task.id, 'in_progress')
                              }
                              className="rounded-md bg-blue-50 dark:bg-blue-900/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-900 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/20"
                            >
                              Resume / Unblock
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {activePatient.dischargeState === 'complete' && (
              <section className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
                  Complete Discharge
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  This will remove the patient from the active bed board.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onDischargePatient(activePatient.id)
                    handleClose()
                  }}
                  className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                >
                  Discharge Patient
                </button>
              </section>
            )}
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