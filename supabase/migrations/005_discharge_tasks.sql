-- Discharge Workflow V1: task-based checklist

CREATE TABLE public.discharge_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  task_type text NOT NULL,
  label text NOT NULL,
  assigned_role text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'complete', 'blocked')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discharge_tasks_patient_type_unique UNIQUE (patient_id, task_type)
);

CREATE INDEX idx_discharge_tasks_patient_id ON public.discharge_tasks (patient_id);
CREATE INDEX idx_discharge_tasks_status ON public.discharge_tasks (status);

CREATE TRIGGER set_discharge_tasks_updated_at
  BEFORE UPDATE ON public.discharge_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_discharge_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'complete' AND (OLD.status IS DISTINCT FROM 'complete') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'complete' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_discharge_task_completion
  BEFORE UPDATE OF status ON public.discharge_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_discharge_task_completion();

CREATE OR REPLACE FUNCTION public.initial_discharge_task_status(
  p_discharge_state public.discharge_state,
  p_task_type text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_discharge_state = 'complete' THEN
    RETURN 'complete';
  END IF;

  IF p_discharge_state = 'transport_delayed' THEN
    RETURN CASE p_task_type
      WHEN 'transport_request' THEN 'blocked'
      WHEN 'physician_clearance' THEN 'complete'
      WHEN 'pt_clearance' THEN 'complete'
      WHEN 'case_management_clearance' THEN 'complete'
      WHEN 'medication_reconciliation' THEN 'complete'
      WHEN 'family_pickup' THEN 'complete'
      ELSE 'pending'
    END;
  END IF;

  IF p_discharge_state = 'pending_md' THEN
    RETURN CASE p_task_type
      WHEN 'physician_clearance' THEN 'in_progress'
      ELSE 'pending'
    END;
  END IF;

  IF p_discharge_state = 'pending_pt' THEN
    RETURN CASE p_task_type
      WHEN 'physician_clearance' THEN 'complete'
      WHEN 'pt_clearance' THEN 'in_progress'
      ELSE 'pending'
    END;
  END IF;

  IF p_discharge_state = 'pending_case_manager' THEN
    RETURN CASE p_task_type
      WHEN 'physician_clearance' THEN 'complete'
      WHEN 'pt_clearance' THEN 'complete'
      WHEN 'case_management_clearance' THEN 'in_progress'
      ELSE 'pending'
    END;
  END IF;

  IF p_discharge_state = 'medication_ready' THEN
    RETURN CASE p_task_type
      WHEN 'physician_clearance' THEN 'complete'
      WHEN 'pt_clearance' THEN 'complete'
      WHEN 'case_management_clearance' THEN 'complete'
      WHEN 'medication_reconciliation' THEN 'in_progress'
      ELSE 'pending'
    END;
  END IF;

  IF p_discharge_state = 'pending_family_pickup' THEN
    RETURN CASE p_task_type
      WHEN 'physician_clearance' THEN 'complete'
      WHEN 'pt_clearance' THEN 'complete'
      WHEN 'case_management_clearance' THEN 'complete'
      WHEN 'medication_reconciliation' THEN 'complete'
      WHEN 'family_pickup' THEN 'in_progress'
      ELSE 'pending'
    END;
  END IF;

  RETURN 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_patient_discharge_state(p_patient_id uuid)
RETURNS public.discharge_state
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  first_open_type text;
  has_tasks boolean;
  all_complete boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.discharge_tasks WHERE patient_id = p_patient_id
  ) INTO has_tasks;

  IF NOT has_tasks THEN
    RETURN (
      SELECT discharge_state FROM public.patients WHERE id = p_patient_id
    );
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.discharge_tasks
    WHERE patient_id = p_patient_id
      AND status <> 'complete'
  ) INTO all_complete;

  IF all_complete THEN
    RETURN 'complete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.discharge_tasks
    WHERE patient_id = p_patient_id
      AND task_type = 'transport_request'
      AND status = 'blocked'
  ) THEN
    RETURN 'transport_delayed';
  END IF;

  SELECT task_type
  INTO first_open_type
  FROM public.discharge_tasks
  WHERE patient_id = p_patient_id
    AND status <> 'complete'
  ORDER BY CASE task_type
    WHEN 'physician_clearance' THEN 1
    WHEN 'pt_clearance' THEN 2
    WHEN 'case_management_clearance' THEN 3
    WHEN 'medication_reconciliation' THEN 4
    WHEN 'family_pickup' THEN 5
    WHEN 'transport_request' THEN 6
    ELSE 99
  END
  LIMIT 1;

  RETURN CASE first_open_type
    WHEN 'physician_clearance' THEN 'pending_md'
    WHEN 'pt_clearance' THEN 'pending_pt'
    WHEN 'case_management_clearance' THEN 'pending_case_manager'
    WHEN 'medication_reconciliation' THEN 'medication_ready'
    WHEN 'family_pickup' THEN 'pending_family_pickup'
    WHEN 'transport_request' THEN 'pending_family_pickup'
    ELSE 'pending_md'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_patient_discharge_state_from_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_patient_id uuid;
  new_state public.discharge_state;
BEGIN
  target_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
  new_state := public.compute_patient_discharge_state(target_patient_id);

  UPDATE public.patients
  SET discharge_state = new_state
  WHERE id = target_patient_id
    AND discharge_state IS DISTINCT FROM new_state;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_discharge_tasks_patient_state
  AFTER INSERT OR UPDATE OR DELETE ON public.discharge_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_patient_discharge_state_from_tasks();

INSERT INTO public.discharge_tasks (
  patient_id,
  task_type,
  label,
  assigned_role,
  status,
  completed_at
)
SELECT
  patient.id,
  template.task_type,
  template.label,
  template.assigned_role,
  public.initial_discharge_task_status(patient.discharge_state, template.task_type),
  CASE
    WHEN public.initial_discharge_task_status(patient.discharge_state, template.task_type) = 'complete'
      THEN now()
    ELSE NULL
  END
FROM public.patients AS patient
CROSS JOIN (
  VALUES
    ('physician_clearance', 'Physician clearance', 'Provider'),
    ('pt_clearance', 'PT clearance', 'PT'),
    ('case_management_clearance', 'Case management clearance', 'Case Manager'),
    ('medication_reconciliation', 'Medication reconciliation', 'Pharmacy'),
    ('family_pickup', 'Family pickup / transportation', 'Case Manager'),
    ('transport_request', 'Transport request', 'Transport')
) AS template(task_type, label, assigned_role)
WHERE patient.discharge_state <> 'not_started';

ALTER TABLE public.discharge_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can read discharge_tasks"
  ON public.discharge_tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert discharge_tasks"
  ON public.discharge_tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update discharge_tasks"
  ON public.discharge_tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.discharge_tasks;
