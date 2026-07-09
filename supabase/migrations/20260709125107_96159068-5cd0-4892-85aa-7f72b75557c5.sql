-- Phase 2.2 — AI Digital Consultation Platform

CREATE OR REPLACE FUNCTION public.assessment_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.assessment_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('hair','skin','nail','nutrition')),
  name text NOT NULL,
  description text,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  requires_photos boolean NOT NULL DEFAULT true,
  photo_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_model text,
  ai_system_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assessment_definitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_definitions TO authenticated;
GRANT ALL ON public.assessment_definitions TO service_role;
ALTER TABLE public.assessment_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_defs read all" ON public.assessment_definitions FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);
CREATE POLICY "assessment_defs admin write" ON public.assessment_definitions FOR ALL TO authenticated
  USING (public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL) OR public.has_role_at(auth.uid(),'corporate_admin',NULL))
  WITH CHECK (public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL) OR public.has_role_at(auth.uid(),'corporate_admin',NULL));

CREATE TABLE public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  definition_id uuid NOT NULL REFERENCES public.assessment_definitions(id),
  category text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','analyzing','completed','failed','abandoned')),
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  lead_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web',
  source text,
  campaign text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_city text,
  age int,
  gender text,
  consent_given boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress_pct int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessment_sessions_status_idx ON public.assessment_sessions(status);
CREATE INDEX assessment_sessions_person_idx ON public.assessment_sessions(person_id);
CREATE INDEX assessment_sessions_created_idx ON public.assessment_sessions(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_sessions TO authenticated;
GRANT ALL ON public.assessment_sessions TO service_role;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions staff read" ON public.assessment_sessions FOR SELECT TO authenticated USING (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL) OR public.has_role_at(auth.uid(),'corporate_admin',NULL)
  OR public.has_role_at(auth.uid(),'doctor',NULL) OR public.has_role_at(auth.uid(),'hair_consultant',NULL) OR public.has_role_at(auth.uid(),'skin_consultant',NULL)
  OR public.has_role_at(auth.uid(),'nutritionist',NULL) OR public.has_role_at(auth.uid(),'telecaller',NULL) OR public.has_role_at(auth.uid(),'center_manager',NULL)
);
CREATE POLICY "sessions staff write" ON public.assessment_sessions FOR ALL TO authenticated USING (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL) OR public.has_role_at(auth.uid(),'corporate_admin',NULL)
) WITH CHECK (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL) OR public.has_role_at(auth.uid(),'corporate_admin',NULL)
);

