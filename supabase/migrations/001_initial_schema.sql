-- Hospital Ops Dashboard — initial schema
-- Run via: supabase db reset (local) or supabase migration up

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Enums (match src/types/hospital.ts)
-- ---------------------------------------------------------------------------

CREATE TYPE public.bed_status AS ENUM (
  'available',
  'occupied',
  'reserved',
  'cleaning'
);

CREATE TYPE public.age_group AS ENUM (
  'young',
  'adult',
  'elderly'
);

CREATE TYPE public.gender AS ENUM (
  'male',
  'female'
);

CREATE TYPE public.patient_status AS ENUM (
  'stable',
  'needs_pain_meds',
  'needs_attention',
  'high_risk',
  'resting',
  'discharge_ready',
  'discharge_today',
  'discharge_delayed',
  'awaiting_pt',
  'family_visit',
  'care_plan_review'
);

CREATE TYPE public.patient_mood AS ENUM (
  'calm',
  'waiting',
  'frustrated',
  'sleeping',
  'anxious'
);

CREATE TYPE public.discharge_state AS ENUM (
  'not_started',
  'pending_md',
  'pending_pt',
  'pending_case_manager',
  'pending_family_pickup',
  'medication_ready',
  'transport_delayed',
  'complete'
);

CREATE TYPE public.request_type AS ENUM (
  'pain_medication',
  'water',
  'interpreter',
  'family_update',
  'bathroom_assistance',
  'discharge_paperwork',
  'extra_blanket',
  'tv_not_working'
);

CREATE TYPE public.request_priority AS ENUM (
  'urgent',
  'normal',
  'low'
);

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Keep bed.status in sync when patients are assigned or unassigned.
CREATE OR REPLACE FUNCTION public.sync_bed_status_from_patient()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.beds
    SET status = 'available'
    WHERE id = OLD.bed_id
      AND status = 'occupied';

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.bed_id IS DISTINCT FROM NEW.bed_id THEN
    UPDATE public.beds
    SET status = 'available'
    WHERE id = OLD.bed_id
      AND status = 'occupied';
  END IF;

  UPDATE public.beds
  SET status = 'occupied'
  WHERE id = NEW.bed_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_request_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.resolved IS TRUE AND OLD.resolved IS DISTINCT FROM TRUE THEN
    NEW.resolved_at = now();
  ELSIF NEW.resolved IS FALSE AND OLD.resolved IS DISTINCT FROM FALSE THEN
    NEW.resolved_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Auto-create a profile row when a Supabase Auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text NOT NULL,
  bed_count integer NOT NULL CHECK (bed_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wards_short_code_unique UNIQUE (short_code)
);

CREATE TABLE public.beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES public.wards (id) ON DELETE CASCADE,
  room_number integer NOT NULL CHECK (room_number > 0),
  label text NOT NULL,
  status public.bed_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beds_ward_room_unique UNIQUE (ward_id, room_number)
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id uuid NOT NULL REFERENCES public.beds (id) ON DELETE RESTRICT,
  name text NOT NULL,
  initials text NOT NULL,
  age_group public.age_group NOT NULL,
  gender public.gender NOT NULL,
  los_days integer NOT NULL DEFAULT 0 CHECK (los_days >= 0),
  status public.patient_status NOT NULL DEFAULT 'stable',
  mood public.patient_mood NOT NULL DEFAULT 'calm',
  satisfaction_score integer NOT NULL DEFAULT 0
    CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  discharge_state public.discharge_state NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patients_bed_id_unique UNIQUE (bed_id)
);

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  type public.request_type NOT NULL,
  priority public.request_priority NOT NULL DEFAULT 'normal',
  description text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role_title text,
  brand_name text NOT NULL DEFAULT 'HappyCare',
  hospital_name text NOT NULL DEFAULT 'Patient Experience Hub',
  default_ward_id uuid REFERENCES public.wards (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_beds_ward_id ON public.beds (ward_id);
CREATE INDEX idx_beds_status ON public.beds (status);
CREATE INDEX idx_beds_ward_status ON public.beds (ward_id, status);

CREATE INDEX idx_patients_bed_id ON public.patients (bed_id);
CREATE INDEX idx_patients_status ON public.patients (status);
CREATE INDEX idx_patients_discharge_state ON public.patients (discharge_state);
CREATE INDEX idx_patients_mood ON public.patients (mood);

CREATE INDEX idx_requests_patient_id ON public.requests (patient_id);
CREATE INDEX idx_requests_created_at ON public.requests (created_at DESC);
CREATE INDEX idx_requests_open_patient
  ON public.requests (patient_id, priority, created_at DESC)
  WHERE resolved = false;

CREATE INDEX idx_profiles_default_ward_id ON public.profiles (default_ward_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER set_wards_updated_at
  BEFORE UPDATE ON public.wards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_beds_updated_at
  BEFORE UPDATE ON public.beds
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sync_bed_status_after_patient_insert
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bed_status_from_patient();

CREATE TRIGGER sync_bed_status_after_patient_update
  AFTER UPDATE OF bed_id ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bed_status_from_patient();

CREATE TRIGGER sync_bed_status_after_patient_delete
  AFTER DELETE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bed_status_from_patient();

CREATE TRIGGER set_requests_resolved_at
  BEFORE UPDATE OF resolved ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_request_resolved_at();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
