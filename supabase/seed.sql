-- Hospital Ops Dashboard — seed data
-- Mirrors src/data/mockHospitalData.ts and src/data/mockPatients.ts
-- Run via: supabase db reset (applies migrations then seed)

-- Deterministic UUID namespace for reproducible IDs across environments.
-- bed_id(patient) is resolved via ward short_code + room_number lookup.

BEGIN;

-- ---------------------------------------------------------------------------
-- Wards (5 floors × 30 beds)
-- ---------------------------------------------------------------------------

INSERT INTO public.wards (id, name, short_code, bed_count) VALUES
  ('a1111111-1111-4111-8111-111111111101', '1st Floor', '1F', 30),
  ('a1111111-1111-4111-8111-111111111102', '2nd Floor', '2F', 30),
  ('a1111111-1111-4111-8111-111111111103', '3rd Floor', '3F', 30),
  ('a1111111-1111-4111-8111-111111111104', '4th Floor', '4F', 30),
  ('a1111111-1111-4111-8111-111111111105', '5th Floor', '5F', 30);

-- ---------------------------------------------------------------------------
-- Beds (150 total — 30 per ward, rooms 1–30)
-- ---------------------------------------------------------------------------

INSERT INTO public.beds (id, ward_id, room_number, label, status)
SELECT
  extensions.uuid_generate_v5(
    '00000000-0000-4000-8000-000000000001'::uuid,
    'bed:' || w.id::text || ':' || gs::text
  ),
  w.id,
  gs,
  lpad(gs::text, 2, '0'),
  'available'
FROM public.wards AS w
CROSS JOIN generate_series(1, 30) AS gs;

-- ---------------------------------------------------------------------------
-- Patients (16 — each assigned to exactly one bed via bed_id)
-- Legacy mock IDs preserved in comments for React migration mapping.
-- ---------------------------------------------------------------------------

INSERT INTO public.patients (
  id,
  bed_id,
  name,
  initials,
  age_group,
  gender,
  los_days,
  status,
  mood,
  satisfaction_score,
  discharge_state
) VALUES
  -- patient-101 · ward-1 room 01
  (
    'c0000101-0000-4000-8000-000000000101',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111101:1'
    ),
    'James Carter', 'JC', 'adult', 'male', 2,
    'stable', 'calm', 92, 'not_started'
  ),
  -- patient-102 · ward-1 room 02
  (
    'c0000102-0000-4000-8000-000000000102',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111101:2'
    ),
    'Maria Lopez', 'ML', 'adult', 'female', 5,
    'needs_pain_meds', 'waiting', 71, 'pending_md'
  ),
  -- patient-103 · ward-1 room 03
  (
    'c0000103-0000-4000-8000-000000000103',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111101:3'
    ),
    'David Kim', 'DK', 'adult', 'male', 1,
    'resting', 'sleeping', 95, 'not_started'
  ),
  -- patient-104 · ward-1 room 04
  (
    'c0000104-0000-4000-8000-000000000104',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111101:4'
    ),
    'Rachel Green', 'RG', 'adult', 'female', 8,
    'high_risk', 'anxious', 63, 'pending_case_manager'
  ),
  -- patient-201 · ward-2 room 01
  (
    'c0000201-0000-4000-8000-000000000201',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111102:1'
    ),
    'Michael Ross', 'MR', 'adult', 'male', 6,
    'awaiting_pt', 'waiting', 78, 'pending_pt'
  ),
  -- patient-202 · ward-2 room 02
  (
    'c0000202-0000-4000-8000-000000000202',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111102:2'
    ),
    'Emma Wilson', 'EW', 'adult', 'female', 3,
    'stable', 'calm', 89, 'medication_ready'
  ),
  -- patient-203 · ward-2 room 03
  (
    'c0000203-0000-4000-8000-000000000203',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111102:3'
    ),
    'Robert Hayes', 'RH', 'elderly', 'male', 10,
    'discharge_delayed', 'frustrated', 52, 'transport_delayed'
  ),
  -- patient-301 · ward-3 room 01
  (
    'c0000301-0000-4000-8000-000000000301',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111103:1'
    ),
    'Sophia Nguyen', 'SN', 'adult', 'female', 2,
    'family_visit', 'calm', 94, 'not_started'
  ),
  -- patient-302 · ward-3 room 02
  (
    'c0000302-0000-4000-8000-000000000302',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111103:2'
    ),
    'Christopher Hall', 'CH', 'adult', 'male', 7,
    'needs_attention', 'waiting', 68, 'pending_md'
  ),
  -- patient-303 · ward-3 room 03
  (
    'c0000303-0000-4000-8000-000000000303',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111103:3'
    ),
    'Olivia Brooks', 'OB', 'adult', 'female', 4,
    'care_plan_review', 'anxious', 74, 'pending_case_manager'
  ),
  -- patient-402 · ward-4 room 02
  (
    'c0000402-0000-4000-8000-000000000402',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111104:2'
    ),
    'Brian Thompson', 'BT', 'adult', 'male', 9,
    'high_risk', 'anxious', 59, 'pending_md'
  ),
  -- patient-403 · ward-4 room 03
  (
    'c0000403-0000-4000-8000-000000000403',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111104:3'
    ),
    'Natalie Price', 'NP', 'adult', 'female', 5,
    'discharge_ready', 'calm', 91, 'medication_ready'
  ),
  -- patient-501 · ward-5 room 01
  (
    'c0000501-0000-4000-8000-000000000501',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111105:1'
    ),
    'William Foster', 'WF', 'elderly', 'male', 11,
    'high_risk', 'anxious', 58, 'pending_md'
  ),
  -- patient-502 · ward-5 room 02
  (
    'c0000502-0000-4000-8000-000000000502',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111105:2'
    ),
    'Grace Bennett', 'GB', 'adult', 'female', 3,
    'stable', 'calm', 96, 'not_started'
  ),
  -- patient-503 · ward-5 room 03
  (
    'c0000503-0000-4000-8000-000000000503',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111105:3'
    ),
    'Anthony Miller', 'AM', 'adult', 'male', 6,
    'discharge_today', 'waiting', 87, 'complete'
  ),
  -- patient-504 · ward-5 room 04
  (
    'c0000504-0000-4000-8000-000000000504',
    extensions.uuid_generate_v5(
      '00000000-0000-4000-8000-000000000001'::uuid,
      'bed:a1111111-1111-4111-8111-111111111105:4'
    ),
    'Jennifer Cook', 'JC', 'adult', 'female', 4,
    'needs_attention', 'frustrated', 66, 'pending_family_pickup'
  );

