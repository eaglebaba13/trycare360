
-- Phase 2.1 — Enterprise CMS foundation

INSERT INTO public.permissions (code, resource, action, description)
VALUES ('cms:manage', 'cms', 'manage', 'Manage CMS content (pages, blog, media, catalog)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, 'cms:manage' FROM (VALUES ('super_admin'),('platform_admin'),('corporate_admin'),('admin')) v(r)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_manage_cms(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON rp.role_code = ur.role_code
            WHERE ur.user_id = _user_id
              AND rp.permission_code = 'cms:manage'
              AND (ur.valid_to IS NULL OR ur.valid_to > now())
              AND (ur.tenant_id IS NULL OR ur.tenant_id = _tenant_id)
          ));
$$;

CREATE TYPE public.cms_status AS ENUM ('draft','scheduled','published','archived');
CREATE TYPE public.cms_appointment_status AS ENUM ('new','contacted','scheduled','cancelled','converted');

-- 1. Sites
CREATE TABLE public.cms_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT NOT NULL DEFAULT 'TryCare360',
  tagline TEXT, logo_url TEXT, favicon_url TEXT,
  primary_color TEXT, accent_color TEXT,
  contact_email TEXT, contact_phone TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  socials JSONB DEFAULT '{}'::jsonb,
  default_seo JSONB DEFAULT '{}'::jsonb,
  tracking JSONB DEFAULT '{}'::jsonb,
  robots_directives TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_sites TO authenticated;
GRANT ALL ON public.cms_sites TO service_role;
ALTER TABLE public.cms_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_sites_anon_read ON public.cms_sites FOR SELECT TO anon USING (is_active = true);
CREATE POLICY cms_sites_auth_read ON public.cms_sites FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_sites_manage ON public.cms_sites FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_sites_touch BEFORE UPDATE ON public.cms_sites FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 2. Menus
CREATE TABLE public.cms_navigation_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, location)
);
GRANT SELECT ON public.cms_navigation_menus TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_navigation_menus TO authenticated;
GRANT ALL ON public.cms_navigation_menus TO service_role;
ALTER TABLE public.cms_navigation_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_menu_anon_read ON public.cms_navigation_menus FOR SELECT TO anon USING (is_active = true);
CREATE POLICY cms_menu_auth_read ON public.cms_navigation_menus FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_menu_manage ON public.cms_navigation_menus FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_menu_touch BEFORE UPDATE ON public.cms_navigation_menus FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 3. Block types
CREATE TABLE public.cms_block_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_block_types TO anon, authenticated;
GRANT ALL ON public.cms_block_types TO service_role;
ALTER TABLE public.cms_block_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_block_types_read ON public.cms_block_types FOR SELECT USING (true);
CREATE POLICY cms_block_types_admin ON public.cms_block_types FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.cms_block_types (code, name, category, description, icon, sort_order) VALUES
  ('hero','Hero','layout','Full-width hero with headline, subhead and CTAs','sparkles',10),
  ('feature_grid','Feature Grid','layout','Grid of feature cards','grid',20),
  ('cta','Call to Action','conversion','CTA banner with primary/secondary buttons','megaphone',30),
  ('testimonials','Testimonials','social','Customer testimonial carousel','quote',40),
  ('faq','FAQ','content','Accordion of frequently asked questions','help',50),
  ('stats','Stats','content','Number stat callouts','bar-chart',60),
  ('media','Media','content','Image or video block','image',70),
  ('rich_text','Rich Text','content','Formatted text block','type',80),
  ('form_embed','Form','conversion','Embedded lead/contact form','form',90),
  ('pricing','Pricing','conversion','Pricing tiers','tag',100),
  ('doctor_list','Doctor List','catalog','List of doctors','user',110),
  ('treatment_list','Treatment List','catalog','List of treatments','stethoscope',120),
  ('product_list','Product List','catalog','List of products','shopping-bag',130),
  ('logo_cloud','Logo Cloud','social','Row of partner/press logos','building',140),
  ('video_hero','Video Hero','layout','Hero with background video','play',150)
