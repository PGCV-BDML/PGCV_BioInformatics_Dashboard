-- Add the custom (localhost) service report generator to the launchpad.

INSERT INTO public.service_report_generator (id, href)
VALUES
  ('custom-service-report', 'http://127.0.0.1:8000')
ON CONFLICT (id) DO NOTHING;
