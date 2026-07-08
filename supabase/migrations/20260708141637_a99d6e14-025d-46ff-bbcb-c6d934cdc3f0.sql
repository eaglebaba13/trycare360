-- Phase 1.5e — Enterprise Data, Document & Analytics Foundation

-- ============================================================ PERMISSIONS
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('timeline:read','timeline','read','View timeline of any record'),
  ('timeline:write','timeline','write','Post activity entries to a record timeline'),
  ('documents:read','documents','read','View documents'),
  ('documents:write','documents','write','Upload and edit documents'),
  ('documents:delete','documents','delete','Delete documents / versions'),
  ('notes:read','notes','read','View notes on records'),
  ('notes:write','notes','write','Create and edit notes'),
  ('search:global','search','global','Perform global search across modules'),
  ('widgets:read','widgets','read','View dashboard widgets'),
  ('widgets:manage','widgets','manage','Manage dashboard layouts and widgets'),
  ('reports:read','reports','read','View reports and report runs'),
  ('reports:manage','reports','manage','Create, edit and schedule reports'),
  ('reports:run','reports','run','Execute reports and export data'),
  ('analytics:read','analytics','read','View analytics KPIs and snapshots'),
  ('analytics:manage','analytics','manage','Manage analytics KPI definitions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p.code FROM public.permissions p
CROSS JOIN (VALUES ('super_admin'),('corporate_admin')) AS roles(r)
WHERE p.code IN (
  'timeline:read','timeline:write','documents:read','documents:write','documents:delete',
  'notes:read','notes:write','search:global','widgets:read','widgets:manage',
  'reports:read','reports:manage','reports:run','analytics:read','analytics:manage'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p.code FROM public.permissions p
CROSS JOIN (VALUES
  ('center_manager'),('doctor'),('hair_consultant'),('skin_consultant'),('nutritionist'),
  ('therapist'),('telecaller'),('sales_executive'),('marketing'),('accounts'),('hr'),
  ('inventory_manager'),('purchase_manager')
) AS roles(r)
WHERE p.code IN (
  'timeline:read','timeline:write','documents:read','documents:write',
  'notes:read','notes:write','search:global','widgets:read','reports:read','reports:run','analytics:read'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ============================================================ 1. TIMELINE
CREATE TABLE public.timeline_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label TEXT,
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
CREATE INDEX timeline_entity_idx ON public.timeline_events (tenant_id, entity_type, entity_id, ts DESC);
CREATE INDEX timeline_tenant_ts_idx ON public.timeline_events (tenant_id, ts DESC);
CREATE INDEX timeline_actor_idx ON public.timeline_events (actor_id, ts DESC);
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tl_read"  ON public.timeline_events FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "tl_write" ON public.timeline_events FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'timeline:write', NULL)));

CREATE OR REPLACE FUNCTION public.log_timeline_event(
  _tenant_id UUID, _entity_type TEXT, _entity_id TEXT,
  _event_type TEXT, _title TEXT, _body TEXT DEFAULT NULL, _meta JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id BIGINT;
BEGIN
  INSERT INTO public.timeline_events (tenant_id, entity_type, entity_id, event_type, actor_id, title, body, meta)
  VALUES (_tenant_id, _entity_type, _entity_id, _event_type, auth.uid(), _title, _body, COALESCE(_meta, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.log_timeline_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- ============================================================ 2. DOCUMENTS
CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/',
  category TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_folders TO authenticated;
GRANT ALL ON public.document_folders TO service_role;
CREATE INDEX doc_folder_tenant_idx ON public.document_folders (tenant_id, parent_id);
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "df_read"  ON public.document_folders FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "df_write" ON public.document_folders FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:write', NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:write', NULL)));
CREATE TRIGGER trg_doc_folder_upd BEFORE UPDATE ON public.document_folders FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_doc_folder_act BEFORE INSERT OR UPDATE ON public.document_folders FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  entity_type TEXT,
  entity_id TEXT,
  current_version INT NOT NULL DEFAULT 1,
  ocr_text TEXT,
  signed_by UUID,
  signed_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
CREATE INDEX doc_tenant_folder_idx ON public.documents (tenant_id, folder_id);
CREATE INDEX doc_entity_idx ON public.documents (tenant_id, entity_type, entity_id);
CREATE INDEX doc_category_idx ON public.documents (tenant_id, category);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_read"  ON public.documents FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "doc_write" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:write', NULL)));
CREATE POLICY "doc_upd"   ON public.documents FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:write', NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "doc_del"   ON public.documents FOR DELETE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:delete', NULL)));
CREATE TRIGGER trg_doc_upd BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_doc_act BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dv_read"  ON public.document_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)));
CREATE POLICY "dv_write" ON public.document_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)
    AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:write', NULL))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)));