ON CONFLICT (code) DO NOTHING;

-- 4. Pages + revisions
CREATE TABLE public.cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.cms_pages(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'default',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  og_image_url TEXT,
  status public.cms_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ, published_at TIMESTAMPTZ,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, path)
);
CREATE INDEX cms_pages_status_idx ON public.cms_pages (tenant_id, status);
GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_pages_anon_read ON public.cms_pages FOR SELECT TO anon USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY cms_pages_auth_read ON public.cms_pages FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_pages_manage ON public.cms_pages FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_pages_touch BEFORE UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER cms_pages_actors BEFORE INSERT OR UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.cms_page_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cms_page_revisions_page_idx ON public.cms_page_revisions (page_id, created_at DESC);
GRANT SELECT, INSERT ON public.cms_page_revisions TO authenticated;
GRANT ALL ON public.cms_page_revisions TO service_role;
ALTER TABLE public.cms_page_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_page_rev_read ON public.cms_page_revisions FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_page_rev_write ON public.cms_page_revisions FOR INSERT TO authenticated WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

-- 5. Blog
CREATE TABLE public.cms_blog_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, name TEXT NOT NULL,
  bio TEXT, avatar_url TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  socials JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_blog_authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_blog_authors TO authenticated;
GRANT ALL ON public.cms_blog_authors TO service_role;
ALTER TABLE public.cms_blog_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_ba_anon_read ON public.cms_blog_authors FOR SELECT TO anon USING (is_active = true);
CREATE POLICY cms_ba_auth_read ON public.cms_blog_authors FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_ba_manage ON public.cms_blog_authors FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_ba_touch BEFORE UPDATE ON public.cms_blog_authors FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

CREATE TABLE public.cms_blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.cms_blog_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL, name TEXT NOT NULL,
  description TEXT, seo JSONB DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_blog_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_blog_categories TO authenticated;
GRANT ALL ON public.cms_blog_categories TO service_role;
ALTER TABLE public.cms_blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_bc_anon_read ON public.cms_blog_categories FOR SELECT TO anon USING (is_active = true);
CREATE POLICY cms_bc_auth_read ON public.cms_blog_categories FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_bc_manage ON public.cms_blog_categories FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_bc_touch BEFORE UPDATE ON public.cms_blog_categories FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

CREATE TABLE public.cms_blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_blog_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_blog_tags TO authenticated;
GRANT ALL ON public.cms_blog_tags TO service_role;
ALTER TABLE public.cms_blog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_bt_anon_read ON public.cms_blog_tags FOR SELECT TO anon USING (true);
CREATE POLICY cms_bt_auth_read ON public.cms_blog_tags FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_bt_manage ON public.cms_blog_tags FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

CREATE TABLE public.cms_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, title TEXT NOT NULL, excerpt TEXT, cover_url TEXT,
  body_blocks JSONB NOT NULL DEFAULT '[]'::jsonb, body_text TEXT,
  author_id UUID REFERENCES public.cms_blog_authors(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.cms_blog_categories(id) ON DELETE SET NULL,
  reading_minutes INT, seo JSONB DEFAULT '{}'::jsonb,
  status public.cms_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ, published_at TIMESTAMPTZ,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX cms_blog_posts_status_idx ON public.cms_blog_posts (tenant_id, status, published_at DESC);
GRANT SELECT ON public.cms_blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_blog_posts TO authenticated;
GRANT ALL ON public.cms_blog_posts TO service_role;
ALTER TABLE public.cms_blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_bp_anon_read ON public.cms_blog_posts FOR SELECT TO anon USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY cms_bp_auth_read ON public.cms_blog_posts FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_bp_manage ON public.cms_blog_posts FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_bp_touch BEFORE UPDATE ON public.cms_blog_posts FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER cms_bp_actors BEFORE INSERT OR UPDATE ON public.cms_blog_posts FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.cms_blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.cms_blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.cms_blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
GRANT SELECT ON public.cms_blog_post_tags TO anon, authenticated;
GRANT INSERT, DELETE ON public.cms_blog_post_tags TO authenticated;
GRANT ALL ON public.cms_blog_post_tags TO service_role;
ALTER TABLE public.cms_blog_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_bpt_read ON public.cms_blog_post_tags FOR SELECT USING (true);
CREATE POLICY cms_bpt_manage ON public.cms_blog_post_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cms_blog_posts p WHERE p.id = post_id AND public.can_manage_cms(auth.uid(), p.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cms_blog_posts p WHERE p.id = post_id AND public.can_manage_cms(auth.uid(), p.tenant_id)));

