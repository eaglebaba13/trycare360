-- Phase 2.5 Stage 5 — AI Clinical Assistant + Workflow Automation

CREATE TABLE public.clinical_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  kind text NOT NULL,
  target_type text,
  target_id uuid,
  title text NOT NULL,
  summary text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric,
  severity text,
  model text,
  model_version text,
  prompt_template_id uuid REFERENCES public.clinical_ai_prompt_templates(id) ON DELETE SET NULL,
  prompt_template_code text,
  prompt_template_version integer,
  conversation_id uuid,
  status text NOT NULL DEFAULT 'suggested',
  status_reason text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at timestamptz,
  applied_ref jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinical_ai_recs_tenant_idx ON public.clinical_ai_recommendations (tenant_id, status, created_at DESC);
CREATE INDEX clinical_ai_recs_encounter_idx ON public.clinical_ai_recommendations (encounter_id, kind);
CREATE INDEX clinical_ai_recs_patient_idx ON public.clinical_ai_recommendations (tenant_id, patient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_ai_recommendations TO authenticated;
GRANT ALL ON public.clinical_ai_recommendations TO service_role;
ALTER TABLE public.clinical_ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_recs read" ON public.clinical_ai_recommendations FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "ai_recs write" ON public.clinical_ai_recommendations FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_ai_recs_updated BEFORE UPDATE ON public.clinical_ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

CREATE TABLE public.clinical_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  prompt_template_id uuid REFERENCES public.clinical_ai_prompt_templates(id) ON DELETE SET NULL,
  prompt_template_code text,
  prompt_template_version integer,
  prompt text NOT NULL,
  system_prompt text,
  input_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  response text,
  response_json jsonb,
  model text NOT NULL,
  model_version text,
  tokens_input integer,
  tokens_output integer,
  latency_ms integer,
  cost_usd numeric,
  version integer NOT NULL DEFAULT 1,
  feedback text,
  feedback_note text,
  error text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinical_ai_conv_tenant_idx ON public.clinical_ai_conversations (tenant_id, created_at DESC);
CREATE INDEX clinical_ai_conv_encounter_idx ON public.clinical_ai_conversations (encounter_id, created_at DESC);
CREATE INDEX clinical_ai_conv_purpose_idx ON public.clinical_ai_conversations (tenant_id, purpose, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_ai_conversations TO authenticated;
GRANT ALL ON public.clinical_ai_conversations TO service_role;
ALTER TABLE public.clinical_ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conv read" ON public.clinical_ai_conversations FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "ai_conv write" ON public.clinical_ai_conversations FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_ai_conv_updated BEFORE UPDATE ON public.clinical_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

ALTER TABLE public.clinical_ai_recommendations
  ADD CONSTRAINT clinical_ai_recs_conversation_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.clinical_ai_conversations(id) ON DELETE SET NULL;

CREATE TABLE public.clinical_ai_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  before_state jsonb,
  after_state jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinical_ai_audit_entity_idx ON public.clinical_ai_audit (entity_type, entity_id, created_at DESC);
CREATE INDEX clinical_ai_audit_tenant_idx ON public.clinical_ai_audit (tenant_id, created_at DESC);
CREATE INDEX clinical_ai_audit_encounter_idx ON public.clinical_ai_audit (encounter_id, created_at DESC);
GRANT SELECT, INSERT ON public.clinical_ai_audit TO authenticated;
GRANT ALL ON public.clinical_ai_audit TO service_role;
ALTER TABLE public.clinical_ai_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_audit read" ON public.clinical_ai_audit FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "ai_audit write" ON public.clinical_ai_audit FOR INSERT TO authenticated
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));

-- Seed built-in AI prompt templates (tenant-null, inheritable by all tenants).
INSERT INTO public.clinical_ai_prompt_templates (tenant_id, code, name, purpose, prompt, model_hint, version, is_active)
VALUES
  (NULL, 'encounter_summary', 'Encounter Summary', 'summary',
    'You are a clinical scribe. Summarise the encounter context provided as JSON into a concise, patient-friendly summary in 4-6 short bullet points. Never invent diagnoses. Use "may indicate" wording. Output plain text only.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'soap_draft', 'SOAP Draft Generator', 'soap_draft',
    'You are a clinical documentation assistant. Given the encounter context, produce a DRAFT SOAP note as JSON with keys: subjective, objective, assessment, plan. Each value is an object with a `text` string field. Do not include markdown fences. Never diagnose autonomously — phrase assessment items with "possible" / "consider".',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'soap_improve', 'SOAP Improvement', 'soap_improve',
    'You are a clinical editor. Improve the clarity, structure and completeness of the SOAP note provided. Return JSON with keys subjective, objective, assessment, plan (each `{text}`). Preserve clinician intent. Never add new diagnoses.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'differential_diagnosis', 'Differential Diagnosis Suggestions', 'differential',
    'You are a diagnostic decision-support assistant (advisory only). From the encounter context, suggest up to 5 differential diagnoses as JSON array of {label, rationale, confidence (0-1), red_flags[], sources[]}. Output JSON only. This is NEVER a final diagnosis.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'treatment_suggestion', 'Treatment Protocol Suggestions', 'treatment_suggestion',
    'You are a treatment-planning assistant (advisory only). From the encounter context and any assessment, suggest up to 5 treatment options as JSON array of {label, rationale, confidence (0-1), contraindications[], expected_outcomes, sources[]}. Output JSON only.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'contraindication_check', 'Contraindication & Allergy Check', 'contraindication_check',
    'You are a medication safety assistant. Given the medication list, allergies and problems, list any potential contraindications, drug-drug interactions, or allergy conflicts as JSON array of {label, severity(low|moderate|high|critical), rationale, sources[]}. If none, return an empty array. Output JSON only.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'referral_letter', 'Referral Letter', 'referral_letter',
    'You are a clinical scribe. Draft a professional referral letter using the encounter context and referral reason. Plain-text business-letter format. Do not invent findings.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'visit_summary', 'Patient Visit Summary', 'visit_summary',
    'You are a clinical scribe. Write a friendly, plain-language visit summary for the patient (6th grade reading level). No jargon. Include: what was discussed, key advice, next steps, when to seek help.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'patient_instructions', 'Patient Instructions', 'patient_instructions',
    'You are a clinical scribe. Given the treatment plan and prescriptions, write clear step-by-step patient instructions (plain text, numbered list).',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'consultation_summary', 'Consultation Summary', 'consultation_summary',
    'You are a clinical scribe. Produce a concise consultation summary (max 8 lines) covering complaint, findings, assessment, plan.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'clinical_checklist', 'Clinical Checklist Suggestions', 'checklist',
    'You are a clinical safety assistant. From the encounter context, suggest a checklist of items the clinician should confirm before closing the encounter. JSON array of {item, category, why}. Output JSON only.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'followup_suggestion', 'Follow-up Suggestions', 'followup',
    'You are a scheduling assistant. Suggest follow-up options as JSON array of {reason, interval_days, priority(low|normal|high), notes}. Output JSON only.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'nutrition_suggestion', 'Nutrition Suggestions', 'nutrition',
    'You are a nutrition support assistant (advisory only, not a prescription). Suggest dietary guidance items as JSON array of {label, rationale, cautions[]}. Output JSON only.',
    'google/gemini-2.5-flash', 1, true),
  (NULL, 'referral_suggestion', 'Referral Suggestions', 'referral',
    'You are a care-coordination assistant. Suggest specialist referrals as JSON array of {specialty, reason, urgency(routine|soon|urgent)}. Output JSON only.',
    'google/gemini-2.5-flash', 1, true)
ON CONFLICT (code, version, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
