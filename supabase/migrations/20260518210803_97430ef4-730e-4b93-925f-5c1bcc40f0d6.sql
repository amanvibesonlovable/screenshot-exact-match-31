
-- 1. Add program columns to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'str';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS intern_batch TEXT;
UPDATE public.employees SET program = 'str' WHERE program IS NULL;

-- 2. Extend survey_stage enum with intern week values
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '1';
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '2';
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '3';
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '4';
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '5';
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '6';
ALTER TYPE public.survey_stage ADD VALUE IF NOT EXISTS '7';

-- 3. Update get_employee_by_token to also return program
DROP FUNCTION IF EXISTS public.get_employee_by_token(text);
CREATE OR REPLACE FUNCTION public.get_employee_by_token(p_token text)
 RETURNS TABLE(id uuid, name text, doj date, program text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.name, e.doj, e.program
  FROM public.employees e
  WHERE e.token = p_token
  LIMIT 1;
$function$;

-- 4. Intern survey submission RPC (4-dimension, week-based multipliers, ascent thresholds)
CREATE OR REPLACE FUNCTION public.submit_intern_survey_response(
  p_token text,
  p_stage survey_stage,
  p_answers jsonb,
  p_free_text text,
  p_completion_time_seconds integer
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employee_id uuid;
  v_existing_id uuid;
  v_new_id uuid;
  v_def jsonb;
  v_questions jsonb;
  v_answer jsonb;
  v_qid text;
  v_q jsonb;
  v_sel jsonb;
  v_idx int;
  v_opt jsonb;
  v_total numeric := 0;
  v_pts numeric;
  v_response_records jsonb := '[]'::jsonb;
  v_critical_flags jsonb := '[]'::jsonb;
  v_dim_em numeric := 0;
  v_dim_gs numeric := 0;
  v_dim_pc numeric := 0;
  v_dim_ew numeric := 0;
  v_dim text;
  v_label text;
  v_answer_labels text[];
  v_answer_points numeric;
  v_answer_dim text;
  v_static_count int := 0;
  v_static_idx0_count int := 0;
  v_gaming boolean := false;
  v_multiplier numeric;
  v_final numeric;
  v_risk risk_level;
  v_qkind text;
  v_qtype text;
  v_question_text text;
  v_scores jsonb;
  v_week int;
BEGIN
  SELECT id INTO v_employee_id FROM public.employees
   WHERE token = p_token AND program = 'ascent' LIMIT 1;
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  SELECT id INTO v_existing_id FROM public.survey_responses
   WHERE employee_id = v_employee_id AND stage = p_stage LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'response already submitted';
  END IF;

  SELECT definition INTO v_def FROM public.survey_definitions WHERE stage = p_stage;
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'no canonical survey definition for stage %', p_stage;
  END IF;
  v_questions := v_def->'questions';

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'p_answers must be a json array';
  END IF;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_qid := v_answer->>'question_id';
    v_sel := v_answer->'selected';
    IF v_qid IS NULL OR v_sel IS NULL OR jsonb_typeof(v_sel) <> 'array' THEN
      CONTINUE;
    END IF;

    v_q := NULL;
    FOR v_opt IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
      IF v_opt->>'id' = v_qid THEN v_q := v_opt; EXIT; END IF;
    END LOOP;
    IF v_q IS NULL THEN CONTINUE; END IF;

    v_qkind := v_q->>'kind';
    v_qtype := v_q->>'type';
    v_question_text := v_q->>'prompt';

    v_answer_points := 0;
    v_answer_labels := ARRAY[]::text[];
    v_answer_dim := NULL;

    IF v_qtype = 'single' AND jsonb_array_length(v_sel) > 1 THEN
      v_sel := jsonb_build_array(v_sel->0);
    END IF;

    FOR v_idx IN SELECT (value::text)::int FROM jsonb_array_elements(v_sel) LOOP
      v_opt := v_q->'options'->v_idx;
      IF v_opt IS NULL THEN CONTINUE; END IF;
      v_pts := COALESCE((v_opt->>'points')::numeric, 0);
      v_dim := v_opt->>'dimension';
      v_label := v_opt->>'label';

      v_answer_points := v_answer_points + v_pts;
      v_answer_labels := v_answer_labels || v_label;
      IF v_answer_dim IS NULL THEN v_answer_dim := v_dim; END IF;

      IF v_dim = 'engagement_motivation' THEN v_dim_em := v_dim_em + v_pts;
      ELSIF v_dim = 'guidance_support' THEN v_dim_gs := v_dim_gs + v_pts;
      ELSIF v_dim = 'project_clarity' THEN v_dim_pc := v_dim_pc + v_pts;
      ELSIF v_dim = 'experience_wellbeing' THEN v_dim_ew := v_dim_ew + v_pts;
      END IF;

      IF v_opt->>'criticalFlag' IS NOT NULL THEN
        v_critical_flags := v_critical_flags || to_jsonb(v_opt->>'criticalFlag');
      END IF;
    END LOOP;

    IF array_length(v_answer_labels, 1) IS NULL THEN CONTINUE; END IF;

    v_total := v_total + v_answer_points;

    IF v_qkind = 'static' AND v_qtype = 'single' THEN
      v_static_count := v_static_count + 1;
      IF (v_sel->>0)::int = 0 THEN v_static_idx0_count := v_static_idx0_count + 1; END IF;
    END IF;

    v_response_records := v_response_records || jsonb_build_object(
      'question_id', v_qid,
      'question_text', v_question_text,
      'answer_text', array_to_string(v_answer_labels, ' • '),
      'points', v_answer_points,
      'dimension', COALESCE(v_answer_dim, 'none')
    );
  END LOOP;

  v_week := (p_stage::text)::int;
  v_multiplier := COALESCE(
    (v_def->>'week_multiplier')::numeric,
    CASE v_week
      WHEN 1 THEN 0.7 WHEN 2 THEN 0.8 WHEN 3 THEN 0.9 WHEN 4 THEN 1.0
      WHEN 5 THEN 1.1 WHEN 6 THEN 1.2 WHEN 7 THEN 1.3 ELSE 1.0
    END
  );
  v_final := round((v_total * v_multiplier) * 10) / 10.0;

  IF jsonb_array_length(v_critical_flags) > 0 OR v_final >= 19 THEN
    v_risk := 'HIGH';
  ELSIF v_final >= 9 THEN
    v_risk := 'MEDIUM';
  ELSE
    v_risk := 'LOW';
  END IF;

  v_gaming := (
    v_static_count > 0
    AND v_static_count = v_static_idx0_count
    AND COALESCE(p_completion_time_seconds, 0) < 30
  );

  v_scores := jsonb_build_object(
    'engagement_motivation', v_dim_em,
    'guidance_support', v_dim_gs,
    'project_clarity', v_dim_pc,
    'experience_wellbeing', v_dim_ew,
    'composite', v_dim_em + v_dim_gs + v_dim_pc + v_dim_ew,
    'week_multiplier', v_multiplier,
    'final_score', v_final,
    'risk_level', v_risk::text
  );

  INSERT INTO public.survey_responses (
    employee_id, stage, responses, free_text_response, scores,
    critical_flags, gaming_flag, completion_time_seconds, final_score, risk_level
  ) VALUES (
    v_employee_id, p_stage, v_response_records, p_free_text, v_scores,
    v_critical_flags, v_gaming, COALESCE(p_completion_time_seconds, 0), v_final, v_risk
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;
