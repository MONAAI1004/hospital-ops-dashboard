import {
  Activity,
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock,
  HeartPulse,
  MessageCircle,
  Smile,
  Users,
} from 'lucide-react'
import type { Bed, Patient, Request, Ward } from '../../types/hospital'
import { isActiveRequest } from '../../types/hospital'
import {
  calculateAvailableBeds,
  calculateAverageWaitTime,
  calculateBedOccupancy,
} from '../../utils/dashboardMetrics'
import { useEffect, useState } from 'react'
import { fetchCurrentProfile, type Profile } from '../../services/profiles'

interface MetricsBarProps {
  selectedWardId: string
  wards: Ward[]
  beds: Bed[]
  patients: Patient[]
  requests: Request[]
}

export default function MetricsBar({
  selectedWardId,
  wards,
  beds,
  patients,
  requests,
}: MetricsBarProps) {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    fetchCurrentProfile()
      .then(setProfile)
      .catch(console.error)
  }, [])
  const firstName = profile?.displayName?.split(' ')[0] ?? 'User'
  const currentWard =
    wards.find((ward) => ward.id === selectedWardId) ?? wards[0]

  const floorBeds = beds.filter((bed) => bed.wardId === selectedWardId)

  const floorPatients = patients.filter(
    (patient) => patient.wardId === selectedWardId,
  )

  const floorPatientIds = new Set(
    floorPatients.map((patient) => patient.id),
  )

  const floorRequests = requests.filter(
    (request) =>
      floorPatientIds.has(request.patientId) && isActiveRequest(request),
  )

  const occupancy = calculateBedOccupancy(floorBeds)
  const available = calculateAvailableBeds(floorBeds, wards)
  const averageWaitMinutes = calculateAverageWaitTime(floorRequests)

  const openRequests = floorRequests

  const dischargeToday = floorPatients.filter(
    (patient) =>
      patient.dischargeState === 'complete' ||
      patient.dischargeState === 'medication_ready',
  ).length

  const averageLos =
    floorPatients.length === 0
      ? '0.0'
      : (
          floorPatients.reduce((sum, patient) => sum + patient.losDays, 0) /
          floorPatients.length
        ).toFixed(1)

  const dischargeReady = floorPatients.filter(
    (patient) =>
      patient.status === 'discharge_ready' ||
      patient.status === 'discharge_today',
  ).length

  const potentialDelays = floorPatients.filter(
    (patient) =>
      patient.dischargeState === 'transport_delayed' ||
      patient.status === 'discharge_delayed' ||
      patient.losDays >= 7,
  ).length

  const topMetrics = [
    {
      label: 'Hospital Mood',
      value: 'Good',
      sub: 'calc mood...',
      icon: Smile,
      accent: 'text-violet-600',
    },
    {
      label: 'Avg. Response Time',
      value: `${averageWaitMinutes} min`,
      sub: '(calc change)',
      icon: Clock,
      accent: 'text-blue-600',
    },
  ]

  const mainMetrics = [
    {
      label: 'Bed Occupancy',
      value: `${occupancy.percentage}%`,
      sub: `${occupancy.occupied} / ${occupancy.total} beds`,
      icon: BedDouble,
      accent: 'text-violet-600',
    },
    {
      label: 'Available Beds',
      value: String(available.total),
      sub: available.total === 0 ? 'No beds available' : 'Ready for patients',
      icon: Activity,
      accent: 'text-emerald-600',
    },
    {
      label: 'Pending Requests',
      value: String(openRequests.length),
      sub: `${
        openRequests.filter((request) => request.priority === 'urgent').length
      } urgent`,
      icon: MessageCircle,
      accent: 'text-orange-600',
    },
    {
      label: 'Discharges Today',
      value: String(dischargeToday),
      sub: 'Active discharge flow',
      icon: CheckCircle2,
      accent: 'text-green-600',
    },
    {
      label: 'Avg. Length of Stay',
      value: `${averageLos} days`,
      sub: 'Current floor average',
      icon: HeartPulse,
      accent: 'text-blue-600',
    },
    {
      label: 'Discharge Ready',
      value: String(dischargeReady),
      sub: 'Ready or near ready',
      icon: Users,
      accent: 'text-teal-600',
    },
    {
      label: 'Potential Delays',
      value: String(potentialDelays),
      sub: 'Needs attention',
      icon: AlertTriangle,
      accent: 'text-red-600',
    },
  ]

  return (
    <header className="shrink-0 border-b border-slate-200 bg-slate-50 dark:bg-slate-950 px-5 py-4">
      <div className="mb-4 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
            Good morning, {firstName ?? 'User'}! ☀️
          </h1>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            Here&apos;s what&apos;s happening on {currentWard.name} today.
          </p>
        </div>

        <div className="flex shrink-0 gap-3 overflow-x-auto">
          {topMetrics.map((metric) => (
            <div
              key={metric.label}
              className="w-40 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/15">
                  <metric.icon className={`size-5 ${metric.accent}`} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                  <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {metric.value}
                  </p>
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {metric.sub}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {mainMetrics.map((metric) => (
          <div
            key={metric.label}
            className="w-36 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:w-40 xl:w-44 dark:border-slate-700 dark:bg-slate-900"
          >  
            <div className="mb-2 flex items-center justify-between">
              <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-400">
                {metric.label}
              </p>
              <metric.icon className={`size-5 shrink-0 ${metric.accent}`} />
            </div>

            <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {metric.value}
            </p>

            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {metric.sub}
            </p>
          </div>
        ))}
      </div>
    </header>
  )
}