-- ---------------------------------------------------------------------------
-- Requests (9 open — no room_number column; join patient → bed for room)
-- Legacy mock IDs: REQ-2001 … REQ-2009
-- ---------------------------------------------------------------------------

INSERT INTO public.requests (
  id,
  patient_id,
  type,
  priority,
  description,
  resolved,
  created_at
) VALUES
  (
    'd0002001-0000-4000-8000-000000002001',
    'c0000101-0000-4000-8000-000000000101',
    'water', 'low',
    'Requesting water refill', false,
    now() - interval '10 minutes'
  ),
  (
    'd0002002-0000-4000-8000-000000002002',
    'c0000102-0000-4000-8000-000000000102',
    'pain_medication', 'urgent',
    'Severe post-op pain', false,
    now() - interval '4 minutes'
  ),
  (
    'd0002003-0000-4000-8000-000000002003',
    'c0000104-0000-4000-8000-000000000104',
    'family_update', 'normal',
    'Family requesting physician update', false,
    now() - interval '25 minutes'
  ),
  (
    'd0002004-0000-4000-8000-000000002004',
    'c0000201-0000-4000-8000-000000000201',
    'bathroom_assistance', 'normal',
    'Needs assistance to restroom', false,
    now() - interval '8 minutes'
  ),
  (
    'd0002005-0000-4000-8000-000000002005',
    'c0000203-0000-4000-8000-000000000203',
    'discharge_paperwork', 'urgent',
    'Discharge paperwork delayed', false,
    now() - interval '35 minutes'
  ),
  (
    'd0002006-0000-4000-8000-000000002006',
    'c0000302-0000-4000-8000-000000000302',
    'interpreter', 'normal',
    'Spanish interpreter requested', false,
    now() - interval '12 minutes'
  ),
  (
    'd0002007-0000-4000-8000-000000002007',
    'c0000402-0000-4000-8000-000000000402',
    'pain_medication', 'urgent',
    'Pain uncontrolled after procedure', false,
    now() - interval '3 minutes'
  ),
  (
    'd0002008-0000-4000-8000-000000002008',
    'c0000501-0000-4000-8000-000000000501',
    'family_update', 'urgent',
    'Family requesting bedside discussion', false,
    now() - interval '18 minutes'
  ),
  (
    'd0002009-0000-4000-8000-000000002009',
    'c0000504-0000-4000-8000-000000000504',
    'tv_not_working', 'low',
    'Television not functioning', false,
    now() - interval '45 minutes'
  );

-- ---------------------------------------------------------------------------
-- Profiles
-- Requires auth.users rows — created automatically on signup via trigger.
-- After creating a user in Supabase Auth (e.g. emily@example.com), run:
--
--   UPDATE public.profiles
--   SET
--     display_name = 'Emily Johnson',
--     role_title = 'Case Manager · 5th Floor',
--     brand_name = 'HappyCare',
--     hospital_name = 'Patient Experience Hub',
--     default_ward_id = 'a1111111-1111-4111-8111-111111111105'
--   WHERE id = '<auth-user-uuid>';
--
-- ---------------------------------------------------------------------------

COMMIT;
