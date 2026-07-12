
-- =========================================================================
-- PHASE 2.7 STAGE 1 — BILLING, PAYMENTS & INSURANCE — SCHEMA & FOUNDATIONS
-- =========================================================================

-- ---------- RBAC PERMISSIONS ---------------------------------------------
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('billing:read',                  'billing',   'read',                  'Read billing documents'),
  ('billing:write',                 'billing',   'write',                 'Create/edit billing drafts'),
  ('billing:issue_invoice',         'billing',   'issue_invoice',         'Issue (finalize) invoices'),
  ('billing:record_payment',        'billing',   'record_payment',        'Record payments'),
  ('billing:process_refund',        'billing',   'process_refund',        'Process refunds'),
  ('billing:void',                  'billing',   'void',                  'Void/credit-note invoices'),
  ('insurance:read',                'insurance', 'read',                  'Read insurance / claims'),
  ('insurance:write',               'insurance', 'write',                 'Manage insurance master data'),
  ('insurance:submit_claim',        'insurance', 'submit_claim',          'Submit insurance claims'),
  ('insurance:post_remittance',     'insurance', 'post_remittance',       'Post insurance remittances'),
  ('insurance:manage_authorization','insurance', 'manage_authorization',  'Create/manage pre-authorizations')
ON CONFLICT (code) DO NOTHING;

-- ---------- HELPER FUNCTIONS ---------------------------------------------
CREATE OR REPLACE FUNCTION public.can_read_billing(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND (public.has_permission(_user_id,'billing:read', NULL)
               OR public.has_permission(_user_id,'billing:write', NULL)
               OR public.has_permission(_user_id,'billing:issue_invoice', NULL)
               OR public.has_permission(_user_id,'billing:record_payment', NULL)));
$$;

