import { createClient } from '@supabase/supabase-js'

type OutboxRow = {
  id: string
  entity_id: string
  attempts: number
}

type HospitalMessage = {
  id: string
  patient_id: string
  sender_profile_id: string | null
  sender_role: string
  sender_name: string
  body: string
  created_at: string
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
  const careconnectApiBase = Deno.env.get('CARECONNECT_API_BASE')

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
    const { count, error } = await hospital
      .from('message_sync_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return Response.json({
      hospitalUrl,
      pendingCount: count,
      error: error?.message ?? null,
    })
  }

  const { data: outboxRows, error: outboxError } = await hospital
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

  for (const outbox of (outboxRows ?? []) as OutboxRow[]) {
    await hospital
      .from('message_sync_outbox')
      .update({
        status: 'processing',
        attempts: outbox.attempts + 1,
      })
      .eq('id', outbox.id)

      const result = await syncOneMessage({
        hospital,
        careconnect,
        outbox,
        syncSecret,
        careconnectApiBase,
      })

    results.push(result)
  }

  return Response.json({
    ok: true,
    processed: results.length,
    results,
  })
})

async function syncOneMessage({
  hospital,
  careconnect,
  outbox,
  syncSecret,
  careconnectApiBase,
}: {
  hospital: ReturnType<typeof createClient>
  careconnect: ReturnType<typeof createClient>
  outbox: OutboxRow
  syncSecret: string
  careconnectApiBase: string | undefined
}) {
  try {
    const { data: message, error: messageError } = await hospital
      .from('patient_messages')
      .select(
        'id, patient_id, sender_profile_id, sender_role, sender_name, body, created_at',
      )
      .eq('id', outbox.entity_id)
      .single()

    if (messageError || !message) {
      throw new Error(messageError?.message ?? 'Hospital message not found')
    }

    const hospitalMessage = message as HospitalMessage

    const { data: existingMap } = await hospital
      .from('careconnect_message_map')
      .select('careconnect_message_id')
      .eq('hospital_message_id', hospitalMessage.id)
      .maybeSingle()

    if (existingMap?.careconnect_message_id) {
      await markProcessed(hospital, outbox.id)
      return {
        outbox_id: outbox.id,
        hospital_message_id: hospitalMessage.id,
        skipped: true,
        reason: 'Already synced',
      }
    }

    const { data: patientMap, error: patientMapError } = await hospital
      .from('careconnect_patient_map')
      .select('careconnect_patient_id')
      .eq('hospital_patient_id', hospitalMessage.patient_id)
      .eq('is_active', true)
      .maybeSingle()

    if (patientMapError) {
      throw new Error(patientMapError.message)
    }

    if (!patientMap?.careconnect_patient_id) {
      throw new Error('No active CareConnect patient mapping found')
    }

    const { data: userMap } = hospitalMessage.sender_profile_id
      ? await hospital
          .from('careconnect_user_map')
          .select('careconnect_user_id')
          .eq('hospital_profile_id', hospitalMessage.sender_profile_id)
          .eq('is_active', true)
          .maybeSingle()
      : { data: null }

    const careconnectMessageId = crypto.randomUUID()

    const { data: insertedMessage, error: insertError } = await careconnect
      .from('patient_messages')
      .insert({
        mongo_object_id: careconnectMessageId,
        message_id: hospitalMessage.id,
        patient_id: patientMap.careconnect_patient_id,
        sender_role: hospitalMessage.sender_role,
        sender_user_id: userMap?.careconnect_user_id ?? null,
        sender_name: hospitalMessage.sender_name,
        body: hospitalMessage.body,
        status: 'sent',
        created_at: hospitalMessage.created_at,
        updated_at: new Date().toISOString(),
        raw: {
          source_system: 'hospital_manager',
          hospital_message_id: hospitalMessage.id,
          hospital_patient_id: hospitalMessage.patient_id,
        },
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    if (careconnectApiBase && insertedMessage) {
      await fetch(
        `${careconnectApiBase}/api/internal/realtime/message-created`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-secret': syncSecret,
          },
          body: JSON.stringify({
            message: {
              id: insertedMessage.message_id ?? insertedMessage.mongo_object_id,
              patientId: insertedMessage.patient_id,
              senderRole: insertedMessage.sender_role,
              senderUserId: insertedMessage.sender_user_id,
              senderName: insertedMessage.sender_name,
              body: insertedMessage.body,
              createdAt: insertedMessage.created_at,
              updatedAt: insertedMessage.updated_at,
              readAt: insertedMessage.read_at,
              status: insertedMessage.status,
            },
          }),
        },
      )
    }

    await hospital.from('careconnect_message_map').insert({
      hospital_message_id: hospitalMessage.id,
      careconnect_message_id: careconnectMessageId,
      sync_direction: 'hospital_to_careconnect',
    })

    await hospital
      .from('patient_messages')
      .update({
        sync_status: 'synced',
        careconnect_message_id: careconnectMessageId,
        synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', hospitalMessage.id)

    await markProcessed(hospital, outbox.id)

    return {
      outbox_id: outbox.id,
      hospital_message_id: hospitalMessage.id,
      careconnect_message_id: careconnectMessageId,
      synced: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await hospital
      .from('message_sync_outbox')
      .update({
        status: 'failed',
        last_error: message,
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq('id', outbox.id)

    await hospital
      .from('patient_messages')
      .update({
        sync_status: 'sync_failed',
        sync_error: message,
      })
      .eq('id', outbox.entity_id)

    return {
      outbox_id: outbox.id,
      hospital_message_id: outbox.entity_id,
      synced: false,
      error: message,
    }
  }
}

async function markProcessed(
  hospital: ReturnType<typeof createClient>,
  outboxId: string,
) {
  await hospital
    .from('message_sync_outbox')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', outboxId)
}