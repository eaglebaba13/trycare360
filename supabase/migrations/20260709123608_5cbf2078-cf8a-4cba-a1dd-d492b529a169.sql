
-- Phase 2.1b: Enterprise CMS Enhancement schema

-- Extend cms_status enum with in_review
DO $$ BEGIN
  ALTER TYPE public.cms_status ADD VALUE IF NOT EXISTS 'in_review' BEFORE 'scheduled';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend cms_pages
ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_score integer,
  ADD COLUMN IF NOT EXISTS campaign_id text,
  ADD COLUMN IF NOT EXISTS utm_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS goal_event text;

-- Media folders
CREATE TABLE IF NOT EXISTS public.cms_media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  parent_id uuid REFERENCES public.cms_media_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_media_folders TO authenticated;
GRANT ALL ON public.cms_media_folders TO service_role;
ALTER TABLE public.cms_media_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read media folders" ON public.cms_media_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "tenant write media folders" ON public.cms_media_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Section library
CREATE TABLE IF NOT EXISTS public.cms_section_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  category text,
  description text,
  thumbnail_url text,
  block jsonb NOT NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_section_library TO authenticated;
GRANT ALL ON public.cms_section_library TO service_role;
ALTER TABLE public.cms_section_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read sections" ON public.cms_section_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "write sections" ON public.cms_section_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Page templates
CREATE TABLE IF NOT EXISTS public.cms_page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  vertical text,
  description text,
  thumbnail_url text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_tracking jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_forms text[] NOT NULL DEFAULT ARRAY[]::text[],
  cta_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_global boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_page_templates TO authenticated;
GRANT ALL ON public.cms_page_templates TO service_role;
ALTER TABLE public.cms_page_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read templates" ON public.cms_page_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "write templates" ON public.cms_page_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Page -> Form attachments
CREATE TABLE IF NOT EXISTS public.cms_page_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.form_definitions(id) ON DELETE CASCADE,
  block_id text,
  workflow_id uuid,
  is_primary boolean NOT NULL DEFAULT false,
  conversion_event text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_page_forms TO authenticated;
GRANT SELECT ON public.cms_page_forms TO anon;
GRANT ALL ON public.cms_page_forms TO service_role;
ALTER TABLE public.cms_page_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read page forms" ON public.cms_page_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "read page forms anon" ON public.cms_page_forms FOR SELECT TO anon USING (true);
CREATE POLICY "write page forms" ON public.cms_page_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AB experiments
CREATE TABLE IF NOT EXISTS public.cms_ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  name text NOT NULL,
  variant_a jsonb NOT NULL,
  variant_b jsonb NOT NULL,
  traffic_split integer NOT NULL DEFAULT 50 CHECK (traffic_split BETWEEN 0 AND 100),
  goal_event text,
  status text NOT NULL DEFAULT 'draft',
  winner text,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_ab_experiments TO authenticated;
GRANT SELECT ON public.cms_ab_experiments TO anon;
GRANT ALL ON public.cms_ab_experiments TO service_role;
ALTER TABLE public.cms_ab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ab" ON public.cms_ab_experiments FOR SELECT TO authenticated USING (true);
CREATE POLICY "read ab anon" ON public.cms_ab_experiments FOR SELECT TO anon USING (status='running');
CREATE POLICY "write ab" ON public.cms_ab_experiments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AB assignments
CREATE TABLE IF NOT EXISTS public.cms_ab_assignments (
  id bigserial PRIMARY KEY,
  experiment_id uuid NOT NULL REFERENCES public.cms_ab_experiments(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  variant text NOT NULL,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, visitor_id)
);
GRANT SELECT, INSERT, UPDATE ON public.cms_ab_assignments TO authenticated;
GRANT ALL ON public.cms_ab_assignments TO service_role;
ALTER TABLE public.cms_ab_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ab assign" ON public.cms_ab_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "write ab assign" ON public.cms_ab_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tracking events (analytics)
CREATE TABLE IF NOT EXISTS public.cms_tracking_events (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  page_id uuid,
  event_type text NOT NULL,
  session_id text,
  visitor_id text,
  person_id uuid,
  path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  first_touch jsonb,
  last_touch jsonb,
  user_agent text,
  ip_hash text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_tracking_events_page_time ON public.cms_tracking_events(page_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS cms_tracking_events_campaign ON public.cms_tracking_events(utm_campaign);
GRANT SELECT ON public.cms_tracking_events TO authenticated;
GRANT ALL ON public.cms_tracking_events TO service_role;
ALTER TABLE public.cms_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read tracking" ON public.cms_tracking_events FOR SELECT TO authenticated USING (true);

-- SEO audits
CREATE TABLE IF NOT EXISTS public.cms_seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  score integer NOT NULL,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_by uuid,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_seo_audits_page ON public.cms_seo_audits(page_id, checked_at DESC);
GRANT SELECT, INSERT, DELETE ON public.cms_seo_audits TO authenticated;
GRANT ALL ON public.cms_seo_audits TO service_role;
ALTER TABLE public.cms_seo_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read seo" ON public.cms_seo_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "write seo" ON public.cms_seo_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Publish log (rollback source)
CREATE TABLE IF NOT EXISTS public.cms_page_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  snapshot jsonb NOT NULL,
  actor uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_publish_log_page ON public.cms_page_publish_log(page_id, created_at DESC);
GRANT SELECT, INSERT ON public.cms_page_publish_log TO authenticated;
GRANT ALL ON public.cms_page_publish_log TO service_role;
ALTER TABLE public.cms_page_publish_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read publish log" ON public.cms_page_publish_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "write publish log" ON public.cms_page_publish_log FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.cms_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_cms_folders_updated ON public.cms_media_folders;
CREATE TRIGGER trg_cms_folders_updated BEFORE UPDATE ON public.cms_media_folders FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
DROP TRIGGER IF EXISTS trg_cms_sections_updated ON public.cms_section_library;
CREATE TRIGGER trg_cms_sections_updated BEFORE UPDATE ON public.cms_section_library FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
DROP TRIGGER IF EXISTS trg_cms_templates_updated ON public.cms_page_templates;
CREATE TRIGGER trg_cms_templates_updated BEFORE UPDATE ON public.cms_page_templates FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
DROP TRIGGER IF EXISTS trg_cms_ab_updated ON public.cms_ab_experiments;
CREATE TRIGGER trg_cms_ab_updated BEFORE UPDATE ON public.cms_ab_experiments FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