-- 6. Media
CREATE TABLE public.cms_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL, bucket TEXT NOT NULL DEFAULT 'media',
  mime_type TEXT, width INT, height INT, size_bytes BIGINT,
  alt_text TEXT, caption TEXT,
  focal_point JSONB DEFAULT '{"x":0.5,"y":0.5}'::jsonb,
  variants JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  folder TEXT, is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cms_media_folder_idx ON public.cms_media_assets (tenant_id, folder);
GRANT SELECT ON public.cms_media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_media_assets TO authenticated;
GRANT ALL ON public.cms_media_assets TO service_role;
ALTER TABLE public.cms_media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_media_anon_read ON public.cms_media_assets FOR SELECT TO anon USING (is_public = true);
CREATE POLICY cms_media_auth_read ON public.cms_media_assets FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_media_manage ON public.cms_media_assets FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_media_touch BEFORE UPDATE ON public.cms_media_assets FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 7. Doctors
CREATE TABLE public.cms_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, name TEXT NOT NULL, title TEXT, bio TEXT,
  credentials TEXT[] DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  photo_url TEXT, gallery JSONB DEFAULT '[]'::jsonb, clinics JSONB DEFAULT '[]'::jsonb,
  years_experience INT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  seo JSONB DEFAULT '{}'::jsonb,
  status public.cms_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_doctors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_doctors TO authenticated;
GRANT ALL ON public.cms_doctors TO service_role;
ALTER TABLE public.cms_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_dr_anon_read ON public.cms_doctors FOR SELECT TO anon USING (status = 'published');
CREATE POLICY cms_dr_auth_read ON public.cms_doctors FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_dr_manage ON public.cms_doctors FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_dr_touch BEFORE UPDATE ON public.cms_doctors FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 8. Treatments
CREATE TABLE public.cms_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, name TEXT NOT NULL, category TEXT, summary TEXT,
  description_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,
  faq JSONB DEFAULT '[]'::jsonb,
  before_after JSONB DEFAULT '[]'::jsonb,
  cover_url TEXT, gallery JSONB DEFAULT '[]'::jsonb,
  price_from NUMERIC(12,2), price_to NUMERIC(12,2), price_currency TEXT DEFAULT 'INR',
  duration_minutes INT,
  seo JSONB DEFAULT '{}'::jsonb,
  status public.cms_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_treatments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_treatments TO authenticated;
GRANT ALL ON public.cms_treatments TO service_role;
ALTER TABLE public.cms_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_tr_anon_read ON public.cms_treatments FOR SELECT TO anon USING (status = 'published');
CREATE POLICY cms_tr_auth_read ON public.cms_treatments FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_tr_manage ON public.cms_treatments FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_tr_touch BEFORE UPDATE ON public.cms_treatments FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

CREATE TABLE public.cms_treatment_doctors (
  treatment_id UUID NOT NULL REFERENCES public.cms_treatments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.cms_doctors(id) ON DELETE CASCADE,
  PRIMARY KEY (treatment_id, doctor_id)
);
GRANT SELECT ON public.cms_treatment_doctors TO anon, authenticated;
GRANT INSERT, DELETE ON public.cms_treatment_doctors TO authenticated;
GRANT ALL ON public.cms_treatment_doctors TO service_role;
ALTER TABLE public.cms_treatment_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_td_read ON public.cms_treatment_doctors FOR SELECT USING (true);
CREATE POLICY cms_td_manage ON public.cms_treatment_doctors FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cms_treatments t WHERE t.id = treatment_id AND public.can_manage_cms(auth.uid(), t.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cms_treatments t WHERE t.id = treatment_id AND public.can_manage_cms(auth.uid(), t.tenant_id)));

