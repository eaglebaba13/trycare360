
DROP POLICY IF EXISTS "write ab" ON public.cms_ab_experiments;
CREATE POLICY "write ab"
  ON public.cms_ab_experiments FOR ALL TO authenticated
  USING (public.can_manage_cms(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_cms(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "read ab" ON public.cms_ab_experiments;
CREATE POLICY "read ab"
  ON public.cms_ab_experiments FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
