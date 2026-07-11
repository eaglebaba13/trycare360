
-- Item 1: assessment_definitions
DROP POLICY IF EXISTS "assessment_defs read all" ON public.assessment_definitions;
CREATE POLICY "assessment_defs read active public"
  ON public.assessment_definitions FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
CREATE POLICY "assessment_defs read all admins"
  ON public.assessment_definitions FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_role_at(auth.uid(), 'admin', NULL)
    OR public.has_role_at(auth.uid(), 'corporate_admin', NULL)
  );

-- Item 2: assessment_recommendations / results / photos
DROP POLICY IF EXISTS "recs staff read" ON public.assessment_recommendations;
CREATE POLICY "recs staff read"
  ON public.assessment_recommendations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_sessions s
    WHERE s.id = assessment_recommendations.session_id
      AND public.has_tenant_access(auth.uid(), s.tenant_id)
  ));

DROP POLICY IF EXISTS "results staff read" ON public.assessment_results;
CREATE POLICY "results staff read"
  ON public.assessment_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_sessions s
    WHERE s.id = assessment_results.session_id
      AND public.has_tenant_access(auth.uid(), s.tenant_id)
  ));

DROP POLICY IF EXISTS "photos staff read" ON public.assessment_photos;
CREATE POLICY "photos staff read"
  ON public.assessment_photos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_sessions s
    WHERE s.id = assessment_photos.session_id
      AND public.has_tenant_access(auth.uid(), s.tenant_id)
  ));

-- Item 3: assessment_sessions staff read — add tenant scope
DROP POLICY IF EXISTS "sessions staff read" ON public.assessment_sessions;
CREATE POLICY "sessions staff read"
  ON public.assessment_sessions FOR SELECT TO authenticated
  USING (
    public.has_tenant_access(auth.uid(), tenant_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.has_role_at(auth.uid(), 'admin', NULL)
      OR public.has_role_at(auth.uid(), 'corporate_admin', NULL)
      OR public.has_role_at(auth.uid(), 'doctor', NULL)
      OR public.has_role_at(auth.uid(), 'hair_consultant', NULL)
      OR public.has_role_at(auth.uid(), 'skin_consultant', NULL)
      OR public.has_role_at(auth.uid(), 'nutritionist', NULL)
      OR public.has_role_at(auth.uid(), 'telecaller', NULL)
      OR public.has_role_at(auth.uid(), 'center_manager', NULL)
    )
  );

-- Item 4: cms_ab_assignments
DROP POLICY IF EXISTS "read ab assign" ON public.cms_ab_assignments;
DROP POLICY IF EXISTS "write ab assign" ON public.cms_ab_assignments;
CREATE POLICY "read ab assign"
  ON public.cms_ab_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cms_ab_experiments e
    WHERE e.id = cms_ab_assignments.experiment_id
      AND public.has_tenant_access(auth.uid(), e.tenant_id)
  ));
CREATE POLICY "write ab assign"
  ON public.cms_ab_assignments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cms_ab_experiments e
    WHERE e.id = cms_ab_assignments.experiment_id
      AND public.can_manage_cms(auth.uid(), e.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cms_ab_experiments e
    WHERE e.id = cms_ab_assignments.experiment_id
      AND public.can_manage_cms(auth.uid(), e.tenant_id)
  ));

-- Item 5: cms_ab_experiments anon read — hide variant configs and goal_event
REVOKE SELECT ON public.cms_ab_experiments FROM anon;
GRANT SELECT (id, tenant_id, page_id, name, status, traffic_split, started_at, ended_at)
  ON public.cms_ab_experiments TO anon;

