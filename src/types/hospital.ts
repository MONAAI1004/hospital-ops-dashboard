export type RequestPriority = 'urgent' | 'normal' | 'low'

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

export type PatientStatus =
  | 'stable'
  | 'needs_pain_meds'
  | 'needs_attention'
  | 'high_risk'
  | 'resting'
  | 'discharge_ready'
  | 'discharge_today'
  | 'discharge_delayed'
  | 'awaiting_pt'
  | 'family_visit'
  | 'care_plan_review'

export type PatientMood =
  | 'calm'
  | 'waiting'
  | 'frustrated'
  | 'sleeping'
  | 'anxious'

export type DischargeState =
  | 'not_started'
  | 'pending_md'
  | 'pending_pt'
  | 'pending_case_manager'
  | 'pending_family_pickup'
  | 'medication_ready'
  | 'transport_delayed'
  | 'complete'

export type RequestType =
  | 'pain_medication'
  | 'water'
  | 'interpreter'
  | 'family_update'
  | 'bathroom_assistance'
  | 'discharge_paperwork'
  | 'extra_blanket'
  | 'tv_not_working'

export interface Patient {
  id: string
  roomNumber: number
  wardId: string
  name: string
  initials: string
  ageGroup: 'young' | 'adult' | 'elderly'
  gender: 'male' | 'female'
  losDays: number
  status: PatientStatus
  mood: PatientMood
  satisfactionScore: number
  dischargeState: DischargeState
  activeRequestIds: string[]
}

export interface Bed {
  id: string
  wardId: string
  label: string
  roomNumber: number
  status: BedStatus
  patientId: string | null
}

export interface Ward {
  id: string
  name: string
  shortCode: string
  bedCount: number
}

export interface Request {
  id: string
  type: RequestType
  patientId: string
  roomNumber: number
  priority: RequestPriority
  createdAt: string
  description: string
  resolved: boolean
}

export interface ShiftInfo {
  brandName: string
  hospitalName: string
  shiftLead: string
  shiftDescription: string
}