CREATE TABLE public.assessment_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  slot text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes int,
  width int,
  height int,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  ai_labels jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessment_photos_session_idx ON public.assessment_photos(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_photos TO authenticated;
GRANT ALL ON public.assessment_photos TO service_role;
ALTER TABLE public.assessment_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos staff read" ON public.assessment_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos admin write" ON public.assessment_photos FOR ALL TO authenticated USING (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
) WITH CHECK (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
);

CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low','moderate','high','severe')),
  confidence numeric(5,2),
  scale_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  probable_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_raw jsonb,
  ai_model text,
  processing_ms int,
  urgency text CHECK (urgency IN ('routine','soon','urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_results TO authenticated;
GRANT ALL ON public.assessment_results TO service_role;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results staff read" ON public.assessment_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "results admin write" ON public.assessment_results FOR ALL TO authenticated USING (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
) WITH CHECK (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
);

CREATE TABLE public.assessment_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('doctor','treatment','product','test','membership','subscription','branch')),
  ref_id uuid,
  ref_slug text,
  title text NOT NULL,
  description text,
  reason text,
  priority int NOT NULL DEFAULT 5,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessment_recs_session_idx ON public.assessment_recommendations(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_recommendations TO authenticated;
GRANT ALL ON public.assessment_recommendations TO service_role;
ALTER TABLE public.assessment_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recs staff read" ON public.assessment_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "recs admin write" ON public.assessment_recommendations FOR ALL TO authenticated USING (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
) WITH CHECK (
  public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
);

CREATE TRIGGER trg_assessment_definitions_updated BEFORE UPDATE ON public.assessment_definitions
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_updated_at();
CREATE TRIGGER trg_assessment_sessions_updated BEFORE UPDATE ON public.assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_updated_at();
CREATE TRIGGER trg_assessment_results_updated BEFORE UPDATE ON public.assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.assessment_set_updated_at();

CREATE OR REPLACE FUNCTION public.assessment_start_public(
  p_definition_code text,
  p_channel text DEFAULT 'web',
  p_source text DEFAULT NULL,
  p_utm jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(session_id uuid, public_token text, definition jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_def public.assessment_definitions%ROWTYPE;
  v_session public.assessment_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_def FROM public.assessment_definitions
  WHERE code = p_definition_code AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'assessment definition not found: %', p_definition_code; END IF;

  INSERT INTO public.assessment_sessions (tenant_id, definition_id, category, channel, source, utm)
  VALUES (v_def.tenant_id, v_def.id, v_def.category, COALESCE(p_channel,'web'), p_source, COALESCE(p_utm,'{}'::jsonb))
  RETURNING * INTO v_session;

  RETURN QUERY SELECT v_session.id, v_session.public_token, jsonb_build_object(
    'code', v_def.code, 'name', v_def.name, 'category', v_def.category,
    'sections', v_def.sections, 'photo_slots', v_def.photo_slots,
    'requires_photos', v_def.requires_photos
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.assessment_start_public(text,text,text,jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assessment_save_public(
  p_public_token text,
  p_responses jsonb,
  p_progress_pct int DEFAULT NULL,
  p_contact jsonb DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.assessment_sessions WHERE public_token = p_public_token AND status = 'in_progress';
  IF NOT FOUND THEN RAISE EXCEPTION 'session not found or not editable'; END IF;

  UPDATE public.assessment_sessions SET
    responses = COALESCE(p_responses, responses),
    progress_pct = COALESCE(p_progress_pct, progress_pct),
    contact_name = COALESCE(p_contact->>'name', contact_name),
    contact_phone = COALESCE(p_contact->>'phone', contact_phone),
    contact_email = COALESCE(p_contact->>'email', contact_email),
    contact_city = COALESCE(p_contact->>'city', contact_city),
    age = COALESCE(NULLIF(p_contact->>'age','')::int, age),
    gender = COALESCE(p_contact->>'gender', gender)
  WHERE id = v_id;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.assessment_save_public(text,jsonb,int,jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assessment_submit_public(
  p_public_token text,
  p_consent boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT p_consent THEN RAISE EXCEPTION 'consent required'; END IF;
  SELECT id INTO v_id FROM public.assessment_sessions WHERE public_token = p_public_token AND status = 'in_progress';
  IF NOT FOUND THEN RAISE EXCEPTION 'session not found or already submitted'; END IF;

  UPDATE public.assessment_sessions SET
    status = 'submitted', consent_given = true, consent_at = now(), submitted_at = now()
  WHERE id = v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.assessment_submit_public(text,boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assessment_result_public(p_public_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'session', jsonb_build_object('id', s.id, 'status', s.status, 'category', s.category, 'contact_name', s.contact_name),
    'result', to_jsonb(r.*),
    'recommendations', COALESCE((SELECT jsonb_agg(to_jsonb(x.*) ORDER BY x.priority) FROM public.assessment_recommendations x WHERE x.session_id = s.id), '[]'::jsonb)
  ) INTO v
  FROM public.assessment_sessions s
  LEFT JOIN public.assessment_results r ON r.session_id = s.id
  WHERE s.public_token = p_public_token;
  IF v IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.assessment_result_public(text) TO anon, authenticated;

INSERT INTO public.assessment_definitions (code, category, name, description, requires_photos, photo_slots, sections) VALUES
('hair_v1','hair','Hair & Scalp Consultation','Comprehensive hair loss and scalp health analysis', true,
 '["front","top","left","right","hairline_zoom"]'::jsonb,
 '[
   {"id":"basics","title":"About You","questions":[
     {"id":"age","label":"Age","type":"number","required":true},
     {"id":"gender","label":"Gender","type":"select","options":["male","female","other"],"required":true},
     {"id":"duration","label":"How long have you noticed hair concerns?","type":"select","options":["<3 months","3-6 months","6-12 months","1-3 years",">3 years"]}
   ]},
   {"id":"pattern","title":"Pattern & Density","questions":[
     {"id":"norwood","label":"Norwood scale (males)","type":"select","options":["I","II","III","III-vertex","IV","V","VI","VII","not_sure"]},
     {"id":"ludwig","label":"Ludwig scale (females)","type":"select","options":["I","II","III","not_sure"]},
     {"id":"density","label":"Overall density","type":"select","options":["thick","normal","thinning","sparse"]},
     {"id":"hairline","label":"Hairline recession","type":"select","options":["none","mild","moderate","severe"]}
   ]},
   {"id":"scalp","title":"Scalp & Fall","questions":[
     {"id":"scalp","label":"Scalp condition","type":"multi","options":["dandruff","itchy","oily","dry","flaky","normal"]},
     {"id":"fall_count","label":"Hair fall/day","type":"select","options":["<50","50-100","100-200",">200"]},
     {"id":"breakage","label":"Frequent breakage?","type":"boolean"}
   ]},
   {"id":"lifestyle","title":"Stress, Sleep & History","questions":[
     {"id":"stress","label":"Stress (1-10)","type":"slider","min":1,"max":10},
     {"id":"sleep","label":"Sleep hours","type":"number"},
     {"id":"diet","label":"Diet quality","type":"select","options":["poor","average","good","excellent"]},
     {"id":"family_history","label":"Family history of hair loss?","type":"boolean"},
     {"id":"medical","label":"Medical conditions","type":"multi","options":["thyroid","pcos","diabetes","anemia","autoimmune","none"]}
   ]}
 ]'::jsonb),
('skin_v1','skin','Skin Analysis Consultation','AI-powered skin condition and rejuvenation assessment', true,
 '["front","left","right","zoom_concern"]'::jsonb,
 '[
   {"id":"basics","title":"About You","questions":[
     {"id":"age","label":"Age","type":"number","required":true},
     {"id":"gender","label":"Gender","type":"select","options":["male","female","other"]},
     {"id":"skin_type","label":"Skin type","type":"select","options":["oily","dry","combination","normal","sensitive"]}
   ]},
   {"id":"concerns","title":"Primary Concerns","questions":[
     {"id":"acne","label":"Acne severity","type":"select","options":["none","mild","moderate","severe","cystic"]},
     {"id":"pigmentation","label":"Pigmentation","type":"select","options":["none","mild","moderate","severe"]},
     {"id":"melasma","label":"Melasma present?","type":"boolean"},
     {"id":"wrinkles","label":"Wrinkles / fine lines","type":"select","options":["none","fine","moderate","deep"]},
     {"id":"oiliness","label":"Oiliness","type":"select","options":["low","medium","high"]},
     {"id":"dryness","label":"Dryness","type":"select","options":["low","medium","high"]},
     {"id":"hydration","label":"Hydration","type":"select","options":["dehydrated","normal","well_hydrated"]}
   ]},
   {"id":"exposure","title":"Sun & Lifestyle","questions":[
     {"id":"sun_damage","label":"Sun exposure","type":"select","options":["minimal","moderate","high"]},
     {"id":"sunscreen","label":"Daily sunscreen?","type":"boolean"},
     {"id":"smoking","label":"Smoking","type":"boolean"},
     {"id":"water","label":"Water (L/day)","type":"number"}
   ]}
 ]'::jsonb),
('nail_v1','nail','Nail Health Assessment','Nail strength, color and nutrition indicators', true,
 '["hands","zoom_nail"]'::jsonb,
 '[
   {"id":"basics","title":"About You","questions":[
     {"id":"age","label":"Age","type":"number"},
     {"id":"gender","label":"Gender","type":"select","options":["male","female","other"]}
   ]},
   {"id":"nails","title":"Nail Condition","questions":[
     {"id":"strength","label":"Nail strength","type":"select","options":["brittle","weak","normal","strong"]},
     {"id":"color","label":"Color","type":"select","options":["healthy_pink","pale","yellowish","bluish","white_spots"]},
     {"id":"shape","label":"Shape","type":"select","options":["normal","spooned","clubbed","ridged"]},
     {"id":"texture","label":"Texture","type":"select","options":["smooth","ridged","pitted","peeling"]},
     {"id":"nutrition_signs","label":"Deficiency signs","type":"multi","options":["ridges","white_spots","brittle","slow_growth","none"]}
   ]}
 ]'::jsonb),
('nutrition_v1','nutrition','Nutrition & Lifestyle Assessment','Comprehensive nutrition, BMI and lifestyle evaluation', false,
 '[]'::jsonb,
 '[
   {"id":"body","title":"Body Metrics","questions":[
     {"id":"age","label":"Age","type":"number","required":true},
     {"id":"gender","label":"Gender","type":"select","options":["male","female","other"]},
     {"id":"height_cm","label":"Height (cm)","type":"number","required":true},
     {"id":"weight_kg","label":"Weight (kg)","type":"number","required":true}
   ]},
   {"id":"diet","title":"Diet","questions":[
     {"id":"diet_type","label":"Diet type","type":"select","options":["vegetarian","non_vegetarian","vegan","eggetarian"]},
     {"id":"meals_per_day","label":"Meals per day","type":"number"},
     {"id":"junk_food","label":"Junk food frequency","type":"select","options":["daily","weekly","monthly","rarely"]},
     {"id":"water","label":"Water (L/day)","type":"number"}
   ]},
   {"id":"lifestyle","title":"Lifestyle","questions":[
     {"id":"exercise","label":"Exercise frequency","type":"select","options":["never","1-2/week","3-4/week","daily"]},
     {"id":"sleep","label":"Sleep hours","type":"number"},
     {"id":"stress","label":"Stress (1-10)","type":"slider","min":1,"max":10},
     {"id":"medical","label":"Medical conditions","type":"multi","options":["diabetes","hypertension","thyroid","pcos","cholesterol","none"]}
   ]}
 ]'::jsonb);
