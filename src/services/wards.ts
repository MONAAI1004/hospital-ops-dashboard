import { getSupabaseClient } from '../lib/supabaseClient'
import type { Ward } from '../types/hospital'

type WardRow = {
  id: string
  name: string
  short_code: string
  bed_count: number
}

function mapWard(row: WardRow): Ward {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code,
    bedCount: row.bed_count,
  }
}

export async function fetchWards(): Promise<Ward[]> {
  const { data, error } = await getSupabaseClient()
    .from('wards')
    .select('id, name, short_code, bed_count')
    .order('name')

  if (error) {
    throw error
  }

  return (data ?? []).map(mapWard)
}
