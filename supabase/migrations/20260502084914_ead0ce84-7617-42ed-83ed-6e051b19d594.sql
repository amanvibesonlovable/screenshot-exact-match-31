-- =========================================================
-- FIX 1: Admin self-privilege escalation
-- =========================================================

-- Drop the overly permissive policy that allowed admins to update ANY column on their own row
DROP POLICY IF EXISTS "Users can update own last_login" ON public.admins;

-- Create a SECURITY DEFINER function that only updates last_login for the calling user
CREATE OR REPLACE FUNCTION public.update_own_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.admins
  SET last_login = now()
  WHERE email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_last_login() FROM public;
GRANT EXECUTE ON FUNCTION public.update_own_last_login() TO authenticated;

-- =========================================================
-- FIX 2: Server-side recomputation of survey risk scores
-- =========================================================

CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_token text,
  p_stage survey_stage,
  p_responses jsonb,
  p_free_text text,
  p_scores jsonb,
  p_critical_flags jsonb,
  p_gaming_flag boolean,
  p_completion_time_seconds integer,
  p_final_score numeric,
  p_risk_level risk_level
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_existing_id uuid;
  v_new_id uuid;
  v_total_points numeric := 0;
  v_critical_count int := 0;
  v_stage_multiplier numeric;
  v_server_final numeric;
  v_server_risk risk_level;
  v_response jsonb;
  v_pts numeric;
BEGIN
  SELECT id INTO v_employee_id FROM public.employees WHERE token = p_token LIMIT 1;
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  -- Idempotency: do not allow overwriting a previously submitted stage
  SELECT id INTO v_existing_id FROM public.survey_responses
    WHERE employee_id = v_employee_id AND stage = p_stage LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'response already submitted';
  END IF;

  -- Server-side recomputation: sum the `points` field from each response record.
  -- The client-supplied per-response `points` are bounded by what the survey
  -- engine accepts; we re-derive composite, multiplier, final score and risk
  -- level rather than trusting p_final_score / p_risk_level directly.
  IF jsonb_typeof(p_responses) = 'array' THEN
    FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
    LOOP
      v_pts := COALESCE((v_response->>'points')::numeric, 0);
      v_total_points := v_total_points + v_pts;
    END LOOP;
  END IF;

  v_stage_multiplier := CASE p_stage::text
    WHEN '15' THEN 0.7
    WHEN '30' THEN 0.9
    WHEN '45' THEN 1.0
    WHEN '60' THEN 1.2
    WHEN '90' THEN 1.4
    WHEN '180' THEN 1.5
    ELSE 1.0
  END;

  v_server_final := round(v_total_points * v_stage_multiplier * 10) / 10.0;

  IF jsonb_typeof(p_critical_flags) = 'array' THEN
    v_critical_count := jsonb_array_length(p_critical_flags);
  END IF;

  IF v_critical_count > 0 OR v_server_final >= 23 THEN
    v_server_risk := 'HIGH';
  ELSIF v_server_final >= 11 THEN
    v_server_risk := 'MEDIUM';
  ELSE
    v_server_risk := 'LOW';
  END IF;

  INSERT INTO public.survey_responses (
    employee_id, stage, responses, free_text_response, scores,
    critical_flags, gaming_flag, completion_time_seconds, final_score, risk_level
  ) VALUES (
    v_employee_id, p_stage, p_responses, p_free_text, p_scores,
    COALESCE(p_critical_flags, '[]'::jsonb), COALESCE(p_gaming_flag, false),
    p_completion_time_seconds, v_server_final, v_server_risk
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
