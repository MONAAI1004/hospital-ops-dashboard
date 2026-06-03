import { getSupabaseClient } from '../lib/supabaseClient'
import { fetchCurrentProfile } from './profiles'

export interface PatientMessage {
  id: string
  patient_id: string
  sender_profile_id: string | null
  sender_role: string
  sender_name: string
  body: string
  read_at: string | null
  read_by_staff: boolean
  read_by_patient: boolean
  created_at: string
  updated_at: string
  careconnect_message_id: string | null
  sync_status: string
  synced_at: string | null
  sync_error: string | null
}

export async function fetchPatientMessages(patientId: string) {
  const { data, error } = await getSupabaseClient()
    .from('patient_messages')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as PatientMessage[]
}

export async function sendPatientMessage(input: {
  patientId: string
  body: string
}) {
  const profile = await fetchCurrentProfile()
  if (!profile) throw new Error('No logged-in profile found.')

  const { error } = await getSupabaseClient()
    .from('patient_messages')
    .insert({
      patient_id: input.patientId,
      sender_profile_id: profile.id,
      sender_role: 'staff',
      sender_name: profile.displayName,
      body: input.body,
      read_by_staff: true,
      read_by_patient: false,
      sync_status: 'pending_sync',
    })

  if (error) throw error
}

export async function markPatientMessagesReadByStaff(patientId: string) {
  const { error } = await getSupabaseClient()
    .from('patient_messages')
    .update({
      read_by_staff: true,
      read_at: new Date().toISOString(),
    })
    .eq('patient_id', patientId)
    .eq('sender_role', 'patient_family')
    .eq('read_by_staff', false)

  if (error) throw error
}

export function subscribeToPatientMessages(
  patientId: string,
  onChange: () => void,
) {
  const channel = getSupabaseClient()
    .channel(`patient_messages:${patientId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patient_messages',
        filter: `patient_id=eq.${patientId}`,
      },
      () => onChange(),
    )
    .subscribe()

  return () => {
    getSupabaseClient().removeChannel(channel)
  }
}

export interface PatientMessageThreadSummary {
    patient_id: string
    latest_message_body: string | null
    latest_message_sender: string | null
    latest_message_at: string | null
    unread_count: number
  }

  export async function fetchPatientMessageThreadSummaries(): Promise<
  PatientMessageThreadSummary[]
> {
  const { data, error } = await getSupabaseClient()
    .from('patient_messages')
    .select('patient_id, sender_name, sender_role, body, created_at, read_by_staff')
    .order('created_at', { ascending: false })

  if (error) throw error

  const summaries = new Map<string, PatientMessageThreadSummary>()

  for (const message of data ?? []) {
    const patientId = message.patient_id as string

    const current =
      summaries.get(patientId) ??
      {
        patient_id: patientId,
        latest_message_body: null,
        latest_message_sender: null,
        latest_message_at: null,
        unread_count: 0,
      }

    if (!current.latest_message_at) {
      current.latest_message_body = message.body as string
      current.latest_message_sender = message.sender_name as string
      current.latest_message_at = message.created_at as string
    }

    if (
      message.sender_role === 'patient_family' &&
      message.read_by_staff === false
    ) {
      current.unread_count += 1
    }

    summaries.set(patientId, current)
  }

  return Array.from(summaries.values())
}

export async function sendTestPatientFamilyMessage(input: {
    patientId: string
    body: string
  }) {
    const { error } = await getSupabaseClient()
      .from('patient_messages')
      .insert({
        patient_id: input.patientId,
        sender_profile_id: null,
        sender_role: 'patient_family',
        sender_name: 'Patient Family',
        body: input.body,
        read_by_staff: false,
        read_by_patient: true,
        sync_status: 'pending_sync',
      })
  
    if (error) throw error
  }

  export async function fetchTotalUnreadPatientMessageCount(): Promise<number> {
    const { count, error } = await getSupabaseClient()
      .from('patient_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_role', 'patient_family')
      .eq('read_by_staff', false)
  
    if (error) throw error
    return count ?? 0
  }