-- 9. Franchise
CREATE TABLE public.cms_franchise_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, title TEXT NOT NULL, tier TEXT, summary TEXT,
  description_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  investment_min NUMERIC(14,2), investment_max NUMERIC(14,2), currency TEXT DEFAULT 'INR',
  area_sqft_min INT, area_sqft_max INT,
  cities TEXT[] DEFAULT ARRAY[]::TEXT[],
  benefits JSONB DEFAULT '[]'::jsonb,
  brochure_url TEXT, cover_url TEXT,
  seo JSONB DEFAULT '{}'::jsonb,
  status public.cms_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_franchise_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_franchise_offers TO authenticated;
GRANT ALL ON public.cms_franchise_offers TO service_role;
ALTER TABLE public.cms_franchise_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_fr_anon_read ON public.cms_franchise_offers FOR SELECT TO anon USING (status = 'published');
CREATE POLICY cms_fr_auth_read ON public.cms_franchise_offers FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_fr_manage ON public.cms_franchise_offers FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_fr_touch BEFORE UPDATE ON public.cms_franchise_offers FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 10. Academy
CREATE TABLE public.cms_academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, title TEXT NOT NULL, subtitle TEXT, level TEXT, duration TEXT, summary TEXT,
  outline JSONB DEFAULT '[]'::jsonb,
  faculty JSONB DEFAULT '[]'::jsonb,
  cover_url TEXT, brochure_url TEXT,
  price NUMERIC(12,2), currency TEXT DEFAULT 'INR',
  seo JSONB DEFAULT '{}'::jsonb,
  status public.cms_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_academy_courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_academy_courses TO authenticated;
GRANT ALL ON public.cms_academy_courses TO service_role;
ALTER TABLE public.cms_academy_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_ac_anon_read ON public.cms_academy_courses FOR SELECT TO anon USING (status = 'published');
CREATE POLICY cms_ac_auth_read ON public.cms_academy_courses FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_ac_manage ON public.cms_academy_courses FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_ac_touch BEFORE UPDATE ON public.cms_academy_courses FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 11. Products
CREATE TABLE public.cms_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL, name TEXT NOT NULL, brand TEXT, category TEXT, short_description TEXT,
  description_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ingredients JSONB DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,
  usage TEXT,
  cover_url TEXT, gallery JSONB DEFAULT '[]'::jsonb,
  price NUMERIC(12,2), compare_at_price NUMERIC(12,2), currency TEXT DEFAULT 'INR',
  cta_url TEXT,
  seo JSONB DEFAULT '{}'::jsonb,
  status public.cms_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT ON public.cms_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_products TO authenticated;
GRANT ALL ON public.cms_products TO service_role;
ALTER TABLE public.cms_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_pr_anon_read ON public.cms_products FOR SELECT TO anon USING (status = 'published');
CREATE POLICY cms_pr_auth_read ON public.cms_products FOR SELECT TO authenticated USING (status = 'published' OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_pr_manage ON public.cms_products FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_pr_touch BEFORE UPDATE ON public.cms_products FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 12. Redirects
CREATE TABLE public.cms_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_path TEXT NOT NULL, to_path TEXT NOT NULL,
  status_code INT NOT NULL DEFAULT 301,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, from_path)
);
GRANT SELECT ON public.cms_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_redirects TO authenticated;
GRANT ALL ON public.cms_redirects TO service_role;
ALTER TABLE public.cms_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_rd_anon_read ON public.cms_redirects FOR SELECT TO anon USING (is_active = true);
CREATE POLICY cms_rd_auth_read ON public.cms_redirects FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_rd_manage ON public.cms_redirects FOR ALL TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_rd_touch BEFORE UPDATE ON public.cms_redirects FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 13. Appointment requests
CREATE TABLE public.cms_appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, city TEXT,
  treatment_slug TEXT, doctor_slug TEXT,
  preferred_at TIMESTAMPTZ, message TEXT,
  source TEXT DEFAULT 'website',
  utm JSONB DEFAULT '{}'::jsonb,
  status public.cms_appointment_status NOT NULL DEFAULT 'new',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cms_appt_status_idx ON public.cms_appointment_requests (tenant_id, status, created_at DESC);
