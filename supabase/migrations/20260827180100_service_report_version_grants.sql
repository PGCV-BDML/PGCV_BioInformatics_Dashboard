-- ============================================================
-- 20260827180100_service_report_version_grants.sql
--
-- Re-apply table privileges and backfill version rows for
-- databases that already ran 20260827180000. Without GRANT,
-- the history query returns empty and the UI looks unchanged.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.analysis_service_report_version TO authenticated;

INSERT INTO public.analysis_service_report_version (
  analysis_id, file_path, file_name, file_size, kind, uploaded_by, uploaded_at
)
SELECT
  a.id,
  a.service_report_file_path,
  a.service_report_file_name,
  a.service_report_file_size,
  CASE
    WHEN lower(coalesce(a.service_report_file_name, '')) LIKE '%\_signed%' ESCAPE '\'
      OR lower(coalesce(a.service_report_file_name, '')) LIKE '%-approved%'
      THEN 'signed'
    WHEN lower(coalesce(a.service_report_file_name, '')) LIKE '%-reviewed%'
      THEN 'reviewed'
    ELSE 'upload'
  END,
  a.service_report_uploaded_by,
  coalesce(a.service_report_uploaded_at, a.updated_at, now())
FROM public.analysis a
WHERE coalesce(btrim(a.service_report_file_path), '') <> ''
ON CONFLICT (analysis_id, file_path) DO NOTHING;
