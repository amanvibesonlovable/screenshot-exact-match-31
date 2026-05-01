
-- 1. notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  stage smallint NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- prevent duplicate "sent" entries per (employee, stage, channel)
CREATE UNIQUE INDEX notifications_unique_sent
  ON public.notifications (employee_id, stage, channel)
  WHERE status = 'sent';

CREATE INDEX notifications_employee_stage_idx
  ON public.notifications (employee_id, stage);

CREATE INDEX notifications_created_at_idx
  ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins can view notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Active admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.is_active_admin());

-- 2. employees.notification_preference
ALTER TABLE public.employees
  ADD COLUMN notification_preference text NOT NULL DEFAULT 'email'
    CHECK (notification_preference IN ('email', 'whatsapp', 'both', 'none'));

-- 3. notification_settings (singleton)
CREATE TABLE public.notification_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true), -- enforces single row
  auto_send_email boolean NOT NULL DEFAULT false,
  send_reminders boolean NOT NULL DEFAULT true,
  reminder_delay_days smallint NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.notification_settings (id) VALUES (true);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins can view notification settings"
  ON public.notification_settings FOR SELECT TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Super admins can update notification settings"
  ON public.notification_settings FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- updated_at trigger
CREATE TRIGGER notification_settings_set_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
