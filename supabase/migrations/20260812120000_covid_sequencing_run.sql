-- COVID Run Summary (SARS-CoV-2 genomic surveillance).
-- Separate from client sequence analysis (`analysis` / Service Report Tracker).
-- Seeded from COVID_SampleTracker_v2_CLEAN.xlsx → Run_Summary only.

CREATE TABLE IF NOT EXISTS public.covid_sequencing_run (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_number integer NOT NULL,
  run_id text NULL,
  sequencer text NULL,
  extraction_number text NULL,
  date_received date NULL,
  date_loaded date NULL,
  samples_sequenced integer NOT NULL DEFAULT 0,
  lineage_assigned integer NULL,
  uploaded_gisaid boolean NOT NULL DEFAULT false,
  uploaded_islap boolean NOT NULL DEFAULT false,
  comments text NULL,
  review_flag text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT covid_sequencing_run_pkey PRIMARY KEY (id),
  CONSTRAINT covid_sequencing_run_run_number_key UNIQUE (run_number),
  CONSTRAINT covid_sequencing_run_samples_nonneg
    CHECK (samples_sequenced >= 0),
  CONSTRAINT covid_sequencing_run_lineage_nonneg
    CHECK (lineage_assigned IS NULL OR lineage_assigned >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS covid_sequencing_run_run_id_uidx
  ON public.covid_sequencing_run (run_id)
  WHERE run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_covid_sequencing_run_date_loaded
  ON public.covid_sequencing_run (date_loaded);

CREATE INDEX IF NOT EXISTS idx_covid_sequencing_run_sequencer
  ON public.covid_sequencing_run (sequencer);

ALTER TABLE public.covid_sequencing_run ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "covid_sequencing_run is fully accessible to staff"
  ON public.covid_sequencing_run;
CREATE POLICY "covid_sequencing_run is fully accessible to staff"
  ON public.covid_sequencing_run FOR ALL TO authenticated
  USING (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]))
  WITH CHECK (get_user_role() = ANY (ARRAY['team_lead'::text, 'team_member'::text]));