CREATE TABLE public.document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, color TEXT,
  UNIQUE (tenant_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_tags TO authenticated;
GRANT ALL ON public.document_tags TO service_role;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dt_read"  ON public.document_tags FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "dt_write" ON public.document_tags FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'documents:write', NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.document_tag_map (
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.document_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);
GRANT SELECT, INSERT, DELETE ON public.document_tag_map TO authenticated;
GRANT ALL ON public.document_tag_map TO service_role;
ALTER TABLE public.document_tag_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dtm_all" ON public.document_tag_map FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)));

CREATE TABLE public.document_links (
  id BIGSERIAL PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, DELETE ON public.document_links TO authenticated;
GRANT ALL ON public.document_links TO service_role;
CREATE INDEX doc_links_entity_idx ON public.document_links (entity_type, entity_id);
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dl_all" ON public.document_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND public.has_tenant_access(auth.uid(), d.tenant_id)));

-- ============================================================ 3. NOTES
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  pinned BOOLEAN NOT NULL DEFAULT false,
  mentions UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
CREATE INDEX notes_entity_idx ON public.notes (tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX notes_pinned_idx ON public.notes (tenant_id, pinned) WHERE pinned;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "note_read"  ON public.notes FOR SELECT TO authenticated USING (
  public.has_tenant_access(auth.uid(), tenant_id)
  AND (visibility = 'public' OR created_by = auth.uid() OR auth.uid() = ANY(mentions) OR public.is_super_admin(auth.uid()))
);
CREATE POLICY "note_write" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'notes:write', NULL)));
CREATE POLICY "note_upd"   ON public.notes FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR created_by = auth.uid()))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "note_del"   ON public.notes FOR DELETE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR created_by = auth.uid()));
CREATE TRIGGER trg_notes_upd BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_notes_act BEFORE INSERT OR UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- ============================================================ 4. SEARCH
CREATE TABLE public.search_index (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  title TEXT NOT NULL, subtitle TEXT, body TEXT,
  keywords TEXT, url TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  tsv TSVECTOR,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_index TO authenticated;
GRANT ALL ON public.search_index TO service_role;
CREATE INDEX search_tsv_idx ON public.search_index USING GIN (tsv);
CREATE INDEX search_entity_idx ON public.search_index (tenant_id, entity_type);
ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_read"  ON public.search_index FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "si_write" ON public.search_index FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE OR REPLACE FUNCTION public.search_index_tsv_trg() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.keywords, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.body, '')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_search_tsv BEFORE INSERT OR UPDATE ON public.search_index
  FOR EACH ROW EXECUTE FUNCTION public.search_index_tsv_trg();

CREATE OR REPLACE FUNCTION public.index_search_entity(
  _tenant_id UUID, _entity_type TEXT, _entity_id TEXT,
  _title TEXT, _subtitle TEXT DEFAULT NULL, _body TEXT DEFAULT NULL,
  _keywords TEXT DEFAULT NULL, _url TEXT DEFAULT NULL, _meta JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.search_index (tenant_id, entity_type, entity_id, title, subtitle, body, keywords, url, meta)
  VALUES (_tenant_id, _entity_type, _entity_id, _title, _subtitle, _body, _keywords, _url, COALESCE(_meta, '{}'::jsonb))
  ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE
  SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, body = EXCLUDED.body,
      keywords = EXCLUDED.keywords, url = EXCLUDED.url, meta = EXCLUDED.meta;
END; $$;
GRANT EXECUTE ON FUNCTION public.index_search_entity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_global(
  _tenant_id UUID, _query TEXT, _entity_types TEXT[] DEFAULT NULL, _limit INT DEFAULT 25
) RETURNS TABLE (
  entity_type TEXT, entity_id TEXT, title TEXT, subtitle TEXT, url TEXT, rank REAL
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_tenant_access(auth.uid(), _tenant_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT s.entity_type, s.entity_id, s.title, s.subtitle, s.url,
         ts_rank(s.tsv, plainto_tsquery('simple', _query)) AS rank
  FROM public.search_index s
  WHERE s.tenant_id = _tenant_id
    AND s.tsv @@ plainto_tsquery('simple', _query)
    AND (_entity_types IS NULL OR s.entity_type = ANY(_entity_types))
  ORDER BY rank DESC, s.updated_at DESC
  LIMIT COALESCE(_limit, 25);
END; $$;
GRANT EXECUTE ON FUNCTION public.search_global(UUID, TEXT, TEXT[], INT) TO authenticated, service_role;

-- ============================================================ 5. WIDGETS
CREATE TABLE public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'role',
  role_code TEXT, user_id UUID,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_layouts TO authenticated;
GRANT ALL ON public.dashboard_layouts TO service_role;
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashl_read"  ON public.dashboard_layouts FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "dashl_write" ON public.dashboard_layouts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'widgets:manage', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'widgets:manage', NULL));
CREATE TRIGGER trg_dashl_upd BEFORE UPDATE ON public.dashboard_layouts FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_dashl_act BEFORE INSERT OR UPDATE ON public.dashboard_layouts FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES public.dashboard_layouts(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL, title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position JSONB NOT NULL DEFAULT '{"x":0,"y":0,"w":4,"h":3}'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_widgets TO authenticated;
GRANT ALL ON public.dashboard_widgets TO service_role;
CREATE INDEX dw_layout_idx ON public.dashboard_widgets (layout_id, display_order);
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dw_read"  ON public.dashboard_widgets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dashboard_layouts l WHERE l.id = layout_id
    AND (l.tenant_id IS NULL OR public.has_tenant_access(auth.uid(), l.tenant_id))));
CREATE POLICY "dw_write" ON public.dashboard_widgets FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'widgets:manage', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'widgets:manage', NULL));
CREATE TRIGGER trg_dw_upd BEFORE UPDATE ON public.dashboard_widgets FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_dw_act BEFORE INSERT OR UPDATE ON public.dashboard_widgets FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- ============================================================ 6. REPORTS
CREATE TABLE public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  module TEXT, description TEXT,
  data_source TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_definitions TO authenticated;
GRANT ALL ON public.report_definitions TO service_role;
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rd_read"  ON public.report_definitions FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "rd_write" ON public.report_definitions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'reports:manage', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'reports:manage', NULL));
CREATE TRIGGER trg_rd_upd BEFORE UPDATE ON public.report_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_rd_act BEFORE INSERT OR UPDATE ON public.report_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.report_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  format TEXT NOT NULL DEFAULT 'pdf',
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INT,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  error TEXT,
  requested_by UUID,
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_runs TO authenticated;
GRANT ALL ON public.report_runs TO service_role;
CREATE INDEX rr_report_idx ON public.report_runs (report_id, created_at DESC);
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_read"  ON public.report_runs FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "rr_write" ON public.report_runs FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'reports:run', NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.report_definitions(id) ON DELETE CASCADE,
  cron TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'pdf',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ, next_run_at TIMESTAMPTZ,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO authenticated;
GRANT ALL ON public.report_schedules TO service_role;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_read"  ON public.report_schedules FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "rs_write" ON public.report_schedules FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'reports:manage', NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER trg_rs_upd BEFORE UPDATE ON public.report_schedules FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_rs_act BEFORE INSERT OR UPDATE ON public.report_schedules FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- ============================================================ 7. ANALYTICS
CREATE TABLE public.analytics_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT, formula TEXT, data_source TEXT,
  target NUMERIC, direction TEXT DEFAULT 'higher',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_kpis TO authenticated;
GRANT ALL ON public.analytics_kpis TO service_role;
ALTER TABLE public.analytics_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi_read"  ON public.analytics_kpis FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "kpi_write" ON public.analytics_kpis FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'analytics:manage', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'analytics:manage', NULL));
CREATE TRIGGER trg_kpi_upd BEFORE UPDATE ON public.analytics_kpis FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_kpi_act BEFORE INSERT OR UPDATE ON public.analytics_kpis FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.analytics_snapshots (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kpi_code TEXT NOT NULL,
  period TEXT NOT NULL,
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  value NUMERIC NOT NULL, target NUMERIC,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_snapshots TO authenticated;
GRANT ALL ON public.analytics_snapshots TO service_role;
CREATE INDEX asnap_kpi_idx ON public.analytics_snapshots (tenant_id, kpi_code, period_start DESC);
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asnap_read"  ON public.analytics_snapshots FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "asnap_write" ON public.analytics_snapshots FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'analytics:manage', NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================================================ MASTERS
INSERT INTO public.master_types (code, name, description, supports_hierarchy, is_system, display_order) VALUES
  ('timeline_event_types','Timeline Event Types','Events written to record timelines',false,true,510),
  ('document_categories','Document Categories','Categorisation of documents',false,true,520),
  ('note_visibility','Note Visibility','Public vs private note scopes',false,true,530),
  ('search_entity_types','Search Entity Types','Entities registered in the search index',false,true,540),
  ('widget_types','Widget Types','Dashboard widget renderers',false,true,550),
  ('report_export_formats','Report Export Formats','Formats supported by the report engine',false,true,560),
  ('kpi_categories','KPI Categories','Grouping of KPIs',false,true,570)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.masters (tenant_id, type_code, code, name, display_order, is_system, meta) VALUES
  (NULL,'timeline_event_types','created','Created',10,true,'{"icon":"plus-circle"}'::jsonb),
  (NULL,'timeline_event_types','updated','Updated',20,true,'{"icon":"pencil"}'::jsonb),
  (NULL,'timeline_event_types','assigned','Assigned',30,true,'{"icon":"user-plus"}'::jsonb),
  (NULL,'timeline_event_types','status_changed','Status Changed',40,true,'{"icon":"git-branch"}'::jsonb),
  (NULL,'timeline_event_types','comment','Comment',50,true,'{"icon":"message-circle"}'::jsonb),
  (NULL,'timeline_event_types','attachment','Attachment',60,true,'{"icon":"paperclip"}'::jsonb),
  (NULL,'timeline_event_types','payment','Payment',70,true,'{"icon":"credit-card"}'::jsonb),
  (NULL,'timeline_event_types','notification','Notification',80,true,'{"icon":"bell"}'::jsonb),
  (NULL,'timeline_event_types','workflow_action','Workflow Action',90,true,'{"icon":"workflow"}'::jsonb),
  (NULL,'timeline_event_types','audit','Audit',100,true,'{"icon":"shield"}'::jsonb),
  (NULL,'document_categories','medical','Medical Documents',10,true,'{}'::jsonb),
  (NULL,'document_categories','invoice','Invoices',20,true,'{}'::jsonb),
  (NULL,'document_categories','certificate','Certificates',30,true,'{}'::jsonb),
  (NULL,'document_categories','photo','Photos',40,true,'{}'::jsonb),
  (NULL,'document_categories','report','Reports',50,true,'{}'::jsonb),
  (NULL,'document_categories','contract','Contracts',60,true,'{}'::jsonb),
  (NULL,'document_categories','other','Other',999,true,'{}'::jsonb),
  (NULL,'note_visibility','public','Public',10,true,'{}'::jsonb),
  (NULL,'note_visibility','private','Private',20,true,'{}'::jsonb),
  (NULL,'search_entity_types','lead','Lead',10,true,'{"module":"crm"}'::jsonb),
  (NULL,'search_entity_types','customer','Customer',20,true,'{"module":"crm"}'::jsonb),
  (NULL,'search_entity_types','patient','Patient',30,true,'{"module":"clinical"}'::jsonb),
  (NULL,'search_entity_types','doctor','Doctor',40,true,'{"module":"clinical"}'::jsonb),
  (NULL,'search_entity_types','employee','Employee',50,true,'{"module":"hr"}'::jsonb),
  (NULL,'search_entity_types','invoice','Invoice',60,true,'{"module":"accounts"}'::jsonb),
  (NULL,'search_entity_types','product','Product',70,true,'{"module":"inventory"}'::jsonb),
  (NULL,'search_entity_types','document','Document',80,true,'{"module":"platform"}'::jsonb),
  (NULL,'search_entity_types','franchise','Franchise',90,true,'{"module":"franchise"}'::jsonb),
  (NULL,'search_entity_types','task','Task',100,true,'{"module":"platform"}'::jsonb),
  (NULL,'search_entity_types','workflow','Workflow',110,true,'{"module":"automation"}'::jsonb),
  (NULL,'widget_types','kpi','KPI Tile',10,true,'{}'::jsonb),
  (NULL,'widget_types','chart','Chart',20,true,'{}'::jsonb),
  (NULL,'widget_types','table','Table',30,true,'{}'::jsonb),
  (NULL,'widget_types','calendar','Calendar',40,true,'{}'::jsonb),
  (NULL,'widget_types','tasks','Task List',50,true,'{}'::jsonb),
  (NULL,'widget_types','timeline','Timeline',60,true,'{}'::jsonb),
  (NULL,'widget_types','notification','Notifications',70,true,'{}'::jsonb),
  (NULL,'widget_types','leaderboard','Leaderboard',80,true,'{}'::jsonb),
  (NULL,'widget_types','heatmap','Heatmap',90,true,'{}'::jsonb),
  (NULL,'report_export_formats','pdf','PDF',10,true,'{}'::jsonb),
  (NULL,'report_export_formats','excel','Excel',20,true,'{}'::jsonb),
  (NULL,'report_export_formats','csv','CSV',30,true,'{}'::jsonb),
  (NULL,'report_export_formats','json','JSON',40,true,'{}'::jsonb),
  (NULL,'kpi_categories','business','Business',10,true,'{}'::jsonb),
  (NULL,'kpi_categories','clinical','Clinical',20,true,'{}'::jsonb),
  (NULL,'kpi_categories','marketing','Marketing',30,true,'{}'::jsonb),
  (NULL,'kpi_categories','financial','Financial',40,true,'{}'::jsonb),
  (NULL,'kpi_categories','franchise','Franchise',50,true,'{}'::jsonb),
  (NULL,'kpi_categories','operations','Operations',60,true,'{}'::jsonb)
ON CONFLICT (tenant_id, type_code, code) DO NOTHING;

INSERT INTO public.analytics_kpis (tenant_id, code, name, category, unit, direction, is_system) VALUES
  (NULL,'biz.active_customers','Active Customers','business','count','higher',true),
  (NULL,'biz.new_leads','New Leads','business','count','higher',true),
  (NULL,'biz.lead_conversion','Lead Conversion Rate','business','%','higher',true),
  (NULL,'clin.appointments_today','Appointments Today','clinical','count','higher',true),
  (NULL,'clin.no_show_rate','No-show Rate','clinical','%','lower',true),
  (NULL,'clin.avg_treatment_value','Avg Treatment Value','clinical','currency','higher',true),
  (NULL,'mkt.campaign_ctr','Campaign CTR','marketing','%','higher',true),
  (NULL,'mkt.cost_per_lead','Cost Per Lead','marketing','currency','lower',true),
  (NULL,'fin.mrr','Monthly Recurring Revenue','financial','currency','higher',true),
  (NULL,'fin.collections_ratio','Collections Ratio','financial','%','higher',true),
  (NULL,'fin.outstanding','Outstanding Receivables','financial','currency','lower',true),
  (NULL,'frn.active_franchises','Active Franchises','franchise','count','higher',true),
  (NULL,'frn.royalty_collected','Royalty Collected','franchise','currency','higher',true),
  (NULL,'ops.sla_compliance','SLA Compliance','operations','%','higher',true),
  (NULL,'ops.workflow_success','Workflow Success Rate','operations','%','higher',true),
  (NULL,'ops.avg_resolution','Avg Resolution Time','operations','hours','lower',true)
ON CONFLICT (tenant_id, code) DO NOTHING;