CREATE OR REPLACE FUNCTION public.can_write_billing(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'billing:write', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_issue_invoice(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'billing:issue_invoice', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_record_payment(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'billing:record_payment', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_process_refund(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'billing:process_refund', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_read_insurance(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND (public.has_permission(_user_id,'insurance:read', NULL)
               OR public.has_permission(_user_id,'insurance:write', NULL)
               OR public.has_permission(_user_id,'insurance:submit_claim', NULL)));
$$;

CREATE OR REPLACE FUNCTION public.can_write_insurance(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'insurance:write', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_submit_claim(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'insurance:submit_claim', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_post_remittance(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'insurance:post_remittance', NULL));
$$;

-- =========================================================================
-- PRICING
-- =========================================================================
CREATE TABLE public.price_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_books TO authenticated;
GRANT ALL ON public.price_books TO service_role;
ALTER TABLE public.price_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_read ON public.price_books FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY pb_write ON public.price_books FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_pb_updated BEFORE UPDATE ON public.price_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pb_actor BEFORE INSERT OR UPDATE ON public.price_books
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.price_book_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  price_book_id uuid NOT NULL REFERENCES public.price_books(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('service','package','product','treatment','membership','custom')),
  item_ref_id uuid,
  item_code text,
  item_name text NOT NULL,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  tax_rule_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_pbi_book ON public.price_book_items(price_book_id);
CREATE INDEX ix_pbi_lookup ON public.price_book_items(tenant_id, item_kind, item_ref_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_book_items TO authenticated;
GRANT ALL ON public.price_book_items TO service_role;
ALTER TABLE public.price_book_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pbi_read ON public.price_book_items FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY pbi_write ON public.price_book_items FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_pbi_updated BEFORE UPDATE ON public.price_book_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pbi_actor BEFORE INSERT OR UPDATE ON public.price_book_items
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.discount_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('line','invoice')),
  kind text NOT NULL CHECK (kind IN ('percent','amount','tiered','coupon','loyalty','corporate')),
  value numeric(14,2),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_approval boolean NOT NULL DEFAULT false,
  max_percent numeric(5,2),
  is_active boolean NOT NULL DEFAULT true,
  valid_from date, valid_to date,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_schemes TO authenticated;
GRANT ALL ON public.discount_schemes TO service_role;
ALTER TABLE public.discount_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ds_read ON public.discount_schemes FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY ds_write ON public.discount_schemes FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_ds_updated BEFORE UPDATE ON public.discount_schemes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ds_actor BEFORE INSERT OR UPDATE ON public.discount_schemes
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'IN',
  rate_percent numeric(6,3) NOT NULL DEFAULT 0,
  is_compound boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;
GRANT ALL ON public.tax_rates TO service_role;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tr_read ON public.tax_rates FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY tr_write ON public.tax_rates FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_tr_updated BEFORE UPDATE ON public.tax_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  hsn_sac text,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  place_of_supply text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rules TO authenticated;
GRANT ALL ON public.tax_rules TO service_role;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY trl_read ON public.tax_rules FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY trl_write ON public.tax_rules FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_trl_updated BEFORE UPDATE ON public.tax_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trl_actor BEFORE INSERT OR UPDATE ON public.tax_rules
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- =========================================================================
-- ESTIMATES
-- =========================================================================
CREATE TABLE public.billing_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  estimate_no text NOT NULL,
  person_id uuid,
  patient_id uuid,
  price_book_id uuid REFERENCES public.price_books(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','converted','expired','cancelled')),
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  valid_until date,
  notes text,
  converted_invoice_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, estimate_no)
);
CREATE INDEX ix_est_person ON public.billing_estimates(tenant_id, person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_estimates TO authenticated;
GRANT ALL ON public.billing_estimates TO service_role;
ALTER TABLE public.billing_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY est_read ON public.billing_estimates FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY est_write ON public.billing_estimates FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_est_updated BEFORE UPDATE ON public.billing_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_est_actor BEFORE INSERT OR UPDATE ON public.billing_estimates
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.billing_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  estimate_id uuid NOT NULL REFERENCES public.billing_estimates(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  item_kind text NOT NULL,
  item_ref_id uuid,
  description text NOT NULL,
  qty numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_rule_id uuid,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_esti_est ON public.billing_estimate_items(estimate_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_estimate_items TO authenticated;
GRANT ALL ON public.billing_estimate_items TO service_role;
ALTER TABLE public.billing_estimate_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY esti_read ON public.billing_estimate_items FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY esti_write ON public.billing_estimate_items FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_esti_updated BEFORE UPDATE ON public.billing_estimate_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- INVOICES
-- =========================================================================
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  invoice_no text,
  invoice_series text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','partially_paid','paid','void','refunded')),
  issue_date date,
  due_date date,
  person_id uuid,
  patient_id uuid,
  billing_source text,
  source_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_book_id uuid REFERENCES public.price_books(id),
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  round_off numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  amount_due numeric(14,2) NOT NULL DEFAULT 0,
  insurance_covered numeric(14,2) NOT NULL DEFAULT 0,
  patient_responsibility numeric(14,2) NOT NULL DEFAULT 0,
  primary_insurance_id uuid,
  gst_registration_id uuid REFERENCES public.gst_registrations(id),
  place_of_supply text,
  einvoice_irn text,
  einvoice_qr text,
  einvoice_status text,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_no)
);
CREATE INDEX ix_inv_person ON public.invoices(tenant_id, person_id);
CREATE INDEX ix_inv_status ON public.invoices(tenant_id, status);
CREATE INDEX ix_inv_source ON public.invoices(tenant_id, billing_source);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_read ON public.invoices FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY inv_write ON public.invoices FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inv_actor BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_inv_audit AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  item_kind text NOT NULL,
  item_ref_id uuid,
  hsn_sac text,
  description text NOT NULL,
  qty numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount_scheme_id uuid REFERENCES public.discount_schemes(id),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_rule_id uuid,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  performer_id uuid,
  package_ref_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_invi_inv ON public.invoice_items(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY invi_read ON public.invoice_items FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY invi_write ON public.invoice_items FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_invi_updated BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.invoice_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tax_rate_id uuid REFERENCES public.tax_rates(id),
  code text, name text,
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0,
  rate_percent numeric(6,3) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_taxes TO authenticated;
GRANT ALL ON public.invoice_taxes TO service_role;
ALTER TABLE public.invoice_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY invt_read ON public.invoice_taxes FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY invt_write ON public.invoice_taxes FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));

CREATE TABLE public.invoice_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  discount_scheme_id uuid REFERENCES public.discount_schemes(id),
  scope text NOT NULL CHECK (scope IN ('line','invoice')),
  line_no int,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_discounts TO authenticated;
GRANT ALL ON public.invoice_discounts TO service_role;
ALTER TABLE public.invoice_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY invd_read ON public.invoice_discounts FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY invd_write ON public.invoice_discounts FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));

-- =========================================================================
-- CREDIT / DEBIT NOTES
-- =========================================================================
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  note_no text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','applied','void')),
  issue_date date,
  reason text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, note_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY cn_read ON public.credit_notes FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY cn_write ON public.credit_notes FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_cn_updated BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cn_actor BEFORE INSERT OR UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  invoice_item_id uuid REFERENCES public.invoice_items(id),
  description text,
  qty numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_note_items TO authenticated;
GRANT ALL ON public.credit_note_items TO service_role;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cni_read ON public.credit_note_items FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY cni_write ON public.credit_note_items FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));

