-- 1. Improve existing patient map table
alter table public.careconnect_patient_map
add column if not exists is_active boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

-- 2. Improve existing user map table
alter table public.careconnect_user_map
add column if not exists is_active boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

-- 3. Message mapping table
create table if not exists public.careconnect_message_map (
  id uuid primary key default gen_random_uuid(),
  hospital_message_id uuid not null unique references public.patient_messages(id) on delete cascade,
  careconnect_message_id text not null unique,
  sync_direction text not null check (
    sync_direction in ('hospital_to_careconnect', 'careconnect_to_hospital')
  ),
  created_at timestamptz not null default now()
);

-- 4. Sync outbox
create table if not exists public.message_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'hospital_manager',
  target_system text not null default 'careconnect',
  entity_type text not null default 'patient_message',
  entity_id uuid not null references public.patient_messages(id) on delete cascade,
  event_type text not null default 'message.created',
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'processed', 'failed')
  ),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_message_sync_outbox_pending
on public.message_sync_outbox (status, next_attempt_at);

-- 5. Trigger function
create or replace function public.enqueue_patient_message_sync()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only sync brand-new local Hospital Manager messages.
  -- This prevents imported CareConnect messages from looping back later.
  if new.sync_status = 'pending_sync'
     and new.careconnect_message_id is null then

    insert into public.message_sync_outbox (
      entity_id,
      event_type,
      status
    )
    values (
      new.id,
      'message.created',
      'pending'
    );

  end if;

  return new;
end;
$$;

drop trigger if exists patient_message_sync_enqueue_trigger on public.patient_messages;

create trigger patient_message_sync_enqueue_trigger
after insert on public.patient_messages
for each row
execute function public.enqueue_patient_message_sync();