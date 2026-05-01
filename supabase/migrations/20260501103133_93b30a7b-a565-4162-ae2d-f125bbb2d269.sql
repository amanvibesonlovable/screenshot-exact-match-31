
-- employees: replace permissive ALL policy with admin-gated one
DROP POLICY IF EXISTS "Authenticated can manage employees" ON public.employees;

CREATE POLICY "Active admins can view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Active admins can insert employees"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can update employees"
  ON public.employees FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can delete employees"
  ON public.employees FOR DELETE TO authenticated
  USING (public.is_active_admin());

-- survey_responses: tighten authenticated read/update/delete to admins
DROP POLICY IF EXISTS "Authenticated can read survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated can update survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated can delete survey responses" ON public.survey_responses;

CREATE POLICY "Active admins can read survey responses"
  ON public.survey_responses FOR SELECT TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Active admins can update survey responses"
  ON public.survey_responses FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can delete survey responses"
  ON public.survey_responses FOR DELETE TO authenticated
  USING (public.is_active_admin());

-- hr_actions: tighten authenticated full-access to admins
DROP POLICY IF EXISTS "Authenticated can manage actions" ON public.hr_actions;

CREATE POLICY "Active admins can view actions"
  ON public.hr_actions FOR SELECT TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Active admins can insert actions"
  ON public.hr_actions FOR INSERT TO authenticated
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can update actions"
  ON public.hr_actions FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can delete actions"
  ON public.hr_actions FOR DELETE TO authenticated
  USING (public.is_active_admin());
