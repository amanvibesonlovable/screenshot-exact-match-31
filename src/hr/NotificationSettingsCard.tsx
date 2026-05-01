import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

type Settings = {
  auto_send_email: boolean;
  send_reminders: boolean;
  reminder_delay_days: number;
};

export function NotificationSettingsCard() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("notification_settings")
      .select("auto_send_email, send_reminders, reminder_delay_days")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setS(data as Settings);
      });
  }, []);

  async function update(patch: Partial<Settings>) {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_settings")
      .update(patch)
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
    } else {
      toast.success("Saved");
    }
  }

  if (!s) return null;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-bubble backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Mail size={18} style={{ color: "#0F766E" }} />
        <h2 className="text-lg font-extrabold text-foreground">Notification settings</h2>
        {saving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Controls automated check-in emails. Only super admins can change these.
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
        <input
          type="checkbox"
          checked={s.auto_send_email}
          onChange={(e) => update({ auto_send_email: e.target.checked })}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <div className="text-sm">
          <div className="font-semibold text-foreground">Auto-send email when a trainee becomes eligible</div>
          <div className="text-xs text-muted-foreground">
            When ON, the daily job sends emails automatically. When OFF, you must use the “Send pending” button on Overview.
          </div>
        </div>
      </label>

      <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
        <input
          type="checkbox"
          checked={s.send_reminders}
          onChange={(e) => update({ send_reminders: e.target.checked })}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <div className="text-sm">
          <div className="font-semibold text-foreground">Send a reminder if not completed</div>
          <div className="text-xs text-muted-foreground">
            Sends one reminder after the delay below. (Reminder sender is wired in a follow-up.)
          </div>
        </div>
      </label>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Reminder delay:</span>
        <input
          type="number"
          min={1}
          max={14}
          value={s.reminder_delay_days}
          onChange={(e) => update({ reminder_delay_days: Math.max(1, Math.min(14, Number(e.target.value) || 1)) })}
          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm tabular-nums"
        />
        <span className="text-muted-foreground">days</span>
      </div>
    </div>
  );
}