CREATE TABLE public.debit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  note_no text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','applied','void')),
  issue_date date,
  reason text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, note_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debit_notes TO authenticated;
GRANT ALL ON public.debit_notes TO service_role;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY dn_read ON public.debit_notes FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY dn_write ON public.debit_notes FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_dn_updated BEFORE UPDATE ON public.debit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dn_actor BEFORE INSERT OR UPDATE ON public.debit_notes
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.debit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  debit_note_id uuid NOT NULL REFERENCES public.debit_notes(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  description text,
  qty numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debit_note_items TO authenticated;
GRANT ALL ON public.debit_note_items TO service_role;
ALTER TABLE public.debit_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY dni_read ON public.debit_note_items FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY dni_write ON public.debit_note_items FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));

-- =========================================================================
-- PAYMENTS / ALLOCATIONS / REFUNDS
-- =========================================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  payment_no text NOT NULL,
  person_id uuid,
  patient_id uuid,
  method text NOT NULL,
  provider text,
  external_ref text,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'succeeded' CHECK (status IN ('initiated','pending','succeeded','failed','refunded','partially_refunded','cancelled')),
  received_at timestamptz NOT NULL DEFAULT now(),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, payment_no)
);
CREATE INDEX ix_pay_person ON public.payments(tenant_id, person_id);
CREATE INDEX ix_pay_status ON public.payments(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pay_read ON public.payments FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY pay_write ON public.payments FOR ALL TO authenticated
  USING (public.can_record_payment(auth.uid(), tenant_id))
  WITH CHECK (public.can_record_payment(auth.uid(), tenant_id));
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pay_actor BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_pay_audit AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id),
  credit_note_id uuid REFERENCES public.credit_notes(id),
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_pa_pay ON public.payment_allocations(payment_id);
CREATE INDEX ix_pa_inv ON public.payment_allocations(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_allocations TO authenticated;
GRANT ALL ON public.payment_allocations TO service_role;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY pa_read ON public.payment_allocations FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY pa_write ON public.payment_allocations FOR ALL TO authenticated
  USING (public.can_record_payment(auth.uid(), tenant_id))
  WITH CHECK (public.can_record_payment(auth.uid(), tenant_id));

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  refund_no text NOT NULL,
  payment_id uuid REFERENCES public.payments(id),
  amount numeric(14,2) NOT NULL,
  method text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','processed','failed','cancelled')),
  approval_request_id uuid,
  processed_at timestamptz,
  external_ref text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, refund_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY rf_read ON public.refunds FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY rf_write ON public.refunds FOR ALL TO authenticated
  USING (public.can_process_refund(auth.uid(), tenant_id))
  WITH CHECK (public.can_process_refund(auth.uid(), tenant_id));
CREATE TRIGGER trg_rf_updated BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rf_actor BEFORE INSERT OR UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.refund_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  refund_id uuid NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id),
  credit_note_id uuid REFERENCES public.credit_notes(id),
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_allocations TO authenticated;
GRANT ALL ON public.refund_allocations TO service_role;
ALTER TABLE public.refund_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY rfa_read ON public.refund_allocations FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY rfa_write ON public.refund_allocations FOR ALL TO authenticated
  USING (public.can_process_refund(auth.uid(), tenant_id))
  WITH CHECK (public.can_process_refund(auth.uid(), tenant_id));

