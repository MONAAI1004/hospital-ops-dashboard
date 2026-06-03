import { getSupabaseClient } from '../lib/supabaseClient'

export type Profile = {
  id: string
  displayName: string
  roleTitle: string | null
  brandName: string
  hospitalName: string
  defaultWardId: string | null
}

type ProfileRow = {
  id: string
  display_name: string
  role_title: string | null
  brand_name: string
  hospital_name: string
  default_ward_id: string | null
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role_title, brand_name, hospital_name, default_ward_id')
    .eq('id', user.id)
    .single()

  if (error) throw error

  const row = data as ProfileRow

  return {
    id: row.id,
    displayName: row.display_name,
    roleTitle: row.role_title,
    brandName: row.brand_name,
    hospitalName: row.hospital_name,
    defaultWardId: row.default_ward_id,
  }
}

export async function updateCurrentProfile(input: {
    displayName: string
    hospitalName: string
  }) {
    const supabase = getSupabaseClient()
  
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
  
    if (userError) throw userError
    if (!user) throw new Error('No logged-in user found.')
  
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: input.displayName,
        hospital_name: input.hospitalName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  
    if (error) throw error
  }