import {
  AlertTriangle,
  Bath,
  Bell,
  Clock,
  Droplets,
  FileText,
  Languages,
  MessageCircle,
  MonitorOff,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type {
  DischargeTask,
  Patient,
  Request,
  RequestPriority,
  RequestType,
} from '../../types/hospital'
import { isActiveRequest } from '../../types/hospital'
import { formatRelativeTime } from '../../utils/dashboardMetrics'
import {
  getDischargeProgressSummary,
  getDischargeTasksForPatient,
} from '../../utils/dischargeWorkflow'
import {
  requestStatusLabels,
  requestStatusStyles,
} from '../../utils/requestWorkflow'

const requestIcons: Record<RequestType, typeof Bell> = {
  pain_medication: Bell,
  water: Droplets,
  interpreter: Languages,
  family_update: MessageCircle,
  bathroom_assistance: Bath,
  discharge_paperwork: FileText,
  extra_blanket: Sparkles,
  tv_not_working: MonitorOff,
}

const requestTypeLabels: Record<RequestType, string> = {
  pain_medication: 'Pain medication',
  water: 'Water request',
  interpreter: 'Interpreter needed',
  family_update: 'Family update',
  bathroom_assistance: 'Bathroom assistance',
  discharge_paperwork: 'Discharge paperwork',
  extra_blanket: 'Extra blanket',
  tv_not_working: 'TV not working',
}

const priorityStyles: Record<RequestPriority, string> = {
  urgent: 'border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300',
  normal: 'border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
  low: 'border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
}

const priorityDotStyles: Record<RequestPriority, string> = {
  urgent: 'bg-red-500 shadow-red-200 dark:shadow-red-800',
  normal: 'bg-orange-500 shadow-orange-200 dark:shadow-orange-800',
  low: 'bg-cyan-500 shadow-cyan-200 dark:shadow-cyan-800',
}

const priorityIconStyles: Record<RequestPriority, string> = {
  urgent: 'bg-red-50 text-red-600 dark:text-red-400',
  normal: 'bg-orange-50 text-orange-600 dark:text-orange-400',
  low: 'bg-cyan-50 text-cyan-600 dark:text-cyan-400',
}

const dischargeStateLabels: Record<string, string> = {
  not_started: 'Not started',
  pending_md: 'Pending MD',
  pending_pt: 'Pending PT',
  pending_case_manager: 'Pending case manager',
  pending_family_pickup: 'Pending family pickup',
  medication_ready: 'Medication ready',
  transport_delayed: 'Transport delayed',
  complete: 'Complete',
}

interface RequestPanelProps {
  selectedWardId: string
  patients: Patient[]
  requests: Request[]
  dischargeTasks: DischargeTask[]
  onAcknowledgeRequest: (requestId: string) => void
  onStartWorkRequest: (requestId: string) => void
  onResolveRequest: (requestId: string) => void
}

export default function RequestPanel({
  selectedWardId,
  patients,
  requests,
  dischargeTasks,
  onAcknowledgeRequest,
  onStartWorkRequest,
  onResolveRequest,
}: RequestPanelProps) {
  const floorPatients = patients.filter(
    (patient) => patient.wardId === selectedWardId,
  )

  const floorPatientIds = new Set(
    floorPatients.map((patient) => patient.id),
  )

  const patientById = new Map(
    floorPatients.map((patient) => [patient.id, patient]),
  )

  const openRequests = requests
    .filter(
      (request) =>
        isActiveRequest(request) && floorPatientIds.has(request.patientId),
    )
    .sort((a, b) => {
      const priorityWeight: Record<RequestPriority, number> = {
        urgent: 0,
        normal: 1,
        low: 2,
      }

      const priorityDiff =
        priorityWeight[a.priority] - priorityWeight[b.priority]

      if (priorityDiff !== 0) return priorityDiff

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const urgentCount = openRequests.filter(
    (request) => request.priority === 'urgent',
  ).length

  const dischargePatients = floorPatients
    .filter((patient) => {
      const tasks = getDischargeTasksForPatient(dischargeTasks, patient.id)

      return (
        patient.dischargeState !== 'not_started' ||
        tasks.length > 0
      )
    })
    .sort((a, b) => {
      const aTasks = getDischargeTasksForPatient(dischargeTasks, a.id)
      const bTasks = getDischargeTasksForPatient(dischargeTasks, b.id)
      const aSummary = getDischargeProgressSummary(aTasks)
      const bSummary = getDischargeProgressSummary(bTasks)

      if (aSummary.blockedCount !== bSummary.blockedCount) {
        return bSummary.blockedCount - aSummary.blockedCount
      }

      const priorityOrder: Record<string, number> = {
        transport_delayed: 0,
        pending_md: 1,
        pending_pt: 2,
        pending_case_manager: 3,
        pending_family_pickup: 4,
        medication_ready: 5,
        complete: 6,
      }

      return (
        (priorityOrder[a.dischargeState] ?? 99) -
        (priorityOrder[b.dischargeState] ?? 99)
      )
    })
    .slice(0, 5)

  const delayedDischarges = dischargePatients.filter(
    (patient) => patient.dischargeState === 'transport_delayed',
  ).length

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Requests for selected ward
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Patient needs requiring staff attention
            </p>
          </div>

          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <span className="rounded-full bg-red-50 dark:bg-red-900/10 px-2 py-1 text-[10px] font-bold text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800">
                {urgentCount} urgent
              </span>
            )}

            <span className="flex size-7 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/10 text-xs font-bold text-orange-700 ring-1 ring-orange-200 dark:ring-orange-800">
              {openRequests.length}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800 p-4">
        <section className="space-y-3">
          {openRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-300">
              No active requests for this floor.
            </div>
          ) : (
            openRequests.map((request) => {
              const patient = patientById.get(request.patientId)
              const Icon = requestIcons[request.type]
              const isEscalated =
                request.priority === 'urgent' ||
                Date.now() - new Date(request.createdAt).getTime() > 30 * 60_000

              return (
                <article
                  key={request.id}
                  className={`rounded-xl border p-4 shadow-sm transition-all ${
                    isEscalated
                      ? 'border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-9 items-center justify-center rounded-xl ${
                          priorityIconStyles[request.priority]
                        }`}
                      >
                        <Icon className="size-4" strokeWidth={2} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full shadow-sm ${
                              priorityDotStyles[request.priority]
                            }`}
                          />
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Room {String(request.roomNumber).padStart(2, '0')}
                          </p>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-300">
                          {patient?.name ?? 'Unknown patient'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        priorityStyles[request.priority]
                      }`}
                    >
                      {request.priority}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {request.description || requestTypeLabels[request.type]}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        requestStatusStyles[request.status]
                      }`}
                    >
                      {requestStatusLabels[request.status]}
                    </span>

                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {request.assignedRole}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                      <Clock className="size-3" />
                      {formatRelativeTime(request.createdAt)}
                    </span>

                    <div className="flex gap-1">
                      {request.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeRequest(request.id)}
                          className="rounded-md bg-violet-50 dark:bg-violet-900/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 ring-1 ring-violet-100 dark:ring-violet-900 transition-colors hover:bg-violet-100 dark:hover:bg-violet-900/20"
                        >
                          Acknowledge
                        </button>
                      )}

                      {request.status === 'acknowledged' && (
                        <button
                          type="button"
                          onClick={() => onStartWorkRequest(request.id)}
                          className="rounded-md bg-blue-50 dark:bg-blue-900/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-900 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/20"
                        >
                          Start Work
                        </button>
                      )}

                      {request.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => onResolveRequest(request.id)}
                          className="rounded-md bg-green-50 dark:bg-green-900/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-green-100 dark:ring-green-900 transition-colors hover:bg-green-100 dark:hover:bg-green-900/20"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>

      <section className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Discharge Tracker
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Patients with active discharge steps
              </p>
            </div>

            <span className="flex size-7 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700 ring-1 ring-green-200 dark:ring-green-800">
              {dischargePatients.length}
            </span>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto p-3">
            {dischargePatients.length === 0 ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-300">
                No active discharge steps for this floor.
              </div>
            ) : (
              dischargePatients.map((patient) => {
                const patientTasks = getDischargeTasksForPatient(
                  dischargeTasks,
                  patient.id,
                )
                const progress = getDischargeProgressSummary(patientTasks)
                const isDelayed =
                  patient.dischargeState === 'transport_delayed' ||
                  progress.blockedCount > 0
                const isComplete = patient.dischargeState === 'complete'
                const progressLabel =
                  patientTasks.length > 0
                    ? progress.summaryLabel
                    : dischargeStateLabels[patient.dischargeState]

                return (
                  <div
                    key={patient.id}
                    className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 ${
                      isDelayed
                        ? 'border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30'
                        : isComplete
                          ? 'border-green-200 dark:border-green-900/60 bg-green-50/60 dark:bg-green-950/30'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Room {String(patient.roomNumber).padStart(2, '0')} ·{' '}
                          {patient.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-300">
                          {progressLabel}
                        </p>
                      </div>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium text-slate-900 dark:text-slate-100 ${
                          isDelayed
                            ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
                            : isComplete
                              ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300'
                              : 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        LOS {patient.losDays}d
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      {(urgentCount > 0 || delayedDischarges > 0) && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-start gap-2 rounded-lg border border-orange-200 dark:border-orange-900/60 bg-orange-50/60 dark:bg-orange-950/30 p-3 shadow-sm">
            {delayedDischarges > 0 ? (
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-orange-600 dark:text-orange-400"
                strokeWidth={2}
              />
            ) : (
              <ShieldAlert
                className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
                strokeWidth={2}
              />
            )}

            <div>
              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                Operational Alert
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {delayedDischarges > 0
                  ? `${delayedDischarges} discharge delay needs follow-up.`
                  : `${urgentCount} urgent patient request${
                      urgentCount === 1 ? '' : 's'
                    } pending.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
