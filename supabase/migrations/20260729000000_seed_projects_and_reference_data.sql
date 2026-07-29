-- ============================================================
-- 20260729000000_seed_projects_and_reference_data.sql
-- Seed baseline users, clients, services, and projects so the
-- Projects page has visible data from the Supabase project table.
-- ============================================================

DO $$
DECLARE
  lead_user_id uuid;
  member_user_id uuid;
  client_a_id uuid;
  client_b_id uuid;
  service_wgs_id uuid;
  service_amplicon_id uuid;
BEGIN
  -- Ensure baseline staff users exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'maria.santos@example.org') THEN
    INSERT INTO public.users (name, email, role)
    VALUES ('Dr. Maria Santos', 'maria.santos@example.org', 'team_lead');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'rina.delacruz@example.org') THEN
    INSERT INTO public.users (name, email, role)
    VALUES ('Rina Dela Cruz', 'rina.delacruz@example.org', 'team_member');
  END IF;

  SELECT id INTO lead_user_id FROM public.users WHERE email = 'maria.santos@example.org' LIMIT 1;
  SELECT id INTO member_user_id FROM public.users WHERE email = 'rina.delacruz@example.org' LIMIT 1;

  -- Ensure baseline clients exist
  IF NOT EXISTS (SELECT 1 FROM public.client WHERE name = 'Philippine Genome Center') THEN
    INSERT INTO public.client (name, affiliation, contact_info, notes)
    VALUES (
      'Philippine Genome Center',
      'UP System',
      'genomics@example.org',
      'Primary institutional partner for sequencing and bioinformatics support.'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.client WHERE name = 'Visayas Biodiversity Lab') THEN
    INSERT INTO public.client (name, affiliation, contact_info, notes)
    VALUES (
      'Visayas Biodiversity Lab',
      'Regional Research Institute',
      'biodiversity@example.org',
      'Collaborative partner for biodiversity and environmental metagenomics projects.'
    );
  END IF;

  SELECT id INTO client_a_id FROM public.client WHERE name = 'Philippine Genome Center' LIMIT 1;
  SELECT id INTO client_b_id FROM public.client WHERE name = 'Visayas Biodiversity Lab' LIMIT 1;

  -- Ensure baseline services exist
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE name = 'Whole Genome Sequencing') THEN
    INSERT INTO public.service (name, description, category, pipeline_default, active)
    VALUES (
      'Whole Genome Sequencing',
      'End-to-end WGS analysis workflow',
      'WGS',
      'fastp+SPAdes',
      TRUE
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE name = 'Amplicon Metagenomics') THEN
    INSERT INTO public.service (name, description, category, pipeline_default, active)
    VALUES (
      'Amplicon Metagenomics',
      '16S/ITS amplicon sequencing analysis',
      'amplicon',
      'DADA2',
      TRUE
    );
  END IF;

  SELECT id INTO service_wgs_id FROM public.service WHERE name = 'Whole Genome Sequencing' LIMIT 1;
  SELECT id INTO service_amplicon_id FROM public.service WHERE name = 'Amplicon Metagenomics' LIMIT 1;

  -- Seed visible projects
  IF NOT EXISTS (SELECT 1 FROM public.project WHERE name = 'Ocean Microbiome Survey') THEN
    INSERT INTO public.project (
      name,
      client_id,
      service_id,
      status,
      lead_user_id,
      start_date,
      target_delivery_date,
      repository_link
    )
    VALUES (
      'Ocean Microbiome Survey',
      client_a_id,
      service_amplicon_id,
      'ongoing',
      lead_user_id,
      '2026-06-01',
      '2026-08-30',
      'https://github.com/example/ocean-microbiome'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.project WHERE name = 'Rice Pathogen Genomics') THEN
    INSERT INTO public.project (
      name,
      client_id,
      service_id,
      status,
      lead_user_id,
      start_date,
      target_delivery_date,
      repository_link
    )
    VALUES (
      'Rice Pathogen Genomics',
      client_b_id,
      service_wgs_id,
      'for_approval',
      member_user_id,
      '2026-05-15',
      '2026-07-31',
      'https://github.com/example/rice-pathogen'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.project WHERE name = 'Coral Reef Metabarcoding') THEN
    INSERT INTO public.project (
      name,
      client_id,
      service_id,
      status,
      lead_user_id,
      start_date,
      target_delivery_date,
      repository_link
    )
    VALUES (
      'Coral Reef Metabarcoding',
      client_b_id,
      service_amplicon_id,
      'completed',
      lead_user_id,
      '2026-02-01',
      '2026-04-30',
      'https://github.com/example/coral-reef'
    );
  END IF;
END $$;