GRANT INSERT ON public.cms_appointment_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_appointment_requests TO authenticated;
GRANT ALL ON public.cms_appointment_requests TO service_role;
ALTER TABLE public.cms_appointment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY cms_appt_anon_insert ON public.cms_appointment_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY cms_appt_auth_insert ON public.cms_appointment_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY cms_appt_auth_read ON public.cms_appointment_requests FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY cms_appt_manage ON public.cms_appointment_requests FOR UPDATE TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));
CREATE POLICY cms_appt_delete ON public.cms_appointment_requests FOR DELETE TO authenticated USING (public.can_manage_cms(auth.uid(), tenant_id));
CREATE TRIGGER cms_appt_touch BEFORE UPDATE ON public.cms_appointment_requests FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- 14. Search sync
CREATE OR REPLACE FUNCTION public.cms_sync_search()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  et TEXT := TG_ARGV[0]; base_url TEXT; title TEXT; subtitle TEXT; keywords TEXT;
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  title := COALESCE(to_jsonb(NEW)->>'title', to_jsonb(NEW)->>'name');
  subtitle := COALESCE(to_jsonb(NEW)->>'excerpt', to_jsonb(NEW)->>'summary', to_jsonb(NEW)->>'short_description');
  keywords := COALESCE(to_jsonb(NEW)->>'category', '');
  base_url := CASE et
    WHEN 'cms_page' THEN COALESCE(to_jsonb(NEW)->>'path', '/')
    WHEN 'cms_blog_post' THEN '/blog/' || (to_jsonb(NEW)->>'slug')
    WHEN 'cms_doctor' THEN '/doctors/' || (to_jsonb(NEW)->>'slug')
    WHEN 'cms_treatment' THEN '/treatments/' || (to_jsonb(NEW)->>'slug')
    WHEN 'cms_franchise' THEN '/franchise/' || (to_jsonb(NEW)->>'slug')
    WHEN 'cms_course' THEN '/academy/' || (to_jsonb(NEW)->>'slug')
    WHEN 'cms_product' THEN '/products/' || (to_jsonb(NEW)->>'slug')
    ELSE '/'
  END;
  PERFORM public.index_search_entity(NEW.tenant_id, et, NEW.id::text, title, subtitle, NULL, keywords, base_url, '{}'::jsonb);
  RETURN NEW;
END $$;

CREATE TRIGGER cms_pages_search AFTER INSERT OR UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_page');
CREATE TRIGGER cms_blog_posts_search AFTER INSERT OR UPDATE ON public.cms_blog_posts FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_blog_post');
CREATE TRIGGER cms_doctors_search AFTER INSERT OR UPDATE ON public.cms_doctors FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_doctor');
CREATE TRIGGER cms_treatments_search AFTER INSERT OR UPDATE ON public.cms_treatments FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_treatment');
CREATE TRIGGER cms_franchise_search AFTER INSERT OR UPDATE ON public.cms_franchise_offers FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_franchise');
CREATE TRIGGER cms_academy_search AFTER INSERT OR UPDATE ON public.cms_academy_courses FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_course');
CREATE TRIGGER cms_products_search AFTER INSERT OR UPDATE ON public.cms_products FOR EACH ROW EXECUTE FUNCTION public.cms_sync_search('cms_product');
