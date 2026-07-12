
-- =========================================================================
-- Phase 2.6 Pharmacy — Stage 1: Schema, RBAC helpers, RLS, GRANTs, Seeds
-- =========================================================================

-- 1. RBAC helper functions
CREATE OR REPLACE FUNCTION public.can_read_pharmacy(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND (public.has_permission(_user_id, 'pharmacy:read', NULL)
               OR public.has_permission(_user_id, 'pharmacy:write', NULL)
               OR public.has_permission(_user_id, 'pharmacy:dispense', NULL)
               OR public.has_permission(_user_id, 'pharmacy:manage', NULL)));
$$;

CREATE OR REPLACE FUNCTION public.can_write_pharmacy(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND (public.has_permission(_user_id, 'pharmacy:write', NULL)
               OR public.has_permission(_user_id, 'pharmacy:manage', NULL)));
$$;

CREATE OR REPLACE FUNCTION public.can_dispense_controlled(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id, 'pharmacy:dispense_controlled', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_approve_purchase(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id, 'pharmacy:approve_purchase', NULL));
$$;

-- 2. Drug Master
CREATE TABLE public.pharmacy_drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  code text NOT NULL,
  name text NOT NULL,
  generic_name text,
  brand_name text,
  manufacturer text,
  category_code text,
  form_code text,
  strength text,
  strength_value numeric,
  strength_unit_code text,
  pack_size numeric,
  pack_unit_code text,
  base_unit_code text NOT NULL,
  storage_condition_code text,
  controlled_schedule_code text,
  requires_prescription boolean NOT NULL DEFAULT true,
  is_cold_chain boolean NOT NULL DEFAULT false,
  hsn_code text,
  barcode text,
  clinical_code_system_id uuid REFERENCES public.clinical_code_systems(id),
  clinical_code text,
  atc_code text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX ix_pharmacy_drugs_tenant ON public.pharmacy_drugs(tenant_id);
