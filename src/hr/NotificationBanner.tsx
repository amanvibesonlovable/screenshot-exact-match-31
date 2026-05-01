import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

type Counts = {
  sentToday: number;
  pendingToNotify: number;
  autoSendOn: boolean;
};

export function NotificationBanner({ refreshKey }: { refreshKey?: number }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [sending, setSending] = useState(false);

  async function loadCounts() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [{ data: notifs }, { data: settings }, { data: employees }, { data: responses }, { data: allNotifs }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("id")
          .eq("status", "sent")
          .eq("channel", "email")
          .gte("sent_at", startOfDay.toISOString()),
        supabase.from("notification_settings").select("auto_send_email").eq("id", true).maybeSingle(),
        supabase
          .from("employees")
          .select("id, doj, status, email, employee_code, notification_preference")
          .in("status", ["training", "positioned"]),
        supabase.from("survey_responses").select("employee_id, stage"),
        supabase
          .from("notifications")
          .select("employee_id, stage, channel, status")
          .eq("channel", "email")
          .eq("status", "sent"),
      ]);

    const completed = new Set<string>();
    for (const r of responses ?? []) completed.add(`${r.employee_id}:${Number(r.stage)}`);
    const sentEmail = new Set<string>();
    for (const n of allNotifs ?? []) sentEmail.add(`${n.employee_id}:${n.stage}`);

    const STAGES = [15, 30, 45, 60, 90, 180];
    let pending = 0;
    const today = new Date();
    for (const e of employees ?? []) {
      if (!e.email || !e.doj) continue;
      if ((e.email ?? "").toLowerCase().includes("demo")) continue;
      if ((e.employee_code ?? "").toLowerCase().includes("demo")) continue;
      if (e.notification_preference === "none" || e.notification_preference === "whatsapp") continue;
      const days = Math.floor((today.getTime() - new Date(e.doj + "T00:00:00").getTime()) / 86400000);
      let stage: number | null = null;
      for (const s of STAGES) if (days >= s) stage = s;
      if (!stage) continue;
      if (days - stage > 21) continue;
      if (completed.has(`${e.id}:${stage}`)) continue;
      if (sentEmail.has(`${e.id}:${stage}`)) continue;
      pending++;
    }

    setCounts({
      sentToday: notifs?.length ?? 0,
      pendingToNotify: pending,
      autoSendOn: settings?.auto_send_email === true,
    });
  }

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line
  }, [refreshKey]);

  async function sendPending() {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notifications", {
        body: { force: true, origin: window.location.origin },
      });
      if (error) {
        toast.error(`Send failed: ${error.message}`);
      } else {
        const sent = (data as any)?.sent ?? 0;
        const failed = (data as any)?.failed ?? 0;
        if (sent === 0 && failed === 0) toast("Nothing to send right now");
        else if (failed === 0) toast.success(`Sent ${sent} email${sent === 1 ? "" : "s"}`);
        else toast.warning(`Sent ${sent}, ${failed} failed`);
      }
      await loadCounts();
    } finally {
      setSending(false);
    }
  }

  if (!counts) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
      style={{
        background: "linear-gradient(135deg,#F0FDFA 0%,#ECFEFF 100%)",
        borderColor: "#0F766E33",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Mail size={16} style={{ color: "#0F766E" }} />
        <span className="font-semibold" style={{ color: "#0F766E" }}>Notifications</span>
        <span className="text-muted-foreground">·</span>
        <span><span className="font-bold tabular-nums">{counts.sentToday}</span> sent today</span>
        <span className="text-muted-foreground">·</span>
        <span>
          <span className="font-bold tabular-nums">{counts.pendingToNotify}</span> pending
        </span>
        {!counts.autoSendOn && (
          <span
            className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "#FEF3C7", color: "#92400E" }}
            title="Auto-send is OFF in Notification Settings"
          >
            auto-send OFF
          </span>
        )}
      </div>
      <button
        onClick={sendPending}
        disabled={sending || counts.pendingToNotify === 0}
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-soft transition disabled:opacity-50"
        style={{ background: "#0F766E" }}
      >
        {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        {sending ? "Sending…" : `Send pending${counts.pendingToNotify > 0 ? ` (${counts.pendingToNotify})` : ""}`}
      </button>
    </div>
  );
}
