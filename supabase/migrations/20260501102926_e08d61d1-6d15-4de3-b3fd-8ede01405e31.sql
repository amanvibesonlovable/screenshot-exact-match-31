
-- 1. Drop legacy hr_whitelist table (superseded by admins)
DROP TABLE IF EXISTS public.hr_whitelist CASCADE;

-- 2. Tighten anon access on employees: drop the wide-open SELECT
DROP POLICY IF EXISTS "Anyone can read employees (token-gated by query)" ON public.employees;

-- 3. Tighten survey_responses: drop wide-open anon SELECT and INSERT
DROP POLICY IF EXISTS "Anyone can read their own response existence" ON public.survey_responses;
DROP POLICY IF EXISTS "Anyone can submit a survey response" ON public.survey_responses;

-- 4. Token-gated SECURITY DEFINER RPC: look up employee by survey token
CREATE OR REPLACE FUNCTION public.get_employee_by_token(p_token text)
RETURNS TABLE (id uuid, name text, doj date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.name, e.doj
  FROM public.employees e
  WHERE e.token = p_token
  LIMIT 1;
$$;

-- 5. Token-gated SECURITY DEFINER RPC: has the trainee already submitted this stage?
CREATE OR REPLACE FUNCTION public.survey_already_submitted(p_token text, p_stage public.survey_stage)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.survey_responses sr
    JOIN public.employees e ON e.id = sr.employee_id
    WHERE e.token = p_token AND sr.stage = p_stage
  );
$$;

-- 6. Token-gated SECURITY DEFINER RPC: submit a response (insert)
CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_token text,
  p_stage public.survey_stage,
  p_responses jsonb,
  p_free_text text,
  p_scores jsonb,
  p_critical_flags jsonb,
  p_gaming_flag boolean,
  p_completion_time_seconds integer,
  p_final_score numeric,
  p_risk_level public.risk_level
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

  INSERT INTO public.survey_responses (
    employee_id, stage, responses, free_text_response, scores,
    critical_flags, gaming_flag, completion_time_seconds, final_score, risk_level
  ) VALUES (
    v_employee_id, p_stage, p_responses, p_free_text, p_scores,
    COALESCE(p_critical_flags, '[]'::jsonb), COALESCE(p_gaming_flag, false),
    p_completion_time_seconds, p_final_score, p_risk_level
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- 7. Lock down internal SECURITY DEFINER helpers from anon/authenticated/public
REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_hr_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_user() TO authenticated;

REVOKE ALL ON FUNCTION public.gen_survey_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lowercase_admin_email() FROM PUBLIC, anon, authenticated;

-- 8. Grant EXECUTE on the new public-purpose RPCs to anon (token-gated trainee flow)
REVOKE ALL ON FUNCTION public.get_employee_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_by_token(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.survey_already_submitted(text, public.survey_stage) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.survey_already_submitted(text, public.survey_stage) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_survey_response(text, public.survey_stage, jsonb, text, jsonb, jsonb, boolean, integer, numeric, public.risk_level) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(text, public.survey_stage, jsonb, text, jsonb, jsonb, boolean, integer, numeric, public.risk_level) TO anon, authenticated;
