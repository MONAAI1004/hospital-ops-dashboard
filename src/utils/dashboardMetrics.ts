import type {
  Bed,
  Request,
  RequestPriority,
  Ward,
} from '../types/hospital'

export interface BedOccupancyResult {
  percentage: number
  occupied: number
  total: number
}

export interface AvailableBedsResult {
  total: number
  summary: string
}

export interface PendingRequestsResult {
  total: number
  urgent: number
}

export interface WardOccupancyResult {
  wardId: string
  wardName: string
  occupied: number
  total: number
  percentage: number
}

export interface RequestCountsResult {
  total: number
  byPriority: Record<RequestPriority, number>
}

function getOccupiedBedCount(beds: Bed[]): number {
  return beds.filter((bed) => bed.status === 'occupied').length
}

export function calculateBedOccupancy(beds: Bed[]): BedOccupancyResult {
  const total = beds.length
  const occupied = getOccupiedBedCount(beds)
  const percentage = total === 0 ? 0 : Math.round((occupied / total) * 100)

  return { percentage, occupied, total }
}

export function calculateAvailableBeds(
  beds: Bed[],
  wards: Ward[],
): AvailableBedsResult {
  const wardById = new Map(wards.map((ward) => [ward.id, ward]))
  const availableByWard = new Map<string, number>()

  for (const bed of beds) {
    if (bed.status !== 'available') continue
    availableByWard.set(bed.wardId, (availableByWard.get(bed.wardId) ?? 0) + 1)
  }

  const summary = [...availableByWard.entries()]
    .map(([wardId, count]) => {
      const ward = wardById.get(wardId)
      return `${count} ${ward?.shortCode ?? ward?.name ?? wardId}`
    })
    .slice(0, 3)
    .join(' · ')

  return {
    total: beds.filter((bed) => bed.status === 'available').length,
    summary: summary || 'No beds available',
  }
}

export function calculatePendingRequests(
  requests: Request[],
): PendingRequestsResult {
  const openRequests = requests.filter((request) => !request.resolved)

  return {
    total: openRequests.length,
    urgent: openRequests.filter((request) => request.priority === 'urgent').length,
  }
}

export function calculateAverageWaitTime(requests: Request[]): number {
  const now = Date.now()
  const waitTimes = requests.map(
    (request) => (now - new Date(request.createdAt).getTime()) / 60_000,
  )

  if (waitTimes.length === 0) return 0

  return Math.round(
    waitTimes.reduce((sum, minutes) => sum + minutes, 0) / waitTimes.length,
  )
}

export function calculateWardOccupancy(
  ward: Ward,
  beds: Bed[],
): WardOccupancyResult {
  const wardBeds = beds.filter((bed) => bed.wardId === ward.id)
  const total = wardBeds.length
  const occupied = getOccupiedBedCount(wardBeds)
  const percentage = total === 0 ? 0 : Math.round((occupied / total) * 100)

  return {
    wardId: ward.id,
    wardName: ward.name,
    occupied,
    total,
    percentage,
  }
}

export function calculateRequestCounts(requests: Request[]): RequestCountsResult {
  const byPriority: Record<RequestPriority, number> = {
    urgent: 0,
    normal: 0,
    low: 0,
  }

  for (const request of requests) {
    byPriority[request.priority] += 1
  }

  return {
    total: requests.length,
    byPriority,
  }
}

export function formatRelativeTime(isoDate: string): string {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(isoDate).getTime()) / 60_000),
  )

  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  return `${hours} hr ago`
}