CREATE INDEX ix_pharmacy_drugs_name ON public.pharmacy_drugs USING gin (name gin_trgm_ops);
CREATE INDEX ix_pharmacy_drugs_generic ON public.pharmacy_drugs USING gin (generic_name gin_trgm_ops);
CREATE INDEX ix_pharmacy_drugs_barcode ON public.pharmacy_drugs(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX ix_pharmacy_drugs_atc ON public.pharmacy_drugs(atc_code) WHERE atc_code IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_drugs TO authenticated;
GRANT ALL ON public.pharmacy_drugs TO service_role;
ALTER TABLE public.pharmacy_drugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_drugs_read" ON public.pharmacy_drugs FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_drugs_write" ON public.pharmacy_drugs FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_drugs_updated BEFORE UPDATE ON public.pharmacy_drugs FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_drugs_actor BEFORE INSERT OR UPDATE ON public.pharmacy_drugs FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_drug_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_type text NOT NULL DEFAULT 'brand',
  language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (drug_id, alias, alias_type)
);
CREATE INDEX ix_pharmacy_drug_aliases_alias ON public.pharmacy_drug_aliases USING gin (alias gin_trgm_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_drug_aliases TO authenticated;
GRANT ALL ON public.pharmacy_drug_aliases TO service_role;
ALTER TABLE public.pharmacy_drug_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_drug_aliases_read" ON public.pharmacy_drug_aliases FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_drug_aliases_write" ON public.pharmacy_drug_aliases FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_drug_aliases_updated BEFORE UPDATE ON public.pharmacy_drug_aliases FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_drug_aliases_actor BEFORE INSERT OR UPDATE ON public.pharmacy_drug_aliases FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 3. Warehouse hierarchy
CREATE TABLE public.pharmacy_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  parent_id uuid REFERENCES public.pharmacy_warehouses(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  warehouse_type text NOT NULL,
  address jsonb,
  gstin text,
  drug_license_no text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX ix_pharmacy_warehouses_tenant ON public.pharmacy_warehouses(tenant_id);
CREATE INDEX ix_pharmacy_warehouses_parent ON public.pharmacy_warehouses(parent_id);
CREATE INDEX ix_pharmacy_warehouses_branch ON public.pharmacy_warehouses(branch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_warehouses TO authenticated;
GRANT ALL ON public.pharmacy_warehouses TO service_role;
ALTER TABLE public.pharmacy_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_warehouses_read" ON public.pharmacy_warehouses FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_warehouses_write" ON public.pharmacy_warehouses FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_warehouses_updated BEFORE UPDATE ON public.pharmacy_warehouses FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_warehouses_actor BEFORE INSERT OR UPDATE ON public.pharmacy_warehouses FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'general',
  temperature_min_c numeric,
  temperature_max_c numeric,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (warehouse_id, code)
);
CREATE INDEX ix_pharmacy_warehouse_locations_tenant ON public.pharmacy_warehouse_locations(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_warehouse_locations TO authenticated;
GRANT ALL ON public.pharmacy_warehouse_locations TO service_role;
ALTER TABLE public.pharmacy_warehouse_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_warehouse_locations_read" ON public.pharmacy_warehouse_locations FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_warehouse_locations_write" ON public.pharmacy_warehouse_locations FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_wh_loc_updated BEFORE UPDATE ON public.pharmacy_warehouse_locations FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_wh_loc_actor BEFORE INSERT OR UPDATE ON public.pharmacy_warehouse_locations FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_warehouse_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.pharmacy_warehouse_locations(id) ON DELETE SET NULL,
  code text NOT NULL,
  rack text,
  shelf text,
  bin text,
  capacity numeric,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (warehouse_id, code)
);
CREATE INDEX ix_pharmacy_warehouse_bins_tenant ON public.pharmacy_warehouse_bins(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_warehouse_bins TO authenticated;
GRANT ALL ON public.pharmacy_warehouse_bins TO service_role;
ALTER TABLE public.pharmacy_warehouse_bins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_warehouse_bins_read" ON public.pharmacy_warehouse_bins FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_warehouse_bins_write" ON public.pharmacy_warehouse_bins FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_wh_bin_updated BEFORE UPDATE ON public.pharmacy_warehouse_bins FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_wh_bin_actor BEFORE INSERT OR UPDATE ON public.pharmacy_warehouse_bins FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 4. Suppliers
CREATE TABLE public.pharmacy_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  legal_name text,
  gstin text,
  drug_license_no text,
  contact_person text,
  phone text,
  email text,
  address jsonb,
  payment_terms text,
  lead_time_days integer,
  supplier_score numeric,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX ix_pharmacy_suppliers_tenant ON public.pharmacy_suppliers(tenant_id);
CREATE INDEX ix_pharmacy_suppliers_name ON public.pharmacy_suppliers USING gin (name gin_trgm_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_suppliers TO authenticated;
GRANT ALL ON public.pharmacy_suppliers TO service_role;
ALTER TABLE public.pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_suppliers_read" ON public.pharmacy_suppliers FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_suppliers_write" ON public.pharmacy_suppliers FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_suppliers_updated BEFORE UPDATE ON public.pharmacy_suppliers FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_suppliers_actor BEFORE INSERT OR UPDATE ON public.pharmacy_suppliers FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.pharmacy_suppliers(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE CASCADE,
  supplier_sku text,
  last_price numeric,
  last_price_currency text DEFAULT 'INR',
  last_price_at timestamptz,
  moq numeric,
  lead_time_days integer,
  is_preferred boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (supplier_id, drug_id)
);
CREATE INDEX ix_pharmacy_supplier_products_tenant ON public.pharmacy_supplier_products(tenant_id);
CREATE INDEX ix_pharmacy_supplier_products_drug ON public.pharmacy_supplier_products(drug_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_supplier_products TO authenticated;
GRANT ALL ON public.pharmacy_supplier_products TO service_role;
ALTER TABLE public.pharmacy_supplier_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_supplier_products_read" ON public.pharmacy_supplier_products FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_supplier_products_write" ON public.pharmacy_supplier_products FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_sp_updated BEFORE UPDATE ON public.pharmacy_supplier_products FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_sp_actor BEFORE INSERT OR UPDATE ON public.pharmacy_supplier_products FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 5. Batches
CREATE TABLE public.pharmacy_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_no text NOT NULL,
  lot_no text,
  manufacture_date date,
  expiry_date date NOT NULL,
  manufacturer text,
  supplier_id uuid REFERENCES public.pharmacy_suppliers(id) ON DELETE SET NULL,
  mrp numeric,
  cost_price numeric,
  hsn_code text,
  gst_percent numeric,
  is_quarantined boolean NOT NULL DEFAULT false,
  quarantine_reason text,
  is_recalled boolean NOT NULL DEFAULT false,
  recall_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, drug_id, batch_no)
);
CREATE INDEX ix_pharmacy_batches_tenant ON public.pharmacy_batches(tenant_id);
CREATE INDEX ix_pharmacy_batches_expiry ON public.pharmacy_batches(expiry_date);
CREATE INDEX ix_pharmacy_batches_drug_expiry ON public.pharmacy_batches(drug_id, expiry_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_batches TO authenticated;
GRANT ALL ON public.pharmacy_batches TO service_role;
ALTER TABLE public.pharmacy_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_batches_read" ON public.pharmacy_batches FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_batches_write" ON public.pharmacy_batches FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharmacy_batches_updated BEFORE UPDATE ON public.pharmacy_batches FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharmacy_batches_actor BEFORE INSERT OR UPDATE ON public.pharmacy_batches FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 6. Inventory Ledger (immutable append-only)
CREATE TABLE public.pharmacy_inventory_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.pharmacy_warehouse_locations(id) ON DELETE SET NULL,
  bin_id uuid REFERENCES public.pharmacy_warehouse_bins(id) ON DELETE SET NULL,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_code text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  correlation_id uuid,
  reverses_id uuid REFERENCES public.pharmacy_inventory_ledger(id) ON DELETE SET NULL,
  reason_code text,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_pharm_ledger_tenant ON public.pharmacy_inventory_ledger(tenant_id);
CREATE INDEX ix_pharm_ledger_wh_drug ON public.pharmacy_inventory_ledger(warehouse_id, drug_id, batch_id);
CREATE INDEX ix_pharm_ledger_source ON public.pharmacy_inventory_ledger(source_type, source_id);
CREATE INDEX ix_pharm_ledger_occurred ON public.pharmacy_inventory_ledger(occurred_at);
GRANT SELECT, INSERT ON public.pharmacy_inventory_ledger TO authenticated;
GRANT ALL ON public.pharmacy_inventory_ledger TO service_role;
ALTER TABLE public.pharmacy_inventory_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_ledger_read" ON public.pharmacy_inventory_ledger FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharmacy_ledger_insert" ON public.pharmacy_inventory_ledger FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));

-- 7. Stock on hand + reservations
CREATE TABLE public.pharmacy_stock_on_hand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.pharmacy_warehouse_locations(id) ON DELETE SET NULL,
  bin_id uuid REFERENCES public.pharmacy_warehouse_bins(id) ON DELETE SET NULL,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  quantity_reserved numeric NOT NULL DEFAULT 0,
  unit_code text NOT NULL,
  last_movement_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_pharm_soh_key ON public.pharmacy_stock_on_hand (
  tenant_id, warehouse_id,
  COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(bin_id, '00000000-0000-0000-0000-000000000000'::uuid),
  drug_id,
  COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE INDEX ix_pharm_soh_tenant ON public.pharmacy_stock_on_hand(tenant_id);
CREATE INDEX ix_pharm_soh_drug ON public.pharmacy_stock_on_hand(drug_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_stock_on_hand TO authenticated;
GRANT ALL ON public.pharmacy_stock_on_hand TO service_role;
ALTER TABLE public.pharmacy_stock_on_hand ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_soh_read" ON public.pharmacy_stock_on_hand FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_soh_write" ON public.pharmacy_stock_on_hand FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_soh_updated BEFORE UPDATE ON public.pharmacy_stock_on_hand FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

CREATE TABLE public.pharmacy_stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_code text NOT NULL,
  reserved_for_type text NOT NULL,
  reserved_for_id uuid,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_res_tenant ON public.pharmacy_stock_reservations(tenant_id);
CREATE INDEX ix_pharm_res_target ON public.pharmacy_stock_reservations(reserved_for_type, reserved_for_id);
CREATE INDEX ix_pharm_res_status ON public.pharmacy_stock_reservations(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_stock_reservations TO authenticated;
GRANT ALL ON public.pharmacy_stock_reservations TO service_role;
ALTER TABLE public.pharmacy_stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_res_read" ON public.pharmacy_stock_reservations FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_res_write" ON public.pharmacy_stock_reservations FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_res_updated BEFORE UPDATE ON public.pharmacy_stock_reservations FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_res_actor BEFORE INSERT OR UPDATE ON public.pharmacy_stock_reservations FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 8. PO + GRN
CREATE TABLE public.pharmacy_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.pharmacy_warehouses(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.pharmacy_suppliers(id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric,
  tax_total numeric,
  discount_total numeric,
  grand_total numeric,
  notes text,
  approval_request_id uuid REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  approved_by uuid,
  approved_at timestamptz,
  sent_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, po_number)
);
CREATE INDEX ix_pharm_po_tenant ON public.pharmacy_purchase_orders(tenant_id);
CREATE INDEX ix_pharm_po_supplier ON public.pharmacy_purchase_orders(supplier_id);
CREATE INDEX ix_pharm_po_status ON public.pharmacy_purchase_orders(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_purchase_orders TO authenticated;
GRANT ALL ON public.pharmacy_purchase_orders TO service_role;
ALTER TABLE public.pharmacy_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_po_read" ON public.pharmacy_purchase_orders FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_po_write" ON public.pharmacy_purchase_orders FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_po_updated BEFORE UPDATE ON public.pharmacy_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_po_actor BEFORE INSERT OR UPDATE ON public.pharmacy_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  po_id uuid NOT NULL REFERENCES public.pharmacy_purchase_orders(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  quantity_ordered numeric NOT NULL,
  unit_code text NOT NULL,
  unit_price numeric,
  discount_percent numeric,
  tax_percent numeric,
  quantity_received numeric NOT NULL DEFAULT 0,
  line_total numeric,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_po_items_tenant ON public.pharmacy_purchase_order_items(tenant_id);
CREATE INDEX ix_pharm_po_items_po ON public.pharmacy_purchase_order_items(po_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_purchase_order_items TO authenticated;
GRANT ALL ON public.pharmacy_purchase_order_items TO service_role;
ALTER TABLE public.pharmacy_purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_po_items_read" ON public.pharmacy_purchase_order_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_po_items_write" ON public.pharmacy_purchase_order_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_po_items_updated BEFORE UPDATE ON public.pharmacy_purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_po_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  po_id uuid REFERENCES public.pharmacy_purchase_orders(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.pharmacy_suppliers(id) ON DELETE SET NULL,
  grn_number text NOT NULL,
  grn_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_number text,
  invoice_date date,
  status text NOT NULL DEFAULT 'draft',
  posted_at timestamptz,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, grn_number)
);
CREATE INDEX ix_pharm_grn_tenant ON public.pharmacy_goods_receipts(tenant_id);
CREATE INDEX ix_pharm_grn_po ON public.pharmacy_goods_receipts(po_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_goods_receipts TO authenticated;
GRANT ALL ON public.pharmacy_goods_receipts TO service_role;
ALTER TABLE public.pharmacy_goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_grn_read" ON public.pharmacy_goods_receipts FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_grn_write" ON public.pharmacy_goods_receipts FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_grn_updated BEFORE UPDATE ON public.pharmacy_goods_receipts FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_grn_actor BEFORE INSERT OR UPDATE ON public.pharmacy_goods_receipts FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  grn_id uuid NOT NULL REFERENCES public.pharmacy_goods_receipts(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES public.pharmacy_purchase_order_items(id) ON DELETE SET NULL,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE SET NULL,
  quantity_received numeric NOT NULL,
  unit_code text NOT NULL,
  unit_cost numeric,
  location_id uuid REFERENCES public.pharmacy_warehouse_locations(id) ON DELETE SET NULL,
  bin_id uuid REFERENCES public.pharmacy_warehouse_bins(id) ON DELETE SET NULL,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_grn_items_tenant ON public.pharmacy_goods_receipt_items(tenant_id);
CREATE INDEX ix_pharm_grn_items_grn ON public.pharmacy_goods_receipt_items(grn_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_goods_receipt_items TO authenticated;
GRANT ALL ON public.pharmacy_goods_receipt_items TO service_role;
ALTER TABLE public.pharmacy_goods_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_grn_items_read" ON public.pharmacy_goods_receipt_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_grn_items_write" ON public.pharmacy_goods_receipt_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_grn_items_updated BEFORE UPDATE ON public.pharmacy_goods_receipt_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_grn_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_goods_receipt_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 9. Dispenses + Prescription Fills
CREATE TABLE public.pharmacy_dispenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  patient_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  prescription_id uuid REFERENCES public.clinical_prescriptions(id) ON DELETE SET NULL,
  dispense_number text NOT NULL,
  dispense_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft',
  dispensed_by uuid,
  patient_signature_ref text,
  counselling_notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, dispense_number)
);
CREATE INDEX ix_pharm_disp_tenant ON public.pharmacy_dispenses(tenant_id);
CREATE INDEX ix_pharm_disp_patient ON public.pharmacy_dispenses(patient_id);
CREATE INDEX ix_pharm_disp_prescription ON public.pharmacy_dispenses(prescription_id);
CREATE INDEX ix_pharm_disp_status ON public.pharmacy_dispenses(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_dispenses TO authenticated;
GRANT ALL ON public.pharmacy_dispenses TO service_role;
ALTER TABLE public.pharmacy_dispenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_disp_read" ON public.pharmacy_dispenses FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_disp_write" ON public.pharmacy_dispenses FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_disp_updated BEFORE UPDATE ON public.pharmacy_dispenses FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_disp_actor BEFORE INSERT OR UPDATE ON public.pharmacy_dispenses FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_dispense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  dispense_id uuid NOT NULL REFERENCES public.pharmacy_dispenses(id) ON DELETE CASCADE,
  prescription_item_id uuid REFERENCES public.clinical_prescription_items(id) ON DELETE SET NULL,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_code text NOT NULL,
  unit_price numeric,
  substituted_from_drug_id uuid REFERENCES public.pharmacy_drugs(id) ON DELETE SET NULL,
  substitution_reason text,
  kit_id uuid,
  is_controlled boolean NOT NULL DEFAULT false,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_disp_items_tenant ON public.pharmacy_dispense_items(tenant_id);
CREATE INDEX ix_pharm_disp_items_disp ON public.pharmacy_dispense_items(dispense_id);
CREATE INDEX ix_pharm_disp_items_drug ON public.pharmacy_dispense_items(drug_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_dispense_items TO authenticated;
GRANT ALL ON public.pharmacy_dispense_items TO service_role;
ALTER TABLE public.pharmacy_dispense_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_disp_items_read" ON public.pharmacy_dispense_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_disp_items_write" ON public.pharmacy_dispense_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_disp_items_updated BEFORE UPDATE ON public.pharmacy_dispense_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_disp_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_dispense_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_prescription_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.clinical_prescriptions(id) ON DELETE CASCADE,
  prescription_item_id uuid REFERENCES public.clinical_prescription_items(id) ON DELETE SET NULL,
  dispense_id uuid REFERENCES public.pharmacy_dispenses(id) ON DELETE SET NULL,
  dispense_item_id uuid REFERENCES public.pharmacy_dispense_items(id) ON DELETE SET NULL,
  fill_number integer NOT NULL DEFAULT 1,
  quantity_filled numeric NOT NULL,
  unit_code text NOT NULL,
  filled_at timestamptz NOT NULL DEFAULT now(),
  next_refill_due date,
  status text NOT NULL DEFAULT 'completed',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_fill_tenant ON public.pharmacy_prescription_fills(tenant_id);
CREATE INDEX ix_pharm_fill_prescription ON public.pharmacy_prescription_fills(prescription_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_prescription_fills TO authenticated;
GRANT ALL ON public.pharmacy_prescription_fills TO service_role;
ALTER TABLE public.pharmacy_prescription_fills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_fill_read" ON public.pharmacy_prescription_fills FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_fill_write" ON public.pharmacy_prescription_fills FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_fill_updated BEFORE UPDATE ON public.pharmacy_prescription_fills FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_fill_actor BEFORE INSERT OR UPDATE ON public.pharmacy_prescription_fills FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 10. Returns
CREATE TABLE public.pharmacy_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  return_number text NOT NULL,
  return_date timestamptz NOT NULL DEFAULT now(),
  return_type text NOT NULL,
  source_type text,
  source_id uuid,
  supplier_id uuid REFERENCES public.pharmacy_suppliers(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  reason_code text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, return_number)
);
CREATE INDEX ix_pharm_ret_tenant ON public.pharmacy_returns(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_returns TO authenticated;
GRANT ALL ON public.pharmacy_returns TO service_role;
ALTER TABLE public.pharmacy_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_ret_read" ON public.pharmacy_returns FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_ret_write" ON public.pharmacy_returns FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_ret_updated BEFORE UPDATE ON public.pharmacy_returns FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_ret_actor BEFORE INSERT OR UPDATE ON public.pharmacy_returns FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  return_id uuid NOT NULL REFERENCES public.pharmacy_returns(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_code text NOT NULL,
  disposition text NOT NULL DEFAULT 'restock',
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_ret_items_tenant ON public.pharmacy_return_items(tenant_id);
CREATE INDEX ix_pharm_ret_items_return ON public.pharmacy_return_items(return_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_return_items TO authenticated;
GRANT ALL ON public.pharmacy_return_items TO service_role;
ALTER TABLE public.pharmacy_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_ret_items_read" ON public.pharmacy_return_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_ret_items_write" ON public.pharmacy_return_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_ret_items_updated BEFORE UPDATE ON public.pharmacy_return_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_ret_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_return_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 11. Transfers
CREATE TABLE public.pharmacy_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  transfer_number text NOT NULL,
  transfer_date timestamptz NOT NULL DEFAULT now(),
  from_warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  shipped_at timestamptz,
  received_at timestamptz,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, transfer_number)
);
CREATE INDEX ix_pharm_tr_tenant ON public.pharmacy_transfers(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_transfers TO authenticated;
GRANT ALL ON public.pharmacy_transfers TO service_role;
ALTER TABLE public.pharmacy_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_tr_read" ON public.pharmacy_transfers FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_tr_write" ON public.pharmacy_transfers FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_tr_updated BEFORE UPDATE ON public.pharmacy_transfers FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_tr_actor BEFORE INSERT OR UPDATE ON public.pharmacy_transfers FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  transfer_id uuid NOT NULL REFERENCES public.pharmacy_transfers(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_code text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_tr_items_tenant ON public.pharmacy_transfer_items(tenant_id);
CREATE INDEX ix_pharm_tr_items_transfer ON public.pharmacy_transfer_items(transfer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_transfer_items TO authenticated;
GRANT ALL ON public.pharmacy_transfer_items TO service_role;
ALTER TABLE public.pharmacy_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_tr_items_read" ON public.pharmacy_transfer_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_tr_items_write" ON public.pharmacy_transfer_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_tr_items_updated BEFORE UPDATE ON public.pharmacy_transfer_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_tr_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_transfer_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 12. Controlled Drug Register (append-only)
CREATE TABLE public.pharmacy_controlled_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE RESTRICT,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
  schedule_code text NOT NULL,
  entry_type text NOT NULL,
  quantity_in numeric NOT NULL DEFAULT 0,
  quantity_out numeric NOT NULL DEFAULT 0,
  balance_after numeric NOT NULL,
  unit_code text NOT NULL,
  reference_type text,
  reference_id uuid,
  prescriber_id uuid,
  patient_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  dispensed_by uuid,
  witness_id uuid,
  witness_signature_ref text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  discrepancy_flag boolean NOT NULL DEFAULT false,
  discrepancy_notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX ix_pharm_ctrl_tenant ON public.pharmacy_controlled_register(tenant_id);
CREATE INDEX ix_pharm_ctrl_wh_drug ON public.pharmacy_controlled_register(warehouse_id, drug_id, occurred_at);
CREATE INDEX ix_pharm_ctrl_discrepancy ON public.pharmacy_controlled_register(discrepancy_flag) WHERE discrepancy_flag = true;
GRANT SELECT, INSERT ON public.pharmacy_controlled_register TO authenticated;
GRANT ALL ON public.pharmacy_controlled_register TO service_role;
ALTER TABLE public.pharmacy_controlled_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_ctrl_read" ON public.pharmacy_controlled_register FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_ctrl_insert" ON public.pharmacy_controlled_register FOR INSERT TO authenticated
  WITH CHECK (public.can_dispense_controlled(auth.uid(), tenant_id));

-- 13. Cold-chain logs (append-only)
CREATE TABLE public.pharmacy_coldchain_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.pharmacy_warehouse_locations(id) ON DELETE SET NULL,
  device_id text,
  temperature_c numeric NOT NULL,
  humidity_percent numeric,
  reading_at timestamptz NOT NULL DEFAULT now(),
  is_excursion boolean NOT NULL DEFAULT false,
  excursion_threshold jsonb,
  quarantine_triggered boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX ix_pharm_cc_tenant ON public.pharmacy_coldchain_logs(tenant_id);
CREATE INDEX ix_pharm_cc_wh_time ON public.pharmacy_coldchain_logs(warehouse_id, reading_at);
CREATE INDEX ix_pharm_cc_excursion ON public.pharmacy_coldchain_logs(is_excursion) WHERE is_excursion = true;
GRANT SELECT, INSERT ON public.pharmacy_coldchain_logs TO authenticated;
GRANT ALL ON public.pharmacy_coldchain_logs TO service_role;
ALTER TABLE public.pharmacy_coldchain_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_cc_read" ON public.pharmacy_coldchain_logs FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_cc_insert" ON public.pharmacy_coldchain_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));

-- 14. Drug Recalls
CREATE TABLE public.pharmacy_drug_recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  recall_number text NOT NULL,
  drug_id uuid REFERENCES public.pharmacy_drugs(id) ON DELETE SET NULL,
  manufacturer text,
  regulator_reference text,
  recall_class text,
  reason text NOT NULL,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  scope jsonb,
  completed_at timestamptz,
  workflow_run_id uuid REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, recall_number)
);
CREATE INDEX ix_pharm_recall_tenant ON public.pharmacy_drug_recalls(tenant_id);
CREATE INDEX ix_pharm_recall_status ON public.pharmacy_drug_recalls(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_drug_recalls TO authenticated;
GRANT ALL ON public.pharmacy_drug_recalls TO service_role;
ALTER TABLE public.pharmacy_drug_recalls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_recall_read" ON public.pharmacy_drug_recalls FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_recall_write" ON public.pharmacy_drug_recalls FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_recall_updated BEFORE UPDATE ON public.pharmacy_drug_recalls FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_recall_actor BEFORE INSERT OR UPDATE ON public.pharmacy_drug_recalls FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_drug_recall_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  recall_id uuid NOT NULL REFERENCES public.pharmacy_drug_recalls(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.pharmacy_batches(id) ON DELETE SET NULL,
  batch_no text,
  lot_no text,
  expiry_from date,
  expiry_to date,
  quantity_in_field numeric,
  quantity_returned numeric NOT NULL DEFAULT 0,
  quantity_destroyed numeric NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_recall_items_tenant ON public.pharmacy_drug_recall_items(tenant_id);
CREATE INDEX ix_pharm_recall_items_recall ON public.pharmacy_drug_recall_items(recall_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_drug_recall_items TO authenticated;
GRANT ALL ON public.pharmacy_drug_recall_items TO service_role;
ALTER TABLE public.pharmacy_drug_recall_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_recall_items_read" ON public.pharmacy_drug_recall_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_recall_items_write" ON public.pharmacy_drug_recall_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_recall_items_updated BEFORE UPDATE ON public.pharmacy_drug_recall_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_recall_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_drug_recall_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

ALTER TABLE public.pharmacy_batches
  ADD CONSTRAINT fk_pharm_batches_recall
  FOREIGN KEY (recall_id) REFERENCES public.pharmacy_drug_recalls(id) ON DELETE SET NULL;

-- 15. Medication Kits
CREATE TABLE public.pharmacy_medication_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX ix_pharm_kit_tenant ON public.pharmacy_medication_kits(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_medication_kits TO authenticated;
GRANT ALL ON public.pharmacy_medication_kits TO service_role;
ALTER TABLE public.pharmacy_medication_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_kit_read" ON public.pharmacy_medication_kits FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_kit_write" ON public.pharmacy_medication_kits FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_kit_updated BEFORE UPDATE ON public.pharmacy_medication_kits FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_kit_actor BEFORE INSERT OR UPDATE ON public.pharmacy_medication_kits FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_medication_kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  kit_id uuid NOT NULL REFERENCES public.pharmacy_medication_kits(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL,
  unit_code text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_substitutable boolean NOT NULL DEFAULT false,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (kit_id, drug_id)
);
CREATE INDEX ix_pharm_kit_items_tenant ON public.pharmacy_medication_kit_items(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_medication_kit_items TO authenticated;
GRANT ALL ON public.pharmacy_medication_kit_items TO service_role;
ALTER TABLE public.pharmacy_medication_kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_kit_items_read" ON public.pharmacy_medication_kit_items FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_kit_items_write" ON public.pharmacy_medication_kit_items FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_kit_items_updated BEFORE UPDATE ON public.pharmacy_medication_kit_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_kit_items_actor BEFORE INSERT OR UPDATE ON public.pharmacy_medication_kit_items FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

ALTER TABLE public.pharmacy_dispense_items
  ADD CONSTRAINT fk_pharm_disp_items_kit
  FOREIGN KEY (kit_id) REFERENCES public.pharmacy_medication_kits(id) ON DELETE SET NULL;

-- 16. Forecasting reserved (Addendum B — no engine)
CREATE TABLE public.pharmacy_inventory_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE CASCADE,
  horizon_days integer NOT NULL,
  forecast_from date NOT NULL,
  forecast_to date NOT NULL,
  predicted_demand numeric NOT NULL,
  confidence_lower numeric,
  confidence_upper numeric,
  model text,
  model_version text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX ix_pharm_fc_tenant ON public.pharmacy_inventory_forecasts(tenant_id);
CREATE INDEX ix_pharm_fc_drug ON public.pharmacy_inventory_forecasts(drug_id, forecast_from);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_inventory_forecasts TO authenticated;
GRANT ALL ON public.pharmacy_inventory_forecasts TO service_role;
ALTER TABLE public.pharmacy_inventory_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_fc_read" ON public.pharmacy_inventory_forecasts FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_fc_write" ON public.pharmacy_inventory_forecasts FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));

CREATE TABLE public.pharmacy_seasonal_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  season_code text NOT NULL,
  drug_id uuid REFERENCES public.pharmacy_drugs(id) ON DELETE CASCADE,
  category_code text,
  multiplier numeric NOT NULL DEFAULT 1,
  effective_from date NOT NULL,
  effective_to date NOT NULL,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_seasonal_tenant ON public.pharmacy_seasonal_forecasts(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_seasonal_forecasts TO authenticated;
GRANT ALL ON public.pharmacy_seasonal_forecasts TO service_role;
ALTER TABLE public.pharmacy_seasonal_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_seasonal_read" ON public.pharmacy_seasonal_forecasts FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_seasonal_write" ON public.pharmacy_seasonal_forecasts FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_seasonal_updated BEFORE UPDATE ON public.pharmacy_seasonal_forecasts FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_seasonal_actor BEFORE INSERT OR UPDATE ON public.pharmacy_seasonal_forecasts FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.pharmacy_demand_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  warehouse_id uuid REFERENCES public.pharmacy_warehouses(id) ON DELETE CASCADE,
  drug_id uuid NOT NULL REFERENCES public.pharmacy_drugs(id) ON DELETE CASCADE,
  pattern_kind text NOT NULL,
  pattern jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline numeric,
  last_learned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX ix_pharm_dp_tenant ON public.pharmacy_demand_patterns(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_demand_patterns TO authenticated;
GRANT ALL ON public.pharmacy_demand_patterns TO service_role;
ALTER TABLE public.pharmacy_demand_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm_dp_read" ON public.pharmacy_demand_patterns FOR SELECT TO authenticated
  USING (public.can_read_pharmacy(auth.uid(), tenant_id));
CREATE POLICY "pharm_dp_write" ON public.pharmacy_demand_patterns FOR ALL TO authenticated
  USING (public.can_write_pharmacy(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_pharmacy(auth.uid(), tenant_id));
CREATE TRIGGER trg_pharm_dp_updated BEFORE UPDATE ON public.pharmacy_demand_patterns FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_pharm_dp_actor BEFORE INSERT OR UPDATE ON public.pharmacy_demand_patterns FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- 17. RBAC
INSERT INTO public.roles (code, name, level, description, is_customer_facing) VALUES
  ('pharmacist', 'Pharmacist', 40, 'Dispenses medicines, manages branch pharmacy operations', false),
  ('pharmacy_manager', 'Pharmacy Manager', 60, 'Manages pharmacy operations, procurement and staff', false),
  ('controlled_drugs_officer', 'Controlled Drugs Officer', 70, 'Custody and audit of controlled/scheduled drugs', false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('pharmacy:read', 'pharmacy', 'read', 'Read pharmacy inventory, batches, dispenses'),
  ('pharmacy:write', 'pharmacy', 'write', 'Write pharmacy records'),
  ('pharmacy:dispense', 'pharmacy', 'dispense', 'Dispense non-controlled medications'),
  ('pharmacy:dispense_controlled', 'pharmacy', 'dispense_controlled', 'Dispense controlled/scheduled drugs'),
  ('pharmacy:approve_purchase', 'pharmacy', 'approve_purchase', 'Approve purchase orders'),
  ('pharmacy:manage', 'pharmacy', 'manage', 'Full pharmacy management'),
  ('pharmacy:recall', 'pharmacy', 'recall', 'Initiate and manage drug recalls'),
  ('pharmacy:transfer', 'pharmacy', 'transfer', 'Create and receive inter-warehouse transfers'),
  ('pharmacy:coldchain', 'pharmacy', 'coldchain', 'Manage cold-chain monitoring and quarantine')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code) VALUES
  ('super_admin', 'pharmacy:read'), ('super_admin', 'pharmacy:write'),
  ('super_admin', 'pharmacy:dispense'), ('super_admin', 'pharmacy:dispense_controlled'),
  ('super_admin', 'pharmacy:approve_purchase'), ('super_admin', 'pharmacy:manage'),
  ('super_admin', 'pharmacy:recall'), ('super_admin', 'pharmacy:transfer'),
  ('super_admin', 'pharmacy:coldchain'),
  ('platform_admin', 'pharmacy:read'), ('platform_admin', 'pharmacy:manage'),
  ('corporate_admin', 'pharmacy:read'), ('corporate_admin', 'pharmacy:manage'),
  ('corporate_admin', 'pharmacy:approve_purchase'), ('corporate_admin', 'pharmacy:recall'),
  ('master_franchise', 'pharmacy:read'), ('master_franchise', 'pharmacy:approve_purchase'),
  ('franchise_owner', 'pharmacy:read'), ('franchise_owner', 'pharmacy:approve_purchase'),
  ('center_manager', 'pharmacy:read'), ('center_manager', 'pharmacy:write'),
  ('center_manager', 'pharmacy:approve_purchase'), ('center_manager', 'pharmacy:transfer'),
  ('pharmacy_manager', 'pharmacy:read'), ('pharmacy_manager', 'pharmacy:write'),
  ('pharmacy_manager', 'pharmacy:dispense'), ('pharmacy_manager', 'pharmacy:manage'),
  ('pharmacy_manager', 'pharmacy:approve_purchase'), ('pharmacy_manager', 'pharmacy:transfer'),
  ('pharmacy_manager', 'pharmacy:coldchain'), ('pharmacy_manager', 'pharmacy:recall'),
  ('pharmacist', 'pharmacy:read'), ('pharmacist', 'pharmacy:write'),
  ('pharmacist', 'pharmacy:dispense'), ('pharmacist', 'pharmacy:transfer'),
  ('controlled_drugs_officer', 'pharmacy:read'),
  ('controlled_drugs_officer', 'pharmacy:dispense'),
  ('controlled_drugs_officer', 'pharmacy:dispense_controlled'),
  ('inventory_manager', 'pharmacy:read'), ('inventory_manager', 'pharmacy:write'),
  ('inventory_manager', 'pharmacy:transfer'), ('inventory_manager', 'pharmacy:coldchain'),
  ('purchase_manager', 'pharmacy:read'), ('purchase_manager', 'pharmacy:write'),
  ('purchase_manager', 'pharmacy:approve_purchase'),
  ('doctor', 'pharmacy:read'), ('nutritionist', 'pharmacy:read'),
  ('skin_consultant', 'pharmacy:read'), ('hair_consultant', 'pharmacy:read'),
  ('therapist', 'pharmacy:read'), ('accounts', 'pharmacy:read')
ON CONFLICT DO NOTHING;

-- 18. Master types
INSERT INTO public.master_types (code, name, description, supports_hierarchy, is_system, display_order) VALUES
  ('pharmacy_drug_categories',   'Pharmacy Drug Categories',   'Therapeutic categories for drugs', true,  true, 100),
  ('pharmacy_drug_forms',        'Pharmacy Drug Forms',        'Dosage forms (tablet, capsule, syrup, etc.)', false, true, 101),
  ('pharmacy_drug_units',        'Pharmacy Drug Units',        'Base units of measure (mg, ml, tab, etc.)', false, true, 102),
  ('pharmacy_storage_conditions','Pharmacy Storage Conditions','Storage requirements (room, cool, cold, frozen)', false, true, 103),
  ('pharmacy_controlled_schedules','Pharmacy Controlled Schedules','Controlled drug schedules (H, H1, X, G)', false, true, 104),
  ('pharmacy_adjustment_reasons','Pharmacy Adjustment Reasons','Reasons for inventory adjustments', false, true, 105),
  ('pharmacy_return_reasons',    'Pharmacy Return Reasons',    'Reasons for returns', false, true, 106)
ON CONFLICT (code) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS ux_masters_global_type_code
  ON public.masters (type_code, code) WHERE tenant_id IS NULL;

INSERT INTO public.masters (tenant_id, type_code, code, name, is_system, display_order) VALUES
  (NULL, 'pharmacy_drug_categories', 'analgesic',        'Analgesic',           true, 10),
  (NULL, 'pharmacy_drug_categories', 'antibiotic',       'Antibiotic',          true, 20),
  (NULL, 'pharmacy_drug_categories', 'antihistamine',    'Antihistamine',       true, 30),
  (NULL, 'pharmacy_drug_categories', 'antifungal',       'Antifungal',          true, 40),
  (NULL, 'pharmacy_drug_categories', 'dermatology',      'Dermatology',         true, 50),
  (NULL, 'pharmacy_drug_categories', 'hair_care',        'Hair Care',           true, 60),
  (NULL, 'pharmacy_drug_categories', 'nutritional',      'Nutritional / Supplements', true, 70),
  (NULL, 'pharmacy_drug_categories', 'topical',          'Topical',             true, 80),
  (NULL, 'pharmacy_drug_categories', 'injectable',       'Injectable',          true, 90),
  (NULL, 'pharmacy_drug_categories', 'procedure_consumable', 'Procedure Consumable', true, 100),
  (NULL, 'pharmacy_drug_forms', 'tablet',   'Tablet',   true, 10),
  (NULL, 'pharmacy_drug_forms', 'capsule',  'Capsule',  true, 20),
  (NULL, 'pharmacy_drug_forms', 'syrup',    'Syrup',    true, 30),
  (NULL, 'pharmacy_drug_forms', 'injection','Injection',true, 40),
  (NULL, 'pharmacy_drug_forms', 'cream',    'Cream',    true, 50),
  (NULL, 'pharmacy_drug_forms', 'ointment', 'Ointment', true, 60),
  (NULL, 'pharmacy_drug_forms', 'gel',      'Gel',      true, 70),
  (NULL, 'pharmacy_drug_forms', 'lotion',   'Lotion',   true, 80),
  (NULL, 'pharmacy_drug_forms', 'solution', 'Solution', true, 90),
  (NULL, 'pharmacy_drug_forms', 'powder',   'Powder',   true, 100),
  (NULL, 'pharmacy_drug_forms', 'sachet',   'Sachet',   true, 110),
  (NULL, 'pharmacy_drug_forms', 'kit',      'Kit',      true, 120),
  (NULL, 'pharmacy_drug_units', 'tab',   'Tablet',      true, 10),
  (NULL, 'pharmacy_drug_units', 'cap',   'Capsule',     true, 20),
  (NULL, 'pharmacy_drug_units', 'ml',    'Millilitre',  true, 30),
  (NULL, 'pharmacy_drug_units', 'mg',    'Milligram',   true, 40),
  (NULL, 'pharmacy_drug_units', 'g',     'Gram',        true, 50),
  (NULL, 'pharmacy_drug_units', 'vial',  'Vial',        true, 60),
  (NULL, 'pharmacy_drug_units', 'amp',   'Ampoule',     true, 70),
  (NULL, 'pharmacy_drug_units', 'tube',  'Tube',        true, 80),
  (NULL, 'pharmacy_drug_units', 'bottle','Bottle',      true, 90),
  (NULL, 'pharmacy_drug_units', 'sachet','Sachet',      true, 100),
  (NULL, 'pharmacy_drug_units', 'pcs',   'Piece',       true, 110),
  (NULL, 'pharmacy_drug_units', 'kit',   'Kit',         true, 120),
  (NULL, 'pharmacy_storage_conditions', 'room',   'Room temperature (15-25C)',    true, 10),
  (NULL, 'pharmacy_storage_conditions', 'cool',   'Cool (8-15C)',                 true, 20),
  (NULL, 'pharmacy_storage_conditions', 'cold',   'Refrigerated (2-8C)',          true, 30),
  (NULL, 'pharmacy_storage_conditions', 'frozen', 'Frozen (<0C)',                 true, 40),
  (NULL, 'pharmacy_storage_conditions', 'dry',    'Dry place, protect from light',true, 50),
  (NULL, 'pharmacy_controlled_schedules', 'none', 'Non-controlled', true, 10),
  (NULL, 'pharmacy_controlled_schedules', 'G',    'Schedule G',     true, 20),
  (NULL, 'pharmacy_controlled_schedules', 'H',    'Schedule H',     true, 30),
  (NULL, 'pharmacy_controlled_schedules', 'H1',   'Schedule H1',    true, 40),
  (NULL, 'pharmacy_controlled_schedules', 'X',    'Schedule X',     true, 50),
  (NULL, 'pharmacy_adjustment_reasons', 'physical_count',     'Physical count variance', true, 10),
  (NULL, 'pharmacy_adjustment_reasons', 'damage',             'Damage / breakage',       true, 20),
  (NULL, 'pharmacy_adjustment_reasons', 'expiry',             'Expiry write-off',        true, 30),
  (NULL, 'pharmacy_adjustment_reasons', 'theft',              'Theft / loss',            true, 40),
  (NULL, 'pharmacy_adjustment_reasons', 'system_correction',  'System correction',       true, 50),
  (NULL, 'pharmacy_adjustment_reasons', 'sample_use',         'Sample / internal use',   true, 60),
  (NULL, 'pharmacy_return_reasons', 'patient_unused',    'Patient - unused',            true, 10),
  (NULL, 'pharmacy_return_reasons', 'patient_reaction',  'Patient - adverse reaction',  true, 20),
  (NULL, 'pharmacy_return_reasons', 'wrong_dispense',    'Wrong dispense',              true, 30),
  (NULL, 'pharmacy_return_reasons', 'near_expiry',       'Near expiry return',          true, 40),
  (NULL, 'pharmacy_return_reasons', 'damaged_receipt',   'Damaged on receipt',          true, 50),
  (NULL, 'pharmacy_return_reasons', 'supplier_recall',   'Supplier recall',             true, 60)
ON CONFLICT DO NOTHING;

-- 19. Initial global medication catalog
INSERT INTO public.pharmacy_drugs
  (tenant_id, code, name, generic_name, form_code, strength, base_unit_code, category_code,
   storage_condition_code, controlled_schedule_code, requires_prescription, is_active)
VALUES
  (NULL, 'GDRUG-0001', 'Paracetamol 500mg Tablet',     'Paracetamol',    'tablet',   '500 mg',   'tab', 'analgesic',     'room', NULL, false, true),
  (NULL, 'GDRUG-0002', 'Ibuprofen 400mg Tablet',       'Ibuprofen',      'tablet',   '400 mg',   'tab', 'analgesic',     'room', NULL, false, true),
  (NULL, 'GDRUG-0003', 'Cetirizine 10mg Tablet',       'Cetirizine',     'tablet',   '10 mg',    'tab', 'antihistamine', 'room', NULL, false, true),
  (NULL, 'GDRUG-0004', 'Levocetirizine 5mg Tablet',    'Levocetirizine', 'tablet',   '5 mg',     'tab', 'antihistamine', 'room', NULL, true,  true),
  (NULL, 'GDRUG-0005', 'Amoxicillin 500mg Capsule',    'Amoxicillin',    'capsule',  '500 mg',   'cap', 'antibiotic',    'room', 'H',  true,  true),
  (NULL, 'GDRUG-0006', 'Azithromycin 500mg Tablet',    'Azithromycin',   'tablet',   '500 mg',   'tab', 'antibiotic',    'room', 'H',  true,  true),
  (NULL, 'GDRUG-0007', 'Doxycycline 100mg Capsule',    'Doxycycline',    'capsule',  '100 mg',   'cap', 'antibiotic',    'room', 'H',  true,  true),
  (NULL, 'GDRUG-0008', 'Isotretinoin 20mg Capsule',    'Isotretinoin',   'capsule',  '20 mg',    'cap', 'dermatology',   'room', 'H',  true,  true),
  (NULL, 'GDRUG-0009', 'Finasteride 1mg Tablet',       'Finasteride',    'tablet',   '1 mg',     'tab', 'hair_care',     'room', 'H',  true,  true),
  (NULL, 'GDRUG-0010', 'Minoxidil 5% Topical Solution','Minoxidil',      'solution', '5 %',      'ml',  'hair_care',     'room', NULL, false, true),
  (NULL, 'GDRUG-0011', 'Ketoconazole 2% Shampoo',      'Ketoconazole',   'lotion',   '2 %',      'ml',  'hair_care',     'room', NULL, false, true),
  (NULL, 'GDRUG-0012', 'Clobetasol 0.05% Cream',       'Clobetasol',     'cream',    '0.05 %',   'g',   'dermatology',   'room', 'H',  true,  true),
  (NULL, 'GDRUG-0013', 'Tretinoin 0.025% Cream',       'Tretinoin',      'cream',    '0.025 %',  'g',   'dermatology',   'room', NULL, true,  true),
  (NULL, 'GDRUG-0014', 'Hydroquinone 4% Cream',        'Hydroquinone',   'cream',    '4 %',      'g',   'dermatology',   'room', NULL, true,  true),
  (NULL, 'GDRUG-0015', 'Terbinafine 250mg Tablet',     'Terbinafine',    'tablet',   '250 mg',   'tab', 'antifungal',    'room', 'H',  true,  true),
  (NULL, 'GDRUG-0016', 'Fluconazole 150mg Capsule',    'Fluconazole',    'capsule',  '150 mg',   'cap', 'antifungal',    'room', 'H',  true,  true),
  (NULL, 'GDRUG-0017', 'Biotin 10mg Tablet',           'Biotin',         'tablet',   '10 mg',    'tab', 'nutritional',   'room', NULL, false, true),
  (NULL, 'GDRUG-0018', 'Vitamin D3 60000 IU Sachet',   'Cholecalciferol','sachet',   '60000 IU', 'sachet','nutritional', 'room', NULL, false, true),
  (NULL, 'GDRUG-0019', 'Lignocaine 2% Injection',      'Lignocaine',     'injection','2 %',      'ml',  'injectable',    'cold', 'H',  true,  true),
  (NULL, 'GDRUG-0020', 'PRP Procedure Kit',            NULL,             'kit',      NULL,       'kit', 'procedure_consumable', 'room', NULL, false, true)
ON CONFLICT (tenant_id, code) DO NOTHING;
