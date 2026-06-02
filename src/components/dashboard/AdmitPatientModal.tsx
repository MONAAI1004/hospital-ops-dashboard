import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type {
  Bed,
  PatientMood,
  PatientStatus,
  Ward,
} from '../../types/hospital'

type AgeGroup = 'young' | 'adult' | 'elderly'
type Gender = 'male' | 'female'

interface AdmitPatientModalProps {
  isOpen: boolean
  wards: Ward[]
  beds: Bed[]
  selectedWardId: string
  preselectedBedId: string | null
  onClose: () => void
  onAdmitPatient: (patient: {
    bedId: string
    name: string
    initials: string
    ageGroup: AgeGroup
    gender: Gender
    status: PatientStatus
    mood: PatientMood
  }) => void
}

export default function AdmitPatientModal({
  isOpen,
  beds,
  selectedWardId,
  preselectedBedId,
  onClose,
  onAdmitPatient,
}: AdmitPatientModalProps) {
  const [name, setName] = useState('')
  const [initials, setInitials] = useState('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult')
  const [gender, setGender] = useState<Gender>('female')
  const [status, setStatus] = useState<PatientStatus>('stable')
  const [mood, setMood] = useState<PatientMood>('calm')
  const [selectedBedId, setSelectedBedId] = useState(preselectedBedId ?? '')

  const availableBeds = useMemo(() => {
    return beds.filter(
      (bed) =>
        bed.wardId === selectedWardId &&
        bed.status === 'available' &&
        !bed.patientId,
    )
  }, [beds, selectedWardId])

  const selectedBed = beds.find(
    (bed) => bed.id === (preselectedBedId ?? selectedBedId),
  )

  if (!isOpen) return null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const bedId = preselectedBedId ?? selectedBedId

    if (!bedId || !name.trim() || !initials.trim()) {
      return
    }

    onAdmitPatient({
      bedId,
      name: name.trim(),
      initials: initials.trim().toUpperCase(),
      ageGroup,
      gender,
      status,
      mood,
    })

    setName('')
    setInitials('')
    setAgeGroup('adult')
    setGender('female')
    setStatus('stable')
    setMood('calm')
    setSelectedBedId('')
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Admit Patient
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Assign a new patient to an available room.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Patient Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Sarah Johnson"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Initials
              </label>
              <input
                value={initials}
                onChange={(event) => setInitials(event.target.value)}
                placeholder="SJ"
                maxLength={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Room
              </label>

              {preselectedBedId && selectedBed ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Room {selectedBed.label}
                </div>
              ) : (
                <select
                  value={selectedBedId}
                  onChange={(event) => setSelectedBedId(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Select room</option>
                  {availableBeds.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      Room {bed.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Age Group
              </label>
              <select
                value={ageGroup}
                onChange={(event) => setAgeGroup(event.target.value as AgeGroup)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="young">Young</option>
                <option value="adult">Adult</option>
                <option value="elderly">Elderly</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Gender
              </label>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value as Gender)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PatientStatus)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="stable">Stable</option>
                <option value="needs_attention">Needs Attention</option>
                <option value="needs_pain_meds">Needs Pain Meds</option>
                <option value="high_risk">High Risk</option>
                <option value="resting">Resting</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Mood
              </label>
              <select
                value={mood}
                onChange={(event) => setMood(event.target.value as PatientMood)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="calm">Calm</option>
                <option value="waiting">Waiting</option>
                <option value="anxious">Anxious</option>
                <option value="sleeping">Sleeping</option>
                <option value="frustrated">Frustrated</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-xs text-slate-600 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-slate-300">
            New patients start with LOS Day 1, discharge workflow not started,
            and satisfaction score 90%.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!(preselectedBedId ?? selectedBedId) || !name.trim() || !initials.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Admit Patient
          </button>
        </div>
      </form>
    </div>
  )
}