-- =========================================================================
-- LEDGER
-- =========================================================================
CREATE TABLE public.billing_ledger (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  branch_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  entry_type text NOT NULL,
  person_id uuid,
  patient_id uuid,
  invoice_id uuid,
  payment_id uuid,
  refund_id uuid,
  credit_note_id uuid,
  debit_note_id uuid,
  claim_id uuid,
  currency text NOT NULL DEFAULT 'INR',
  amount numeric(14,2) NOT NULL,
  balance numeric(14,2),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_bl_tenant_occ ON public.billing_ledger(tenant_id, occurred_at);
CREATE INDEX ix_bl_invoice ON public.billing_ledger(invoice_id);
CREATE INDEX ix_bl_person ON public.billing_ledger(person_id);
GRANT SELECT, INSERT ON public.billing_ledger TO authenticated;
GRANT ALL ON public.billing_ledger TO service_role;
ALTER TABLE public.billing_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY bl_read ON public.billing_ledger FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY bl_insert ON public.billing_ledger FOR INSERT TO authenticated
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id)
           OR public.can_record_payment(auth.uid(), tenant_id)
           OR public.can_process_refund(auth.uid(), tenant_id)
           OR public.can_post_remittance(auth.uid(), tenant_id));

-- =========================================================================
-- INSURANCE
-- =========================================================================
CREATE TABLE public.insurance_payers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'private' CHECK (kind IN ('private','tpa','government','corporate','self-pay')),
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  gst_no text, pan text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_payers TO authenticated;
GRANT ALL ON public.insurance_payers TO service_role;
ALTER TABLE public.insurance_payers ENABLE ROW LEVEL SECURITY;
CREATE POLICY ip_read ON public.insurance_payers FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ip_write ON public.insurance_payers FOR ALL TO authenticated
  USING (public.can_write_insurance(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_insurance(auth.uid(), tenant_id));
CREATE TRIGGER trg_ip_updated BEFORE UPDATE ON public.insurance_payers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ip_actor BEFORE INSERT OR UPDATE ON public.insurance_payers
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payer_id uuid NOT NULL REFERENCES public.insurance_payers(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  plan_type text,
  copay_percent numeric(5,2) NOT NULL DEFAULT 0,
  coverage_percent numeric(5,2) NOT NULL DEFAULT 100,
  annual_limit numeric(14,2),
  per_visit_limit numeric(14,2),
  covered_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_authorization boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, payer_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_plans TO authenticated;
GRANT ALL ON public.insurance_plans TO service_role;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY ipl_read ON public.insurance_plans FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ipl_write ON public.insurance_plans FOR ALL TO authenticated
  USING (public.can_write_insurance(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_insurance(auth.uid(), tenant_id));
CREATE TRIGGER trg_ipl_updated BEFORE UPDATE ON public.insurance_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ipl_actor BEFORE INSERT OR UPDATE ON public.insurance_plans
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.patient_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  person_id uuid NOT NULL,
  patient_id uuid,
  payer_id uuid NOT NULL REFERENCES public.insurance_payers(id),
  plan_id uuid REFERENCES public.insurance_plans(id),
  policy_no text NOT NULL,
  member_id text,
  relationship_to_subscriber text,
  subscriber_name text,
  group_no text,
  is_primary boolean NOT NULL DEFAULT false,
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending','expired','cancelled')),
  card_media_id uuid,
  verification_status text DEFAULT 'unverified',
  verified_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, person_id, payer_id, policy_no)
);
CREATE INDEX ix_pi_person ON public.patient_insurance(tenant_id, person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_insurance TO authenticated;
GRANT ALL ON public.patient_insurance TO service_role;
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_read ON public.patient_insurance FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY pi_write ON public.patient_insurance FOR ALL TO authenticated
  USING (public.can_write_insurance(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_insurance(auth.uid(), tenant_id));
CREATE TRIGGER trg_pi_updated BEFORE UPDATE ON public.patient_insurance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pi_actor BEFORE INSERT OR UPDATE ON public.patient_insurance
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_primary_insurance_fk
  FOREIGN KEY (primary_insurance_id) REFERENCES public.patient_insurance(id);

CREATE TABLE public.insurance_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  auth_no text,
  patient_insurance_id uuid NOT NULL REFERENCES public.patient_insurance(id),
  person_id uuid NOT NULL,
  requested_service jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_amount numeric(14,2),
  approved_amount numeric(14,2),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('draft','requested','approved','partially_approved','denied','expired','cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  valid_from date, valid_to date,
  denial_reason text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_authorizations TO authenticated;
GRANT ALL ON public.insurance_authorizations TO service_role;
ALTER TABLE public.insurance_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ia_read ON public.insurance_authorizations FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ia_write ON public.insurance_authorizations FOR ALL TO authenticated
  USING (public.can_write_insurance(auth.uid(), tenant_id)
      OR public.has_permission(auth.uid(),'insurance:manage_authorization', NULL))
  WITH CHECK (public.can_write_insurance(auth.uid(), tenant_id)
      OR public.has_permission(auth.uid(),'insurance:manage_authorization', NULL));
CREATE TRIGGER trg_ia_updated BEFORE UPDATE ON public.insurance_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ia_actor BEFORE INSERT OR UPDATE ON public.insurance_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  claim_no text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id),
  patient_insurance_id uuid NOT NULL REFERENCES public.patient_insurance(id),
  authorization_id uuid REFERENCES public.insurance_authorizations(id),
  person_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','submitted','acknowledged','in_review','approved','partially_approved','denied','paid','appealed','closed','cancelled')),
  submitted_at timestamptz,
  submission_channel text,
  external_claim_ref text,
  billed_amount numeric(14,2) NOT NULL DEFAULT 0,
  allowed_amount numeric(14,2),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  patient_responsibility numeric(14,2) NOT NULL DEFAULT 0,
  denial_reason text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, claim_no)
);
CREATE INDEX ix_ic_status ON public.insurance_claims(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claims TO authenticated;
GRANT ALL ON public.insurance_claims TO service_role;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY ic_read ON public.insurance_claims FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ic_write ON public.insurance_claims FOR ALL TO authenticated
  USING (public.can_submit_claim(auth.uid(), tenant_id)
      OR public.can_write_insurance(auth.uid(), tenant_id))
  WITH CHECK (public.can_submit_claim(auth.uid(), tenant_id)
      OR public.can_write_insurance(auth.uid(), tenant_id));
CREATE TRIGGER trg_ic_updated BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ic_actor BEFORE INSERT OR UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_ic_audit AFTER INSERT OR UPDATE OR DELETE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.insurance_claim_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  invoice_item_id uuid REFERENCES public.invoice_items(id),
  line_no int NOT NULL,
  service_code text,
  hsn_sac text,
  description text,
  qty numeric(14,3) NOT NULL DEFAULT 1,
  billed_amount numeric(14,2) NOT NULL DEFAULT 0,
  allowed_amount numeric(14,2),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  denial_code text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claim_items TO authenticated;
GRANT ALL ON public.insurance_claim_items TO service_role;
ALTER TABLE public.insurance_claim_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ici_read ON public.insurance_claim_items FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ici_write ON public.insurance_claim_items FOR ALL TO authenticated
  USING (public.can_submit_claim(auth.uid(), tenant_id) OR public.can_write_insurance(auth.uid(), tenant_id))
  WITH CHECK (public.can_submit_claim(auth.uid(), tenant_id) OR public.can_write_insurance(auth.uid(), tenant_id));

CREATE TABLE public.insurance_claim_events (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  from_status text, to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_ice_claim ON public.insurance_claim_events(claim_id, occurred_at);
GRANT SELECT, INSERT ON public.insurance_claim_events TO authenticated;
GRANT ALL ON public.insurance_claim_events TO service_role;
ALTER TABLE public.insurance_claim_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ice_read ON public.insurance_claim_events FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ice_insert ON public.insurance_claim_events FOR INSERT TO authenticated
  WITH CHECK (public.can_submit_claim(auth.uid(), tenant_id)
           OR public.can_post_remittance(auth.uid(), tenant_id)
           OR public.can_write_insurance(auth.uid(), tenant_id));

CREATE TABLE public.insurance_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  remittance_no text NOT NULL,
  payer_id uuid NOT NULL REFERENCES public.insurance_payers(id),
  remit_date date NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  external_ref text,
  status text NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','partially_posted','posted','reconciled','disputed')),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, remittance_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_remittances TO authenticated;
GRANT ALL ON public.insurance_remittances TO service_role;
ALTER TABLE public.insurance_remittances ENABLE ROW LEVEL SECURITY;
CREATE POLICY ir_read ON public.insurance_remittances FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY ir_write ON public.insurance_remittances FOR ALL TO authenticated
  USING (public.can_post_remittance(auth.uid(), tenant_id))
  WITH CHECK (public.can_post_remittance(auth.uid(), tenant_id));
CREATE TRIGGER trg_ir_updated BEFORE UPDATE ON public.insurance_remittances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ir_actor BEFORE INSERT OR UPDATE ON public.insurance_remittances
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.insurance_remittance_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  remittance_id uuid NOT NULL REFERENCES public.insurance_remittances(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.insurance_claims(id),
  claim_item_id uuid REFERENCES public.insurance_claim_items(id),
  billed_amount numeric(14,2) NOT NULL DEFAULT 0,
  allowed_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  adjustment_amount numeric(14,2) NOT NULL DEFAULT 0,
  patient_responsibility numeric(14,2) NOT NULL DEFAULT 0,
  denial_code text,
  remark text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_irl_rem ON public.insurance_remittance_lines(remittance_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_remittance_lines TO authenticated;
GRANT ALL ON public.insurance_remittance_lines TO service_role;
ALTER TABLE public.insurance_remittance_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY irl_read ON public.insurance_remittance_lines FOR SELECT TO authenticated
  USING (public.can_read_insurance(auth.uid(), tenant_id));
CREATE POLICY irl_write ON public.insurance_remittance_lines FOR ALL TO authenticated
  USING (public.can_post_remittance(auth.uid(), tenant_id))
  WITH CHECK (public.can_post_remittance(auth.uid(), tenant_id));

-- =========================================================================
-- RECURRING BILLING
-- =========================================================================
CREATE TABLE public.billing_recurring_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  person_id uuid NOT NULL,
  source_kind text NOT NULL,
  source_ref_id uuid NOT NULL,
  cadence text NOT NULL,
  next_run_at timestamptz,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled','failed')),
  attempts int NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_recurring_cycles TO authenticated;
GRANT ALL ON public.billing_recurring_cycles TO service_role;
ALTER TABLE public.billing_recurring_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY brc_read ON public.billing_recurring_cycles FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY brc_write ON public.billing_recurring_cycles FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));
CREATE TRIGGER trg_brc_updated BEFORE UPDATE ON public.billing_recurring_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brc_actor BEFORE INSERT OR UPDATE ON public.billing_recurring_cycles
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.billing_recurring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  cycle_id uuid NOT NULL REFERENCES public.billing_recurring_cycles(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  invoice_id uuid REFERENCES public.invoices(id),
  payment_id uuid REFERENCES public.payments(id),
  status text NOT NULL,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_brr_cycle ON public.billing_recurring_runs(cycle_id, run_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_recurring_runs TO authenticated;
GRANT ALL ON public.billing_recurring_runs TO service_role;
ALTER TABLE public.billing_recurring_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY brr_read ON public.billing_recurring_runs FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY brr_write ON public.billing_recurring_runs FOR ALL TO authenticated
  USING (public.can_write_billing(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_billing(auth.uid(), tenant_id));

-- =========================================================================
-- BILLING AUDIT
-- =========================================================================
CREATE TABLE public.billing_audit (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text
);
CREATE INDEX ix_ba_tenant ON public.billing_audit(tenant_id, occurred_at);
GRANT SELECT, INSERT ON public.billing_audit TO authenticated;
GRANT ALL ON public.billing_audit TO service_role;
ALTER TABLE public.billing_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY ba_read ON public.billing_audit FOR SELECT TO authenticated
  USING (public.can_read_billing(auth.uid(), tenant_id));
CREATE POLICY ba_insert ON public.billing_audit FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- =========================================================================
-- SEEDS
-- =========================================================================
INSERT INTO public.tax_rates (tenant_id, code, name, jurisdiction, rate_percent) VALUES
  (NULL,'GST-0',   'GST 0% (Exempt)','IN', 0),
  (NULL,'GST-5',   'GST 5%',         'IN', 5),
  (NULL,'GST-12',  'GST 12%',        'IN',12),
  (NULL,'GST-18',  'GST 18%',        'IN',18),
  (NULL,'GST-28',  'GST 28%',        'IN',28),
  (NULL,'IGST-5',  'IGST 5%',        'IN', 5),
  (NULL,'IGST-12', 'IGST 12%',       'IN',12),
  (NULL,'IGST-18', 'IGST 18%',       'IN',18),
  (NULL,'IGST-28', 'IGST 28%',       'IN',28)
ON CONFLICT DO NOTHING;
