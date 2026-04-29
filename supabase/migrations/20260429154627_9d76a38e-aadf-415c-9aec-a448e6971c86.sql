-- Open up HR-managed tables to any authenticated user (admin whitelist comes later)
DROP POLICY IF EXISTS "HR can manage employees" ON public.employees;
CREATE POLICY "Authenticated can manage employees"
  ON public.employees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "HR can read all survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "HR can update survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "HR can delete survey responses" ON public.survey_responses;

CREATE POLICY "Authenticated can read survey responses"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update survey responses"
  ON public.survey_responses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete survey responses"
  ON public.survey_responses FOR DELETE
  TO authenticated
  USING (true);

-- Same for hr_actions (so dashboard can log actions later)
DROP POLICY IF EXISTS "HR can read actions" ON public.hr_actions;
DROP POLICY IF EXISTS "HR can insert actions" ON public.hr_actions;
DROP POLICY IF EXISTS "HR can update actions" ON public.hr_actions;
DROP POLICY IF EXISTS "HR can delete actions" ON public.hr_actions;

CREATE POLICY "Authenticated can manage actions"
  ON public.hr_actions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);