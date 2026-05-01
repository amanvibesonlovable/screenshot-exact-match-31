// Edge Function: send-notifications
// Hybrid trigger: invoked from the dashboard ("Send pending") AND from a daily
// pg_cron job. Sends per-stage check-in emails via Resend (through the Lovable
// connector gateway). Idempotent: the notifications table has a partial unique
// index on (employee_id, stage, channel) WHERE status='sent' so a duplicate
// send for the same trainee+stage+channel will be rejected at the DB level.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

// Default sender — Resend lets you send from this domain without verification.
// Override via SENDER_EMAIL / SENDER_NAME secrets once a custom domain is verified.
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "checkins@resend.dev";
const SENDER_NAME = Deno.env.get("SENDER_NAME") ?? "Candor";

const STAGES = [15, 30, 45, 60, 90, 180] as const;
type Stage = (typeof STAGES)[number];

type StageCopy = {
  subject: (name: string) => string;
  opening: string;
};

const STAGE_COPY: Record<Stage, StageCopy> = {
  15: {
    subject: (n) => `Quick check-in — how's it going, ${n}?`,
    opening: "You've been at it for 2 weeks now. Let's see how things are going.",
  },
  30: {
    subject: (n) => `One month in — how are you doing, ${n}?`,
    opening: "A month already! Time for a quick pulse check.",
  },
  45: {
    subject: (n) => `Halfway there, ${n} — quick check-in`,
    opening: "You're at the midpoint of training. Let's check in.",
  },
  60: {
    subject: (n) => `Two months down, ${n} — almost there`,
    opening: "The final stretch of training. Quick check-in time.",
  },
  90: {
    subject: (n) => `Training complete — one last check-in, ${n}`,
    opening: "You've made it through training. Let's do a final review.",
  },
  180: {
    subject: (n) => `6 months in — how's the real job, ${n}?`,
    opening: "It's been 6 months since you started. Last check-in.",
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(opts: {
  name: string;
  stage: Stage;
  surveyUrl: string;
}): { subject: string; html: string; text: string } {
  const copy = STAGE_COPY[opts.stage];
  const safeName = escapeHtml(opts.name);
  const subject = copy.subject(opts.name);
  const opening = copy.opening;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 4px;">
                <p style="font-size:16px;line-height:1.55;margin:0 0 16px;">Hi ${safeName},</p>
                <p style="font-size:16px;line-height:1.55;margin:0 0 16px;">${escapeHtml(opening)}</p>
                <p style="font-size:16px;line-height:1.55;margin:0 0 24px;">
                  It takes less than 2 minutes, and your managers won't see your individual answers. This is just between you and the HR team.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
                  <tr>
                    <td align="center" bgcolor="#0F766E" style="border-radius:9999px;">
                      <a href="${opts.surveyUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px;background:#0F766E;">
                        Start my check-in →
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="font-size:15px;line-height:1.55;color:#334155;margin:0 0 24px;">
                  Your responses help us make the training experience better for everyone.
                </p>
                <p style="font-size:15px;line-height:1.55;color:#334155;margin:0 0 32px;">
                  Thanks,<br/>The HR Team
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
                <p style="font-size:12px;line-height:1.5;color:#64748b;margin:0;">
                  This check-in is 100% confidential. Your managers do not see individual responses.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hi ${opts.name},

${opening}

It takes less than 2 minutes, and your managers won't see your individual answers. This is just between you and the HR team.

Start your check-in: ${opts.surveyUrl}

Your responses help us make the training experience better for everyone.

Thanks,
The HR Team

---
This check-in is 100% confidential. Your managers do not see individual responses.`;

  return { subject, html, text };
}

function daysBetween(fromIsoDate: string, to: Date): number {
  const from = new Date(fromIsoDate + "T00:00:00");
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function eligibleStage(daysSince: number): Stage | null {
  // Pick the highest stage the trainee has reached, within a 14-day window
  // (so we don't email day-15 to a trainee who is now day-100 — they'd just
  // get day-90).
  let chosen: Stage | null = null;
  for (const s of STAGES) {
    if (daysSince >= s) chosen = s;
  }
  if (!chosen) return null;
  // Only send if they're within ~21 days of becoming eligible — older stages
  // are considered "missed" and shouldn't trigger a fresh email out of nowhere.
  if (daysSince - chosen > 21) return null;
  return chosen;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorizedAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error } = await userClient.auth.getUser();
  if (error || !userData.user?.email) return false;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data } = await admin
    .from("admins")
    .select("status")
    .eq("email", userData.user.email.toLowerCase())
    .maybeSingle();
  return data?.status === "active";
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY missing" };
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: `Resend ${res.status}: ${JSON.stringify(data)}`.slice(0, 500),
    };
  }
  return { ok: true, id: (data as any)?.id ?? "ok" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const headerCronSecret = req.headers.get("x-cron-secret");
    const isCronCall = !!(cronSecret && headerCronSecret === cronSecret);

    const authHeader = req.headers.get("Authorization");
    const isAdmin = isCronCall ? true : await isAuthorizedAdmin(authHeader);
    if (!isAdmin) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const force = body?.force === true; // dashboard "Send pending" can force even if auto-send is OFF
    const employeeIds = Array.isArray(body?.employeeIds)
      ? (body.employeeIds as string[]).filter((x) => typeof x === "string")
      : null;
    const requestOrigin = typeof body?.origin === "string" ? body.origin : null;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Settings gate
    const { data: settings } = await admin
      .from("notification_settings")
      .select("auto_send_email")
      .eq("id", true)
      .maybeSingle();
    const autoSend = settings?.auto_send_email === true;
    if (!autoSend && !force) {
      return json({
        skipped: true,
        reason: "auto_send_email disabled",
        sent: 0,
        attempted: 0,
      });
    }

    // Fetch eligible employees
    let q = admin
      .from("employees")
      .select("id, name, email, doj, status, token, employee_code, notification_preference")
      .in("status", ["training", "positioned"])
      .neq("notification_preference", "none")
      .neq("notification_preference", "whatsapp"); // email-channel only here
    if (employeeIds && employeeIds.length) {
      q = q.in("id", employeeIds);
    }
    const { data: employees, error: empErr } = await q;
    if (empErr) {
      console.error("employees query failed", empErr);
      return json({ error: "Failed to load employees" }, 500);
    }

    // Pull all completed responses + already-sent notifications for these employees
    const ids = (employees ?? []).map((e) => e.id);
    const [{ data: responses }, { data: existingNotifs }] = await Promise.all([
      ids.length
        ? admin.from("survey_responses").select("employee_id, stage").in("employee_id", ids)
        : Promise.resolve({ data: [] as { employee_id: string; stage: string | number }[] }),
      ids.length
        ? admin
            .from("notifications")
            .select("employee_id, stage, channel, status")
            .in("employee_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const completedSet = new Set<string>();
    for (const r of responses ?? []) {
      completedSet.add(`${r.employee_id}:${Number(r.stage)}`);
    }
    const sentEmailSet = new Set<string>();
    for (const n of existingNotifs ?? []) {
      if (n.channel === "email" && n.status === "sent") {
        sentEmailSet.add(`${n.employee_id}:${n.stage}`);
      }
    }

    const now = new Date();
    const origin = requestOrigin ?? "https://candor.ind.in";

    let sent = 0;
    let attempted = 0;
    let skipped = 0;
    const failures: { employee_id: string; stage: number; error: string }[] = [];

    for (const e of employees ?? []) {
      // Demo / seed protection
      if (
        (e.email ?? "").toLowerCase().includes("demo") ||
        (e.employee_code ?? "").toLowerCase().includes("demo")
      ) {
        skipped++;
        continue;
      }
      if (!e.email || !e.doj) {
        skipped++;
        continue;
      }
      const days = daysBetween(e.doj, now);
      const stage = eligibleStage(days);
      if (!stage) {
        skipped++;
        continue;
      }
      if (completedSet.has(`${e.id}:${stage}`)) {
        skipped++;
        continue;
      }
      if (sentEmailSet.has(`${e.id}:${stage}`)) {
        skipped++;
        continue;
      }

      attempted++;
      const surveyUrl = `${origin}/s/${e.token}`;
      const firstName = String(e.name ?? "there").split(" ")[0];
      const { subject, html, text } = renderEmail({
        name: firstName,
        stage,
        surveyUrl,
      });
      const result = await sendViaResend({ to: e.email, subject, html, text });

      if (result.ok) {
        const { error: insErr } = await admin.from("notifications").insert({
          employee_id: e.id,
          stage,
          channel: "email",
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        if (insErr) {
          // Probably the unique partial index — treat as already-sent.
          console.warn("notif insert failed (likely duplicate)", insErr.message);
        } else {
          sent++;
        }
      } else {
        failures.push({ employee_id: e.id, stage, error: result.error });
        await admin.from("notifications").insert({
          employee_id: e.id,
          stage,
          channel: "email",
          status: "failed",
          error_message: result.error.slice(0, 1000),
        });
      }
    }

    return json({
      sent,
      attempted,
      skipped,
      failed: failures.length,
      failures: failures.slice(0, 10),
    });
  } catch (e) {
    console.error("send-notifications fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});
