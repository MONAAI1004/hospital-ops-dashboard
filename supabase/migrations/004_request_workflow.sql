-- Request Workflow v1: status enum, assigned_role, auto role assignment

CREATE TYPE public.request_status AS ENUM (
  'open',
  'acknowledged',
  'in_progress',
  'resolved'
);

ALTER TABLE public.requests
  ADD COLUMN status public.request_status NOT NULL DEFAULT 'open',
  ADD COLUMN assigned_role text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.assign_request_role(request_type public.request_type)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE request_type
    WHEN 'pain_medication' THEN 'Nurse'
    WHEN 'water' THEN 'Patient Care Assistant'
    WHEN 'interpreter' THEN 'Language Services'
    WHEN 'family_update' THEN 'Nurse'
    WHEN 'bathroom_assistance' THEN 'Patient Care Assistant'
    WHEN 'discharge_paperwork' THEN 'Case Manager'
    WHEN 'extra_blanket' THEN 'Patient Care Assistant'
    WHEN 'tv_not_working' THEN 'Facilities'
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_request_workflow_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_role IS NULL OR btrim(NEW.assigned_role) = '' THEN
    NEW.assigned_role := public.assign_request_role(NEW.type);
  END IF;

  IF NEW.status IS NULL THEN
    NEW.status := 'open';
  END IF;

  IF NEW.status = 'resolved'::public.request_status THEN
    NEW.resolved := true;

    IF NEW.resolved_at IS NULL THEN
      NEW.resolved_at := now();
    END IF;
  ELSE
    NEW.resolved := false;
    NEW.resolved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_requests_resolved_at ON public.requests;

CREATE TRIGGER set_request_workflow_defaults
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_request_workflow_defaults();

UPDATE public.requests
SET
  status = CASE
    WHEN resolved THEN 'resolved'::public.request_status
    ELSE 'open'::public.request_status
  END,
  assigned_role = public.assign_request_role(type)
WHERE assigned_role = '' OR assigned_role IS NULL;

DROP INDEX IF EXISTS public.idx_requests_open_patient;

CREATE INDEX idx_requests_status ON public.requests (status);

CREATE INDEX idx_requests_open_patient
  ON public.requests (patient_id, priority, created_at DESC)
  WHERE status <> 'resolved';
