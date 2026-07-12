
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('finance:read',            'finance', 'read',            'View finance & accounting records'),
  ('finance:write',           'finance', 'write',           'Create / edit finance & accounting records'),
  ('finance:post_journal',    'finance', 'post_journal',    'Post journal entries to the ledger'),
  ('finance:approve_expense', 'finance', 'approve_expense', 'Approve or reject employee/vendor expenses'),
  ('finance:approve_payment', 'finance', 'approve_payment', 'Approve outgoing payments and settlements'),
  ('finance:close_period',    'finance', 'close_period',    'Close monthly/annual accounting periods'),
  ('finance:manage_tax',      'finance', 'manage_tax',      'Manage GST/TDS/TCS ledger and returns'),
  ('finance:manage_royalty',  'finance', 'manage_royalty',  'Manage franchise royalty rules and settlements')
ON CONFLICT (code) DO NOTHING;

-- Full finance access
INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('super_admin'),('platform_admin'),('corporate_admin'),('accounts')) AS role(r)
CROSS JOIN (VALUES
  ('finance:read'),('finance:write'),('finance:post_journal'),
  ('finance:approve_expense'),('finance:approve_payment'),('finance:close_period'),
  ('finance:manage_tax'),('finance:manage_royalty')
) AS perm(p)
ON CONFLICT DO NOTHING;

-- Franchise / branch leaders — read + expense/payment approval
INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p FROM (VALUES ('center_manager'),('franchise_owner'),('master_franchise')) AS role(r)
CROSS JOIN (VALUES
  ('finance:read'),('finance:approve_expense'),('finance:approve_payment')
) AS perm(p)
ON CONFLICT DO NOTHING;

-- HR read-only for payroll reconciliation
INSERT INTO public.role_permissions (role_code, permission_code)
VALUES ('hr','finance:read')
ON CONFLICT DO NOTHING;
