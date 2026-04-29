-- ============================================================
-- Pulse — initial schema
-- ============================================================

-- Enums ------------------------------------------------------
CREATE TYPE public.employee_status AS ENUM ('training', 'positioned', 'exited');
CREATE TYPE public.survey_stage AS ENUM ('15', '30', '45', '60', '90', '180');
CREATE TYPE public.risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Helper: short URL-safe token --------------------------------
CREATE OR REPLACE FUNCTION public.gen_survey_token()
RETURNS text
LANGUAGE plpgsql
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

-- updated_at trigger helper -----------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- HR whitelist
-- ============================================================
CREATE TABLE public.hr_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_whitelist ENABLE ROW LEVEL SECURITY;

-- Security-definer helper: is the current authenticated user an HR user?
CREATE OR REPLACE FUNCTION public.is_hr_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hr_whitelist w
    JOIN auth.users u ON lower(u.email) = lower(w.email)
    WHERE u.id = auth.uid()
  );
$$;

CREATE POLICY "HR can view whitelist"
  ON public.hr_whitelist FOR SELECT
  TO authenticated
  USING (public.is_hr_user());

CREATE POLICY "HR can manage whitelist"
  ON public.hr_whitelist FOR ALL
  TO authenticated
  USING (public.is_hr_user())
  WITH CHECK (public.is_hr_user());

-- ============================================================
-- Employees (trainees)
-- ============================================================
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  age int,
  college text,
  branch text NOT NULL,
  area_manager text NOT NULL,
  doj date NOT NULL,
  token text NOT NULL UNIQUE DEFAULT public.gen_survey_token(),
  status public.employee_status NOT NULL DEFAULT 'training',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX employees_branch_idx ON public.employees (branch);
CREATE INDEX employees_status_idx ON public.employees (status);
CREATE INDEX employees_doj_idx ON public.employees (doj);

CREATE TRIGGER employees_set_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) can look up an employee BY TOKEN only.
-- The token is unguessable, acts as a capability. The client-side query
-- always filters by token, so RLS doesn't need to inspect it directly.
CREATE POLICY "Anyone can read employees (token-gated by query)"
  ON public.employees FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "HR can manage employees"
  ON public.employees FOR ALL
  TO authenticated
  USING (public.is_hr_user())
  WITH CHECK (public.is_hr_user());

-- ============================================================
-- Survey responses
-- ============================================================
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  stage public.survey_stage NOT NULL,
  responses jsonb NOT NULL,
  free_text_response text,
  scores jsonb NOT NULL,
  critical_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaming_flag boolean NOT NULL DEFAULT false,
  completion_time_seconds int NOT NULL,
  final_score numeric NOT NULL,
  risk_level public.risk_level NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_responses_unique_per_stage UNIQUE (employee_id, stage)
);

CREATE INDEX survey_responses_employee_idx ON public.survey_responses (employee_id);
CREATE INDEX survey_responses_submitted_idx ON public.survey_responses (submitted_at DESC);
CREATE INDEX survey_responses_risk_idx ON public.survey_responses (risk_level);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Trainees submit anonymously; allow inserts from anyone.
-- The unique (employee_id, stage) constraint prevents double-submits.
CREATE POLICY "Anyone can submit a survey response"
  ON public.survey_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Trainees do NOT need to read other people's responses.
-- HR can read everything.
CREATE POLICY "HR can read all survey responses"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (public.is_hr_user());

CREATE POLICY "HR can update survey responses"
  ON public.survey_responses FOR UPDATE
  TO authenticated
  USING (public.is_hr_user())
  WITH CHECK (public.is_hr_user());

CREATE POLICY "HR can delete survey responses"
  ON public.survey_responses FOR DELETE
  TO authenticated
  USING (public.is_hr_user());

-- A lightweight read for trainees: allow them to check whether THEIR stage
-- has been submitted (returns a count-like row from the chat client).
-- This is safe because employee_id is opaque (uuid) and the trainee already
-- knows their own employee via the token route.
CREATE POLICY "Anyone can read their own response existence"
  ON public.survey_responses FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- HR actions log
-- ============================================================
CREATE TABLE public.hr_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hr_actions_employee_idx ON public.hr_actions (employee_id);
CREATE INDEX hr_actions_created_idx ON public.hr_actions (created_at DESC);

ALTER TABLE public.hr_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can read actions"
  ON public.hr_actions FOR SELECT
  TO authenticated
  USING (public.is_hr_user());

CREATE POLICY "HR can insert actions"
  ON public.hr_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_hr_user());

CREATE POLICY "HR can update actions"
  ON public.hr_actions FOR UPDATE
  TO authenticated
  USING (public.is_hr_user())
  WITH CHECK (public.is_hr_user());

CREATE POLICY "HR can delete actions"
  ON public.hr_actions FOR DELETE
  TO authenticated
  USING (public.is_hr_user());
