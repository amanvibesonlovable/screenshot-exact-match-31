-- Fix mutable search_path on helpers
CREATE OR REPLACE FUNCTION public.gen_survey_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..14 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Restrict execution of the SECURITY DEFINER HR-check function
REVOKE EXECUTE ON FUNCTION public.is_hr_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hr_user() TO authenticated;

-- Tighten survey response insert: require employee_id to actually exist
DROP POLICY IF EXISTS "Anyone can submit a survey response" ON public.survey_responses;
CREATE POLICY "Anyone can submit a survey response"
  ON public.survey_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id)
  );
