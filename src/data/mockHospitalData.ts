import type { Bed, Request, ShiftInfo, Ward } from '../types/hospital'
import { mockPatients } from './mockPatients'

export const wards: Ward[] = [
  {
    id: 'ward-1',
    name: '1st Floor',
    shortCode: '1F',
    bedCount: 30,
  },
  {
    id: 'ward-2',
    name: '2nd Floor',
    shortCode: '2F',
    bedCount: 30,
  },
  {
    id: 'ward-3',
    name: '3rd Floor',
    shortCode: '3F',
    bedCount: 30,
  },
  {
    id: 'ward-4',
    name: '4th Floor',
    shortCode: '4F',
    bedCount: 30,
  },
  {
    id: 'ward-5',
    name: '5th Floor',
    shortCode: '5F',
    bedCount: 30,
  },
]

const reservedRooms = new Set<number>([])
const cleaningRooms = new Set<number>([])

export const patients = mockPatients

export const beds: Bed[] = wards.flatMap((ward) =>
  Array.from({ length: ward.bedCount }, (_, index) => {
    const roomNumber = index + 1
    const patient = patients.find(
      (entry) => entry.wardId === ward.id && entry.roomNumber === roomNumber,
    )

    let status: Bed['status'] = 'available'

    if (patient) {
      status = 'occupied'
    } else if (reservedRooms.has(roomNumber)) {
      status = 'reserved'
    } else if (cleaningRooms.has(roomNumber)) {
      status = 'cleaning'
    }

    return {
      id: `${ward.id}-room-${roomNumber}`,
      wardId: ward.id,
      label: String(roomNumber).padStart(2, '0'),
      roomNumber,
      status,
      patientId: patient?.id ?? null,
    }
  }),
)

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString()

export const initialRequests: Request[] = [
  {
    id: 'REQ-2001',
    type: 'water',
    patientId: 'patient-101',
    roomNumber: 1,
    priority: 'low',
    createdAt: minutesAgo(10),
    description: 'Requesting water refill',
    resolved: false,
    },
    {
    id: 'REQ-2002',
    type: 'pain_medication',
    patientId: 'patient-102',
    roomNumber: 2,
    priority: 'urgent',
    createdAt: minutesAgo(4),
    description: 'Severe post-op pain',
    resolved: false,
    },
    {
    id: 'REQ-2003',
    type: 'family_update',
    patientId: 'patient-104',
    roomNumber: 4,
    priority: 'normal',
    createdAt: minutesAgo(25),
    description: 'Family requesting physician update',
    resolved: false,
    },
    {
    id: 'REQ-2004',
    type: 'bathroom_assistance',
    patientId: 'patient-201',
    roomNumber: 1,
    priority: 'normal',
    createdAt: minutesAgo(8),
    description: 'Needs assistance to restroom',
    resolved: false,
    },
    {
    id: 'REQ-2005',
    type: 'discharge_paperwork',
    patientId: 'patient-203',
    roomNumber: 3,
    priority: 'urgent',
    createdAt: minutesAgo(35),
    description: 'Discharge paperwork delayed',
    resolved: false,
    },
    {
    id: 'REQ-2006',
    type: 'interpreter',
    patientId: 'patient-302',
    roomNumber: 2,
    priority: 'normal',
    createdAt: minutesAgo(12),
    description: 'Spanish interpreter requested',
    resolved: false,
    },
    {
    id: 'REQ-2007',
    type: 'pain_medication',
    patientId: 'patient-402',
    roomNumber: 2,
    priority: 'urgent',
    createdAt: minutesAgo(3),
    description: 'Pain uncontrolled after procedure',
    resolved: false,
    },
    {
    id: 'REQ-2008',
    type: 'family_update',
    patientId: 'patient-501',
    roomNumber: 1,
    priority: 'urgent',
    createdAt: minutesAgo(18),
    description: 'Family requesting bedside discussion',
    resolved: false,
    },
    {
    id: 'REQ-2009',
    type: 'tv_not_working',
    patientId: 'patient-504',
    roomNumber: 4,
    priority: 'low',
    createdAt: minutesAgo(45),
    description: 'Television not functioning',
    resolved: false,
    }    
]

export const shiftInfo: ShiftInfo = {
  brandName: 'HappyCare',
  hospitalName: 'Patient Experience Hub',
  shiftLead: 'Emily Johnson',
  shiftDescription: 'Case Manager · 5th Floor',
}