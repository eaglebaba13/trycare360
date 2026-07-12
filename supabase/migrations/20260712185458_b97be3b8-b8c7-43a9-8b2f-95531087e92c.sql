
-- =========================================================================
-- Phase 2.9 Stage 1 — Enterprise Finance & Accounting Schema
-- =========================================================================
-- All tables share the platform standard: tenant_id + org_unit_id scope,
-- audit timestamps, RLS gated by has_permission()/is_super_admin().
-- Reuses existing org_units, tenants, branches, roles, profiles, auth.users.
-- =========================================================================

-- Reusable updated_at trigger helper (idempotent)
CREATE OR REPLACE FUNCTION public.fin_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================================
-- 1. FISCAL CALENDAR
-- =========================================================================
CREATE TABLE public.fin_fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_fiscal_years TO authenticated;
GRANT ALL ON public.fin_fiscal_years TO service_role;
ALTER TABLE public.fin_fiscal_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_fy_read ON public.fin_fiscal_years FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_fy_write ON public.fin_fiscal_years FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_fy_updated BEFORE UPDATE ON public.fin_fiscal_years
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES public.fin_fiscal_years(id) ON DELETE CASCADE,
  code text NOT NULL,
  period_number int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year_id, period_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_accounting_periods TO authenticated;
