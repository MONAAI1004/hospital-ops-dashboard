-- Allow anon key access for dashboard dev (no auth yet).
-- Tighten or remove these policies before production.

CREATE POLICY "Anon users can read wards"
  ON public.wards FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can read beds"
  ON public.beds FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can read patients"
  ON public.patients FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert patients"
  ON public.patients FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update patients"
  ON public.patients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can read requests"
  ON public.requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert requests"
  ON public.requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update requests"
  ON public.requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
