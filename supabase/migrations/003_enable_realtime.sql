-- Enable Realtime for dashboard tables (Postgres Changes).

ALTER PUBLICATION supabase_realtime ADD TABLE public.wards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