DROP TRIGGER IF EXISTS set_updated_at ON public.covid_sequencing_run;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.covid_sequencing_run
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Idempotent seed from Run_Summary (85 rows).
INSERT INTO public.covid_sequencing_run (
  run_number, run_id, sequencer, extraction_number, date_received, date_loaded,
  samples_sequenced, lineage_assigned, uploaded_gisaid, uploaded_islap, comments, review_flag
) VALUES
  (1, 'NS_001', 'NextSeq1000', '1', NULL, '2022-01-27', 93, 90, true, true, NULL, NULL),
  (4, 'NS_004', 'NextSeq1000', '2', '2022-02-16', '2022-02-18', 90, 88, true, true, NULL, NULL),
  (5, 'NS_005', 'NextSeq1000', '3', '2022-02-23', '2022-02-25', 80, 77, true, true, NULL, NULL),
  (7, 'NS_007', 'NextSeq1000', '4', '2022-03-02', '2022-03-04', 84, 69, true, true, NULL, NULL),
  (8, 'NS_008', 'NextSeq1000', '5', '2022-03-09', '2022-03-11', 26, 23, true, true, NULL, NULL),
  (9, 'NS_009', 'NextSeq1000', '6', '2022-03-16', '2022-03-17', 18, 13, true, true, NULL, NULL),
  (10, 'NS_0010', 'NextSeq1000', '7', '2022-03-23', '2022-03-25', 12, 9, true, true, NULL, NULL),
  (11, 'NS_0011', 'NextSeq1000', '8, 9', '2022-03-30', '2022-04-08', 15, 13, true, true, NULL, NULL),
  (12, 'IS_0011', 'iSeq100', '10', '2022-04-21', '2022-04-22', 6, 5, true, true, NULL, NULL),
  (13, 'IS_0012', 'iSeq100', '11', '2022-04-28', '2022-04-29', 9, 9, true, true, NULL, NULL),
  (14, 'IS_0013', 'iSeq100', '12', '2022-05-12', '2022-05-13', 7, 5, true, true, NULL, NULL),
  (16, 'IS_0015', 'iSeq100', '13', '2022-05-19', '2022-05-25', 10, 9, true, true, NULL, NULL),
  (18, 'IS_0016', 'iSeq100', '14', '2022-06-09', '2022-06-10', 13, 8, true, true, NULL, NULL),
  (19, 'NS_0014', 'NextSeq1000', '15', '2022-06-16', '2022-06-17', 41, 41, true, true, NULL, NULL),
  (20, 'NS_0016', 'NextSeq1000', '16', '2022-06-23', '2022-06-24', 57, 51, false, true, NULL, NULL),
  (21, 'NS_0017', 'NextSeq1000', '17', '2022-06-30', '2022-07-01', 129, 108, false, true, NULL, NULL),
  (22, 'NS_0018', 'NextSeq1000', '18', '2022-07-07', '2022-07-08', 152, 72, false, true, NULL, NULL),
  (23, 'NS_0019', 'NextSeq1000', '18', '2022-07-07', '2022-07-13', 80, 76, false, true, NULL, NULL),
  (24, 'NS_0020', 'NextSeq1000', '19', '2022-07-14', '2022-07-15', 257, 248, false, true, NULL, NULL),
  (25, 'NS_0021', 'NextSeq1000', '20', '2022-07-21', '2022-07-22', 263, 256, false, true, NULL, NULL),
  (26, 'NS_0022', 'NextSeq1000', '21', '2022-07-28', '2022-07-29', 322, 318, false, true, NULL, NULL),
  (27, 'NS_0023', 'NextSeq1000', '22', '2022-08-04', '2022-08-05', 278, 274, true, true, NULL, NULL),
  (28, 'NS_0024', 'NextSeq1000', '23', '2022-08-11', '2022-08-12', 351, 344, true, true, NULL, NULL),
  (29, 'NS_0025', 'NextSeq1000', '24', '2022-08-18', '2022-08-19', 308, 302, true, true, NULL, NULL),
  (30, 'NS_0026', 'NextSeq1000', '25', '2022-08-25', '2022-08-26', 229, 216, true, true, NULL, NULL),
  (31, 'NS_0027', 'NextSeq1000', '26', '2022-09-01', '2022-09-02', 231, 219, true, true, NULL, NULL),
  (32, 'NS_0028', 'NextSeq1000', '27', '2022-09-08', '2022-09-09', 134, 131, true, true, NULL, NULL),
  (33, 'NS_0029', 'NextSeq1000', '28', '2022-09-15', '2022-09-16', 112, 107, true, true, NULL, NULL),
  (34, 'NS_0030', 'NextSeq1000', '29', '2022-09-22', '2022-09-23', 101, 92, true, true, NULL, NULL),
  (35, 'NS_0031', 'NextSeq1000', '30', '2022-09-29', '2022-09-30', 70, 69, true, true, NULL, NULL),
  (36, 'NS_0032', 'NextSeq1000', '31', '2022-10-06', '2022-10-07', 78, 77, true, true, NULL, NULL),
  (37, 'NS_0033', 'NextSeq1000', '32', '2022-10-13', '2022-10-14', 151, 140, true, true, NULL, NULL),
  (38, 'NS_0034', 'NextSeq1000', '33', '2022-10-20', '2022-10-21', 224, 201, true, true, NULL, NULL),
  (39, 'NS_0035', 'NextSeq1000', '34', '2022-10-27', '2022-10-28', 240, 231, true, true, NULL, NULL),
  (40, 'NS_0036', 'NextSeq1000', '35', '2022-11-03', '2022-11-04', 128, 124, true, true, NULL, NULL),
  (41, 'NS_0037', 'NextSeq1000', '36', '2022-11-10', '2022-11-11', 196, 185, true, true, NULL, NULL),
  (42, 'NS_0038', 'NextSeq1000', '37', '2022-11-17', '2022-11-18', 192, 185, true, true, NULL, NULL),
  (43, 'NS_0039', 'NextSeq1000', '38', '2022-11-24', '2022-11-25', 78, 75, true, true, NULL, NULL),
  (44, 'IS_0019, IS_0020, IS_0021', 'iSeq100', '39', '2022-12-01', '2022-12-02', 62, 62, true, true, NULL, NULL),
  (45, 'IS_0022', 'iSeq100', '40', '2022-12-07', '2022-12-09', 76, 74, true, true, 'Please check if ISeq Run', NULL),
  (46, 'IS_0023', 'iSeq100', '41', '2022-12-14', '2022-12-15', 27, 26, true, true, NULL, NULL),
  (47, 'NS_0040', 'NextSeq1000', '42', '2022-12-22', '2022-12-23', 74, 74, true, true, NULL, NULL),
  (48, 'IS_0026', 'iSeq100', '43', '2022-12-28', '2022-12-29', 24, 24, true, true, NULL, NULL),
  (49, 'IS_0027', 'NextSeq1000', '44', '2023-01-05', '2023-01-06', 14, 14, true, true, NULL, NULL),
  (50, 'IS_0028', 'iSeq100', '45', '2023-01-12', '2023-01-13', 27, 23, false, true, NULL, NULL),
  (52, 'IS_0029', 'iSeq100', '46, 47', '2023-01-19', '2023-01-27', 21, 20, false, true, NULL, NULL),
  (53, 'IS_0033', 'iSeq100', '48, 49', '2023-02-09', '2023-02-10', 14, 9, false, true, NULL, NULL),
  (54, 'IS_0035', 'iSeq100', '50, 51', '2023-02-23', '2023-02-24', 13, 13, false, true, NULL, NULL),
  (55, 'IS_0037', 'iSeq100', '53', '2023-03-02', '2023-03-03', 7, 7, false, true, NULL, NULL),
  (56, 'IS_0039', 'iSeq100', '53, 54, and 55', '2023-03-23', '2023-03-24', 13, 12, false, true, NULL, NULL),
  (57, 'NS_0044', 'NextSeq1000', '56, 57, and 58', '2023-04-14', '2023-04-15', 45, 44, false, true, NULL, NULL),
  (58, 'NS_0045', 'NextSeq1000', '59, 60', '2023-05-28', '2023-05-29', 79, 77, false, false, NULL, NULL),
  (59, 'NS_0047', 'NextSeq1000', '61', '2023-05-05', '2023-05-06', 53, 53, false, false, NULL, NULL),
  (60, 'NS_0049', 'NextSeq1000', '62', '2023-05-13', '2023-05-14', 102, 100, false, false, NULL, NULL),
  (61, 'NS_0050', 'NextSeq1000', '63', '2023-05-19', '2023-05-20', 126, 122, false, false, NULL, NULL),
  (62, 'NS_0052', 'NextSeq1000', '64', '2023-05-26', '2023-05-27', 139, 137, false, false, NULL, NULL),
  (63, 'NS_0053', 'NextSeq1000', '65', '2023-06-01', '2023-06-02', 152, 148, false, false, NULL, NULL),
  (64, 'NS_0054', 'NextSeq1000', '66', '2023-06-08', '2023-06-09', 74, 73, false, false, NULL, NULL),
  (65, 'IS_0046', 'iSeq100', '67', '2023-06-14', '2023-06-15', 30, 30, false, false, NULL, NULL),
  (66, 'IS_0047', 'iSeq100', '68', '2023-06-22', '2023-06-23', 43, 43, false, false, NULL, NULL),
  (67, 'IS_0048', 'iSeq100', '69, 70', '2023-07-06', '2023-07-07', 93, 83, false, false, NULL, NULL),
  (68, 'IS_0049', 'iSeq100', '71, 72', '2023-07-06', '2023-07-07', 38, 32, false, false, NULL, NULL),
  (69, 'IS_0050', 'iSeq100', NULL, '2023-08-03', '2023-08-04', 31, 31, false, false, NULL, NULL),
  (70, 'NS_0055', 'iSeq100', NULL, '2023-08-23', '2023-08-24', 14, 14, false, false, NULL, NULL),
  (71, 'IS_0053', 'iSeq100', NULL, '2023-09-13', '2023-09-15', 5, 5, false, false, NULL, NULL),
  (72, 'NS_0057', 'NextSeq1000', NULL, '2023-10-19', '2023-10-20', 33, 32, false, false, NULL, NULL),
  (73, 'NS_0058', 'NextSeq1000', NULL, '2023-11-15', '2023-11-16', 26, 26, false, false, NULL, NULL),
  (74, 'NS_0059', 'NextSeq1000', NULL, '2023-12-14', '2023-12-15', 83, 74, false, false, NULL, NULL),
  (75, 'NS_0060', 'NextSeq1000', NULL, '2024-01-11', '2023-12-01', 290, 254, false, false, NULL, 'loaded before received'),
  (76, 'NS_0061', 'NextSeq1000', NULL, '2024-01-18', '2024-01-19', 129, 115, false, false, NULL, NULL),
  (77, 'NS_0062', 'NextSeq1000', NULL, '2024-03-09', '2024-03-08', 46, 40, false, false, NULL, 'loaded before received'),
  (78, 'NS_0063', 'NextSeq1000', NULL, '2024-03-23', '2024-03-24', 3, 3, false, false, NULL, NULL),
  (79, 'IS_0056', 'iSeq100', NULL, '2024-04-18', '2024-04-19', 2, 2, false, false, NULL, NULL),
  (80, 'NS_0065', 'NextSeq1000', NULL, '2024-05-26', '2024-05-27', 23, 22, false, false, NULL, NULL),
  (81, 'NS_0066', 'NextSeq1000', NULL, '2024-06-20', '2024-06-21', 142, 119, false, false, NULL, NULL),
  (82, 'NS_0067', 'NextSeq1000', NULL, '2024-07-18', '2024-07-19', 134, 116, false, false, NULL, NULL),
  (83, 'NS_0068', 'NextSeq1000', NULL, '2024-08-29', '2024-08-30', 23, 23, false, false, NULL, NULL),
  (84, 'NS_0070', 'NextSeq1000', NULL, '2024-10-16', '2024-10-18', 7, 6, false, false, NULL, NULL),
  (85, 'NS_0071', 'NextSeq1000', NULL, '2024-10-21', '2024-11-22', 61, 60, false, false, NULL, NULL),
  (86, 'NS_0073', 'NextSeq1000', NULL, '2025-01-19', '2025-01-21', 62, 58, false, false, NULL, NULL),
  (87, 'IS_0059', 'iSeq100', NULL, '2025-06-10', '2025-06-11', 4, 4, false, false, NULL, NULL),
  (88, 'IS_0060', 'iSeq100', NULL, '2025-07-10', '2025-07-11', 27, 26, false, false, NULL, NULL),
  (89, 'IS_0062', 'iSeq100', NULL, '2025-08-22', '2025-08-26', 49, 44, false, false, NULL, NULL),
  (90, NULL, NULL, NULL, '2025-11-06', '2025-11-07', 5, 4, false, false, NULL, 'run ID not recorded; sequencer not recorded'),
  (91, NULL, NULL, NULL, '2026-02-02', NULL, 2, 2, false, false, NULL, 'run ID not recorded; sequencer not recorded; no load date')
ON CONFLICT (run_number) DO NOTHING;