-- Item 6: cms_appointment_requests — CHECK constraints (anon booking preserved)
ALTER TABLE public.cms_appointment_requests
  ADD CONSTRAINT cms_appt_full_name_len   CHECK (full_name IS NULL OR char_length(full_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT cms_appt_phone_len       CHECK (phone     IS NULL OR char_length(phone) BETWEEN 6 AND 32),
  ADD CONSTRAINT cms_appt_phone_format    CHECK (phone     IS NULL OR phone ~ '^[+0-9 ()\-]{6,32}$'),
  ADD CONSTRAINT cms_appt_email_len       CHECK (email     IS NULL OR char_length(email) <= 254),
  ADD CONSTRAINT cms_appt_email_format    CHECK (email     IS NULL OR email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT cms_appt_city_len        CHECK (city      IS NULL OR char_length(city) <= 80),
  ADD CONSTRAINT cms_appt_message_len     CHECK (message   IS NULL OR char_length(message) <= 2000),
  ADD CONSTRAINT cms_appt_source_len      CHECK (source    IS NULL OR char_length(source) <= 80),
  ADD CONSTRAINT cms_appt_treatment_slug_len CHECK (treatment_slug IS NULL OR char_length(treatment_slug) <= 120),
  ADD CONSTRAINT cms_appt_doctor_slug_len    CHECK (doctor_slug    IS NULL OR char_length(doctor_slug) <= 120);

-- Item 7: cms_media_folders
DROP POLICY IF EXISTS "tenant read media folders" ON public.cms_media_folders;
DROP POLICY IF EXISTS "tenant write media folders" ON public.cms_media_folders;
CREATE POLICY "tenant read media folders"
  ON public.cms_media_folders FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "tenant write media folders"
  ON public.cms_media_folders FOR ALL TO authenticated
  USING (public.can_manage_cms(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

-- Item 8: cms_page_forms / publish_log / seo_audits / tracking_events (read)
DROP POLICY IF EXISTS "read page forms" ON public.cms_page_forms;
DROP POLICY IF EXISTS "write page forms" ON public.cms_page_forms;
CREATE POLICY "read page forms"
  ON public.cms_page_forms FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "write page forms"
  ON public.cms_page_forms FOR ALL TO authenticated
  USING (public.can_manage_cms(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "read publish log" ON public.cms_page_publish_log;
DROP POLICY IF EXISTS "write publish log" ON public.cms_page_publish_log;
CREATE POLICY "read publish log"
  ON public.cms_page_publish_log FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "write publish log"
  ON public.cms_page_publish_log FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "read seo" ON public.cms_seo_audits;
DROP POLICY IF EXISTS "write seo" ON public.cms_seo_audits;
CREATE POLICY "read seo"
  ON public.cms_seo_audits FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "write seo"
  ON public.cms_seo_audits FOR ALL TO authenticated
  USING (public.can_manage_cms(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "read tracking" ON public.cms_tracking_events;
CREATE POLICY "read tracking"
  ON public.cms_tracking_events FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Item 9: cms_section_library / cms_page_templates
DROP POLICY IF EXISTS "read sections" ON public.cms_section_library;
DROP POLICY IF EXISTS "write sections" ON public.cms_section_library;
CREATE POLICY "read sections"
  ON public.cms_section_library FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "write sections"
  ON public.cms_section_library FOR ALL TO authenticated
  USING (public.can_manage_cms(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "read templates" ON public.cms_page_templates;
DROP POLICY IF EXISTS "write templates" ON public.cms_page_templates;
CREATE POLICY "read templates"
  ON public.cms_page_templates FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "write templates"
  ON public.cms_page_templates FOR ALL TO authenticated
  USING (public.can_manage_cms(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

-- Item 11: search_path on cms_set_updated_at
ALTER FUNCTION public.cms_set_updated_at() SET search_path = public;

-- Item 10: Revoke EXECUTE on internal SECURITY DEFINER helpers
-- Trigger-only (triggers run under table owner regardless of grants)
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_sync_search()               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tc_audit_row()                  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tc_set_updated_at()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tc_set_actor_columns()          FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tc_log_role_change()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_index_tsv_trg()          FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leads_after_update()            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persons_sync_search()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.persons_guard_merge_column()    FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.person_verifications_rollup()   FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.person_addresses_sync_primary() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.person_touch_updated_at()       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cms_set_updated_at()            FROM anon, authenticated, PUBLIC;

-- Internal engine helpers (server-side only)
REVOKE EXECUTE ON FUNCTION public.emit_automation_event(uuid, text, jsonb, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.evaluate_sla(text, text)                        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sweep_sla_breaches()                            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.attribute_conversion(uuid)                      FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_ltv_person(uuid)                        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accrue_commissions_for_event(uuid)              FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._person_merge_repoint_table(text, text, text, uuid, uuid, uuid, boolean) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._lead_current_tenant()                          FROM anon, authenticated, PUBLIC;