GRANT ALL ON public.fin_accounting_periods TO service_role;
ALTER TABLE public.fin_accounting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_ap_read ON public.fin_accounting_periods FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_ap_write ON public.fin_accounting_periods FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_ap_updated BEFORE UPDATE ON public.fin_accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 2. CHART OF ACCOUNTS + COST/PROFIT CENTERS
-- =========================================================================
CREATE TABLE public.fin_chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL, -- asset | liability | equity | income | expense
  account_subtype text,
  parent_id uuid REFERENCES public.fin_chart_of_accounts(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'INR',
  is_group boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  gst_applicable boolean NOT NULL DEFAULT false,
  tds_applicable boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_chart_of_accounts TO authenticated;
GRANT ALL ON public.fin_chart_of_accounts TO service_role;
ALTER TABLE public.fin_chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_coa_read ON public.fin_chart_of_accounts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_coa_write ON public.fin_chart_of_accounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_coa_updated BEFORE UPDATE ON public.fin_chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.fin_cost_centers(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_cost_centers TO authenticated;
GRANT ALL ON public.fin_cost_centers TO service_role;
ALTER TABLE public.fin_cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_cc_read ON public.fin_cost_centers FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_cc_write ON public.fin_cost_centers FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_cc_updated BEFORE UPDATE ON public.fin_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_profit_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_profit_centers TO authenticated;
GRANT ALL ON public.fin_profit_centers TO service_role;
ALTER TABLE public.fin_profit_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_pc_read ON public.fin_profit_centers FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_pc_write ON public.fin_profit_centers FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_pc_updated BEFORE UPDATE ON public.fin_profit_centers
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 3. JOURNAL ENTRIES / LINES (GENERAL LEDGER)
-- =========================================================================
CREATE TABLE public.fin_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period_id uuid REFERENCES public.fin_accounting_periods(id) ON DELETE SET NULL,
  entry_number text NOT NULL,
  entry_date date NOT NULL,
  reference_type text,
  reference_id uuid,
  source_module text NOT NULL DEFAULT 'manual', -- billing|revenue|pharmacy|lab|payroll|manual|royalty|asset|commission
  description text,
  currency text NOT NULL DEFAULT 'INR',
  fx_rate numeric(18,6) NOT NULL DEFAULT 1,
  total_debit numeric(18,2) NOT NULL DEFAULT 0,
  total_credit numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft|posted|reversed|void
  posted_at timestamptz,
  posted_by uuid REFERENCES auth.users(id),
  reversed_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  approval_request_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entry_number)
);
CREATE INDEX fin_je_period_idx ON public.fin_journal_entries(period_id);
CREATE INDEX fin_je_branch_idx ON public.fin_journal_entries(branch_id);
CREATE INDEX fin_je_ref_idx ON public.fin_journal_entries(reference_type, reference_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_journal_entries TO authenticated;
GRANT ALL ON public.fin_journal_entries TO service_role;
ALTER TABLE public.fin_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_je_read ON public.fin_journal_entries FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_je_write ON public.fin_journal_entries FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_je_updated BEFORE UPDATE ON public.fin_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES public.fin_journal_entries(id) ON DELETE CASCADE,
  line_number int NOT NULL,
  account_id uuid NOT NULL REFERENCES public.fin_chart_of_accounts(id),
  cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  profit_center_id uuid REFERENCES public.fin_profit_centers(id),
  branch_id uuid REFERENCES public.branches(id),
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  description text,
  partner_type text,   -- customer|vendor|employee|patient|franchise
  partner_id uuid,
  tax_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_jl_entry_idx ON public.fin_journal_lines(journal_entry_id);
CREATE INDEX fin_jl_account_idx ON public.fin_journal_lines(account_id);
CREATE INDEX fin_jl_partner_idx ON public.fin_journal_lines(partner_type, partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_journal_lines TO authenticated;
GRANT ALL ON public.fin_journal_lines TO service_role;
ALTER TABLE public.fin_journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_jl_read ON public.fin_journal_lines FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_jl_write ON public.fin_journal_lines FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_jl_updated BEFORE UPDATE ON public.fin_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 4. BANKING, CASH, RECEIPTS, PAYMENTS, PETTY CASH
-- =========================================================================
CREATE TABLE public.fin_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  gl_account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  code text NOT NULL,
  name text NOT NULL,
  bank_name text,
  account_number text,
  ifsc text,
  swift text,
  currency text NOT NULL DEFAULT 'INR',
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_bank_accounts TO authenticated;
GRANT ALL ON public.fin_bank_accounts TO service_role;
ALTER TABLE public.fin_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_bank_read ON public.fin_bank_accounts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_bank_write ON public.fin_bank_accounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_bank_updated BEFORE UPDATE ON public.fin_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_cash_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  gl_account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  code text NOT NULL,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_cash_books TO authenticated;
GRANT ALL ON public.fin_cash_books TO service_role;
ALTER TABLE public.fin_cash_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_cb_read ON public.fin_cash_books FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_cb_write ON public.fin_cash_books FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_cb_updated BEFORE UPDATE ON public.fin_cash_books
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  receipt_date date NOT NULL,
  bank_account_id uuid REFERENCES public.fin_bank_accounts(id),
  cash_book_id uuid REFERENCES public.fin_cash_books(id),
  partner_type text NOT NULL, -- patient|customer|franchise|other
  partner_id uuid,
  method text NOT NULL, -- cash|card|upi|neft|rtgs|cheque|other
  reference text,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'draft',
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  source_module text,
  source_reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, receipt_number)
);
CREATE INDEX fin_rc_partner_idx ON public.fin_receipts(partner_type, partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_receipts TO authenticated;
GRANT ALL ON public.fin_receipts TO service_role;
ALTER TABLE public.fin_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_rc_read ON public.fin_receipts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_rc_write ON public.fin_receipts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_rc_updated BEFORE UPDATE ON public.fin_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  payment_number text NOT NULL,
  payment_date date NOT NULL,
  bank_account_id uuid REFERENCES public.fin_bank_accounts(id),
  cash_book_id uuid REFERENCES public.fin_cash_books(id),
  partner_type text NOT NULL, -- vendor|employee|franchise|tax_authority|other
  partner_id uuid,
  method text NOT NULL,
  reference text,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'draft',
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  source_module text,
  source_reference_id uuid,
  approval_request_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, payment_number)
);
CREATE INDEX fin_py_partner_idx ON public.fin_payments(partner_type, partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_payments TO authenticated;
GRANT ALL ON public.fin_payments TO service_role;
ALTER TABLE public.fin_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_py_read ON public.fin_payments FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_py_write ON public.fin_payments FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_py_updated BEFORE UPDATE ON public.fin_payments
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_petty_cash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  cash_book_id uuid REFERENCES public.fin_cash_books(id),
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  category text,
  purpose text,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  approval_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, voucher_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_petty_cash TO authenticated;
GRANT ALL ON public.fin_petty_cash TO service_role;
ALTER TABLE public.fin_petty_cash ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_pc2_read ON public.fin_petty_cash FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_pc2_write ON public.fin_petty_cash FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_pc2_updated BEFORE UPDATE ON public.fin_petty_cash
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.fin_bank_accounts(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  closing_balance numeric(18,2) NOT NULL DEFAULT 0,
  reconciled_balance numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  matched_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  unmatched_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_bank_reconciliations TO authenticated;
GRANT ALL ON public.fin_bank_reconciliations TO service_role;
ALTER TABLE public.fin_bank_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_br_read ON public.fin_bank_reconciliations FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_br_write ON public.fin_bank_reconciliations FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_br_updated BEFORE UPDATE ON public.fin_bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 5. EXPENSES + REVENUE RECOGNITION
-- =========================================================================
CREATE TABLE public.fin_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  expense_number text NOT NULL,
  expense_date date NOT NULL,
  category text,
  vendor_id uuid,
  employee_id uuid REFERENCES public.employees(id),
  account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  amount numeric(18,2) NOT NULL,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'draft',
  approval_request_id uuid,
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, expense_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_expenses TO authenticated;
GRANT ALL ON public.fin_expenses TO service_role;
ALTER TABLE public.fin_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_ex_read ON public.fin_expenses FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_ex_write ON public.fin_expenses FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_ex_updated BEFORE UPDATE ON public.fin_expenses
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_revenue_recognition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  source_module text NOT NULL,
  source_reference_id uuid,
  invoice_id uuid,
  service_date date,
  recognition_date date NOT NULL,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending', -- pending|recognized|deferred|reversed
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  deferral_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_rr_source_idx ON public.fin_revenue_recognition(source_module, source_reference_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_revenue_recognition TO authenticated;
GRANT ALL ON public.fin_revenue_recognition TO service_role;
ALTER TABLE public.fin_revenue_recognition ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_rr_read ON public.fin_revenue_recognition FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_rr_write ON public.fin_revenue_recognition FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_rr_updated BEFORE UPDATE ON public.fin_revenue_recognition
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 6. FIXED ASSETS & DEPRECIATION
-- =========================================================================
CREATE TABLE public.fin_fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  asset_code text NOT NULL,
  name text NOT NULL,
  category text,
  asset_account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  depreciation_account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  accumulated_dep_account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  acquisition_date date NOT NULL,
  acquisition_cost numeric(18,2) NOT NULL,
  salvage_value numeric(18,2) NOT NULL DEFAULT 0,
  useful_life_months int NOT NULL,
  depreciation_method text NOT NULL DEFAULT 'straight_line',
  status text NOT NULL DEFAULT 'active',
  disposed_at date,
  disposal_value numeric(18,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, asset_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_fixed_assets TO authenticated;
GRANT ALL ON public.fin_fixed_assets TO service_role;
ALTER TABLE public.fin_fixed_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_fa_read ON public.fin_fixed_assets FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_fa_write ON public.fin_fixed_assets FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_fa_updated BEFORE UPDATE ON public.fin_fixed_assets
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_depreciation_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.fin_fixed_assets(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.fin_accounting_periods(id) ON DELETE SET NULL,
  schedule_date date NOT NULL,
  depreciation_amount numeric(18,2) NOT NULL,
  accumulated_depreciation numeric(18,2) NOT NULL,
  book_value numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_dep_asset_idx ON public.fin_depreciation_schedule(asset_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_depreciation_schedule TO authenticated;
GRANT ALL ON public.fin_depreciation_schedule TO service_role;
ALTER TABLE public.fin_depreciation_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_dep_read ON public.fin_depreciation_schedule FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_dep_write ON public.fin_depreciation_schedule FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_dep_updated BEFORE UPDATE ON public.fin_depreciation_schedule
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 7. BUDGETS & FORECASTS
-- =========================================================================
CREATE TABLE public.fin_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  fiscal_year_id uuid REFERENCES public.fin_fiscal_years(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES public.fin_cost_centers(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  budget_type text NOT NULL DEFAULT 'annual',
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'INR',
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_budgets TO authenticated;
GRANT ALL ON public.fin_budgets TO service_role;
ALTER TABLE public.fin_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_bd_read ON public.fin_budgets FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_bd_write ON public.fin_budgets FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_bd_updated BEFORE UPDATE ON public.fin_budgets
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  budget_id uuid NOT NULL REFERENCES public.fin_budgets(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  period_id uuid REFERENCES public.fin_accounting_periods(id),
  amount numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_bl_budget_idx ON public.fin_budget_lines(budget_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_budget_lines TO authenticated;
GRANT ALL ON public.fin_budget_lines TO service_role;
ALTER TABLE public.fin_budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_bl_read ON public.fin_budget_lines FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_bl_write ON public.fin_budget_lines FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_bl_updated BEFORE UPDATE ON public.fin_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  fiscal_year_id uuid REFERENCES public.fin_fiscal_years(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  forecast_type text NOT NULL DEFAULT 'revenue',
  horizon_months int NOT NULL DEFAULT 12,
  scenario text NOT NULL DEFAULT 'baseline',
  data_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz,
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code, scenario)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_forecasts TO authenticated;
GRANT ALL ON public.fin_forecasts TO service_role;
ALTER TABLE public.fin_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_fc_read ON public.fin_forecasts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_fc_write ON public.fin_forecasts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_fc_updated BEFORE UPDATE ON public.fin_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 8. BRANCH / FRANCHISE P&L + INTERCOMPANY
-- =========================================================================
CREATE TABLE public.fin_branch_pnl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.fin_accounting_periods(id) ON DELETE CASCADE,
  revenue numeric(18,2) NOT NULL DEFAULT 0,
  cogs numeric(18,2) NOT NULL DEFAULT 0,
  gross_profit numeric(18,2) NOT NULL DEFAULT 0,
  operating_expense numeric(18,2) NOT NULL DEFAULT 0,
  ebitda numeric(18,2) NOT NULL DEFAULT 0,
  depreciation numeric(18,2) NOT NULL DEFAULT 0,
  interest numeric(18,2) NOT NULL DEFAULT 0,
  tax numeric(18,2) NOT NULL DEFAULT 0,
  net_profit numeric(18,2) NOT NULL DEFAULT 0,
  royalty numeric(18,2) NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, period_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_branch_pnl TO authenticated;
GRANT ALL ON public.fin_branch_pnl TO service_role;
ALTER TABLE public.fin_branch_pnl ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_bpnl_read ON public.fin_branch_pnl FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_bpnl_write ON public.fin_branch_pnl FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_bpnl_updated BEFORE UPDATE ON public.fin_branch_pnl
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_franchise_pnl (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  franchise_org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.fin_accounting_periods(id) ON DELETE CASCADE,
  revenue numeric(18,2) NOT NULL DEFAULT 0,
  royalty_due numeric(18,2) NOT NULL DEFAULT 0,
  royalty_paid numeric(18,2) NOT NULL DEFAULT 0,
  marketing_fee numeric(18,2) NOT NULL DEFAULT 0,
  net_payable numeric(18,2) NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_org_unit_id, period_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_franchise_pnl TO authenticated;
GRANT ALL ON public.fin_franchise_pnl TO service_role;
ALTER TABLE public.fin_franchise_pnl ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_fpnl_read ON public.fin_franchise_pnl FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_fpnl_write ON public.fin_franchise_pnl FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_fpnl_updated BEFORE UPDATE ON public.fin_franchise_pnl
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_intercompany_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  from_org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  to_org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  gl_account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  balance numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_intercompany_accounts TO authenticated;
GRANT ALL ON public.fin_intercompany_accounts TO service_role;
ALTER TABLE public.fin_intercompany_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_ic_read ON public.fin_intercompany_accounts FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_ic_write ON public.fin_intercompany_accounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_ic_updated BEFORE UPDATE ON public.fin_intercompany_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 9. ROYALTY ENGINE
-- =========================================================================
CREATE TABLE public.fin_royalty_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  franchise_org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  basis text NOT NULL DEFAULT 'revenue', -- revenue|gross_margin|fixed
  rate_pct numeric(6,3) NOT NULL DEFAULT 0,
  fixed_amount numeric(18,2) NOT NULL DEFAULT 0,
  minimum_amount numeric(18,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_royalty_rules TO authenticated;
GRANT ALL ON public.fin_royalty_rules TO service_role;
ALTER TABLE public.fin_royalty_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_rr2_read ON public.fin_royalty_rules FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_rr2_write ON public.fin_royalty_rules FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_rr2_updated BEFORE UPDATE ON public.fin_royalty_rules
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_royalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  franchise_org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.fin_royalty_rules(id) ON DELETE SET NULL,
  period_id uuid REFERENCES public.fin_accounting_periods(id) ON DELETE SET NULL,
  revenue_basis numeric(18,2) NOT NULL DEFAULT 0,
  computed_amount numeric(18,2) NOT NULL DEFAULT 0,
  adjustments numeric(18,2) NOT NULL DEFAULT 0,
  final_amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'accrued',
  settlement_id uuid,
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_rl_franchise_idx ON public.fin_royalty_ledger(franchise_org_unit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_royalty_ledger TO authenticated;
GRANT ALL ON public.fin_royalty_ledger TO service_role;
ALTER TABLE public.fin_royalty_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_rl_read ON public.fin_royalty_ledger FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_rl_write ON public.fin_royalty_ledger FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_rl_updated BEFORE UPDATE ON public.fin_royalty_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_royalty_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  franchise_org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  settlement_number text NOT NULL,
  settlement_date date NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL,
  ledger_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  gross_amount numeric(18,2) NOT NULL DEFAULT 0,
  adjustments numeric(18,2) NOT NULL DEFAULT 0,
  net_amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  payment_id uuid REFERENCES public.fin_payments(id) ON DELETE SET NULL,
  approval_request_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, settlement_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_royalty_settlements TO authenticated;
GRANT ALL ON public.fin_royalty_settlements TO service_role;
ALTER TABLE public.fin_royalty_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_rs_read ON public.fin_royalty_settlements FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_rs_write ON public.fin_royalty_settlements FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_rs_updated BEFORE UPDATE ON public.fin_royalty_settlements
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 10. VENDOR BILLS + AP LEDGER
-- =========================================================================
CREATE TABLE public.fin_vendor_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  vendor_id uuid,
  bill_number text NOT NULL,
  vendor_invoice_ref text,
  bill_date date NOT NULL,
  due_date date,
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  paid_amount numeric(18,2) NOT NULL DEFAULT 0,
  balance_amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  source_module text,
  source_reference_id uuid,
  approval_request_id uuid,
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, bill_number)
);
CREATE INDEX fin_vb_vendor_idx ON public.fin_vendor_bills(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_vendor_bills TO authenticated;
GRANT ALL ON public.fin_vendor_bills TO service_role;
ALTER TABLE public.fin_vendor_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_vb_read ON public.fin_vendor_bills FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_vb_write ON public.fin_vendor_bills FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_vb_updated BEFORE UPDATE ON public.fin_vendor_bills
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_vendor_bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.fin_vendor_bills(id) ON DELETE CASCADE,
  line_number int NOT NULL,
  account_id uuid REFERENCES public.fin_chart_of_accounts(id),
  cost_center_id uuid REFERENCES public.fin_cost_centers(id),
  description text,
  quantity numeric(18,3) NOT NULL DEFAULT 1,
  unit_price numeric(18,2) NOT NULL DEFAULT 0,
  tax_code text,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_vbi_bill_idx ON public.fin_vendor_bill_items(bill_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_vendor_bill_items TO authenticated;
GRANT ALL ON public.fin_vendor_bill_items TO service_role;
ALTER TABLE public.fin_vendor_bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_vbi_read ON public.fin_vendor_bill_items FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_vbi_write ON public.fin_vendor_bill_items FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_vbi_updated BEFORE UPDATE ON public.fin_vendor_bill_items
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_ar_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  partner_type text NOT NULL,
  partner_id uuid,
  invoice_id uuid,
  entry_date date NOT NULL,
  reference text,
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'open',
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_ar_partner_idx ON public.fin_ar_ledger(partner_type, partner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_ar_ledger TO authenticated;
GRANT ALL ON public.fin_ar_ledger TO service_role;
ALTER TABLE public.fin_ar_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_ar_read ON public.fin_ar_ledger FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_ar_write ON public.fin_ar_ledger FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_ar_updated BEFORE UPDATE ON public.fin_ar_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_ap_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  vendor_id uuid,
  bill_id uuid REFERENCES public.fin_vendor_bills(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  reference text,
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'open',
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_ap_vendor_idx ON public.fin_ap_ledger(vendor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_ap_ledger TO authenticated;
GRANT ALL ON public.fin_ap_ledger TO service_role;
ALTER TABLE public.fin_ap_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_ap_read ON public.fin_ap_ledger FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_ap_write ON public.fin_ap_ledger FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_ap_updated BEFORE UPDATE ON public.fin_ap_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 11. TAX LEDGER (GST / TDS / TCS)
-- =========================================================================
CREATE TABLE public.fin_tax_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  tax_type text NOT NULL, -- gst_output|gst_input|tds|tcs|other
  tax_code text,
  gstin text,
  period_id uuid REFERENCES public.fin_accounting_periods(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  taxable_amount numeric(18,2) NOT NULL DEFAULT 0,
  rate_pct numeric(6,3) NOT NULL DEFAULT 0,
  cgst numeric(18,2) NOT NULL DEFAULT 0,
  sgst numeric(18,2) NOT NULL DEFAULT 0,
  igst numeric(18,2) NOT NULL DEFAULT 0,
  cess numeric(18,2) NOT NULL DEFAULT 0,
  tds_amount numeric(18,2) NOT NULL DEFAULT 0,
  tcs_amount numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'accrued',
  source_module text,
  source_reference_id uuid,
  journal_entry_id uuid REFERENCES public.fin_journal_entries(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_tax_period_idx ON public.fin_tax_ledger(period_id, tax_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_tax_ledger TO authenticated;
GRANT ALL ON public.fin_tax_ledger TO service_role;
ALTER TABLE public.fin_tax_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_tx_read ON public.fin_tax_ledger FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_tx_write ON public.fin_tax_ledger FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id))
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));
CREATE TRIGGER trg_fin_tx_updated BEFORE UPDATE ON public.fin_tax_ledger
  FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =========================================================================
-- 12. FINANCE AUDIT LOG
-- =========================================================================
CREATE TABLE public.fin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_al_entity_idx ON public.fin_audit_log(entity_type, entity_id);
CREATE INDEX fin_al_occurred_idx ON public.fin_audit_log(occurred_at);
GRANT SELECT, INSERT ON public.fin_audit_log TO authenticated;
GRANT ALL ON public.fin_audit_log TO service_role;
ALTER TABLE public.fin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_al_read ON public.fin_audit_log FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:read',org_unit_id));
CREATE POLICY fin_al_write ON public.fin_audit_log FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(),'finance:write',org_unit_id));

-- =========================================================================
-- 13. HELPER FUNCTIONS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fin_next_sequence(_tenant uuid, _kind text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n bigint; _prefix text;
BEGIN
  _prefix := upper(left(_kind,3));
  EXECUTE format('SELECT COALESCE(MAX(NULLIF(regexp_replace(%I, ''\D'', '''', ''g''), ''''))::bigint,0)+1 FROM public.%I WHERE tenant_id = $1',
    CASE _kind
      WHEN 'journal' THEN 'entry_number'
      WHEN 'receipt' THEN 'receipt_number'
      WHEN 'payment' THEN 'payment_number'
      WHEN 'expense' THEN 'expense_number'
      WHEN 'petty_cash' THEN 'voucher_number'
      WHEN 'vendor_bill' THEN 'bill_number'
      WHEN 'settlement' THEN 'settlement_number'
    END,
    CASE _kind
      WHEN 'journal' THEN 'fin_journal_entries'
      WHEN 'receipt' THEN 'fin_receipts'
      WHEN 'payment' THEN 'fin_payments'
      WHEN 'expense' THEN 'fin_expenses'
      WHEN 'petty_cash' THEN 'fin_petty_cash'
      WHEN 'vendor_bill' THEN 'fin_vendor_bills'
      WHEN 'settlement' THEN 'fin_royalty_settlements'
    END)
  INTO _n USING _tenant;
  RETURN _prefix || '-' || to_char(now(),'YYYYMM') || '-' || lpad(_n::text, 6, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.fin_journal_balance_check()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _dr numeric; _cr numeric;
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO _dr, _cr
    FROM public.fin_journal_lines WHERE journal_entry_id = NEW.id;
  IF NEW.status = 'posted' AND round(_dr,2) <> round(_cr,2) THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced (Dr % / Cr %)', NEW.entry_number, _dr, _cr;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_fin_je_balance BEFORE UPDATE ON public.fin_journal_entries
  FOR EACH ROW WHEN (NEW.status = 'posted') EXECUTE FUNCTION public.fin_journal_balance_check();
