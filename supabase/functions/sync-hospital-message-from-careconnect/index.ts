import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type CareConnectOutboxRow = {
  id: string
  entity_id: string
  attempts: number
}

type CareConnectMessage = {
  mongo_object_id: string
  patient_id: string
  sender_role: string | null
  sender_user_id: string | null
  sender_name: string | null
  body: string | null
  created_at: string | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const hospitalUrl = Deno.env.get('HOSPITAL_SUPABASE_URL')
  const hospitalServiceKey = Deno.env.get('HOSPITAL_SUPABASE_SERVICE_ROLE_KEY')
  const careconnectUrl = Deno.env.get('CARECONNECT_SUPABASE_URL')
  const careconnectServiceKey = Deno.env.get('CARECONNECT_SUPABASE_SERVICE_ROLE_KEY')
  const syncSecret = Deno.env.get('SYNC_SECRET')

  if (
    !hospitalUrl ||
    !hospitalServiceKey ||
    !careconnectUrl ||
    !careconnectServiceKey ||
    !syncSecret
  ) {
    return Response.json({ error: 'Missing environment variables' }, { status: 500 })
  }

  const providedSecret = req.headers.get('x-sync-secret')

  if (providedSecret !== syncSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hospital = createClient(hospitalUrl, hospitalServiceKey)
  const careconnect = createClient(careconnectUrl, careconnectServiceKey)

  if (req.headers.get('x-debug') === 'true') {
    const { count, error } = await careconnect
      .from('message_sync_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return Response.json({
      careconnectUrl,
      pendingCount: count,
      error: error?.message ?? null,
    })
  }

  const { data: outboxRows, error: outboxError } = await careconnect
    .from('message_sync_outbox')
    .select('id, entity_id, attempts')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(10)

  if (outboxError) {
    return Response.json({ error: outboxError.message }, { status: 500 })
  }

  const results = []

  for (const outbox of (outboxRows ?? []) as CareConnectOutboxRow[]) {
    await careconnect
      .from('message_sync_outbox')
      .update({
        status: 'processing',
        attempts: outbox.attempts + 1,
      })
      .eq('id', outbox.id)

    const result = await syncOneCareConnectMessage({
      hospital,
      careconnect,
      outbox,
    })

    results.push(result)
  }

  return Response.json({
    ok: true,
    processed: results.length,
    results,
  })
})

async function syncOneCareConnectMessage({
  hospital,
  careconnect,
  outbox,
}: {
  hospital: ReturnType<typeof createClient>
  careconnect: ReturnType<typeof createClient>
  outbox: CareConnectOutboxRow
}) {
  try {
    const { data: message, error: messageError } = await careconnect
      .from('patient_messages')
      .select(
        'mongo_object_id, patient_id, sender_role, sender_user_id, sender_name, body, created_at',
      )
      .eq('mongo_object_id', outbox.entity_id)
      .single()

    if (messageError || !message) {
      throw new Error(messageError?.message ?? 'CareConnect message not found')
    }

    const careMessage = message as CareConnectMessage

    if (!careMessage.body) {
      throw new Error('CareConnect message body is empty')
    }

    const { data: existingHospitalMessage } = await hospital
      .from('patient_messages')
      .select('id')
      .eq('careconnect_message_id', careMessage.mongo_object_id)
      .maybeSingle()

    if (existingHospitalMessage?.id) {
      await markProcessed(careconnect, outbox.id)
      return {
        outbox_id: outbox.id,
        careconnect_message_id: careMessage.mongo_object_id,
        skipped: true,
        reason: 'Already imported',
      }
    }

    const { data: patientMap, error: patientMapError } = await hospital
      .from('careconnect_patient_map')
      .select('hospital_patient_id')
      .eq('careconnect_patient_id', careMessage.patient_id)
      .eq('is_active', true)
      .maybeSingle()

    if (patientMapError) {
      throw new Error(patientMapError.message)
    }

    if (!patientMap?.hospital_patient_id) {
      throw new Error('No active Hospital Manager patient mapping found')
    }

    const senderName = careMessage.sender_name ?? 'Patient Family'

    const { data: insertedHospitalMessage, error: insertError } = await hospital
      .from('patient_messages')
      .insert({
        patient_id: patientMap.hospital_patient_id,
        sender_profile_id: null,
        sender_role: 'patient_family',
        sender_name: senderName,
        body: careMessage.body,
        read_by_staff: false,
        read_by_patient: true,
        sync_status: 'synced',
        careconnect_message_id: careMessage.mongo_object_id,
        synced_at: new Date().toISOString(),
        sync_error: null,
        created_at: careMessage.created_at ?? new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !insertedHospitalMessage) {
      throw new Error(insertError?.message ?? 'Failed to insert Hospital Manager message')
    }

    await hospital.from('careconnect_message_map').insert({
      hospital_message_id: insertedHospitalMessage.id,
      careconnect_message_id: careMessage.mongo_object_id,
      sync_direction: 'careconnect_to_hospital',
    })

    await markProcessed(careconnect, outbox.id)

    return {
      outbox_id: outbox.id,
      careconnect_message_id: careMessage.mongo_object_id,
      hospital_message_id: insertedHospitalMessage.id,
      synced: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await careconnect
      .from('message_sync_outbox')
      .update({
        status: 'failed',
        last_error: message,
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq('id', outbox.id)

    return {
      outbox_id: outbox.id,
      careconnect_message_id: outbox.entity_id,
      synced: false,
      error: message,
    }
  }
}

async function markProcessed(
  careconnect: ReturnType<typeof createClient>,
  outboxId: string,
) {
  await careconnect
    .from('message_sync_outbox')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', outboxId)
}