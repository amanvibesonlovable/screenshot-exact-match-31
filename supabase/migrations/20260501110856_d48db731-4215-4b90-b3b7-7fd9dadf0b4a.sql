CREATE POLICY "Active admins can insert survey responses"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());