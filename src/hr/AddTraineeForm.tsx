import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const traineeSchema = z.object({
  employee_code: z.string().trim().min(1, "Employee ID is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Phone is required").max(20),
  branch: z.string().trim().min(1, "Branch is required").max(100),
  area_manager: z.string().trim().min(1, "Area manager is required").max(100),
  doj: z.string().min(1, "Date of joining is required"),
  age: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 16 && Number(v) <= 80), "Age must be 16–80"),
  college: z.string().trim().max(200).optional(),
  notification_preference: z.enum(["email", "whatsapp", "both", "none"]),
});

type FormState = z.infer<typeof traineeSchema>;

const empty: FormState = {
  employee_code: "",
  name: "",
  email: "",
  phone: "",
  branch: "",
  area_manager: "",
  doj: "",
  age: "",
  college: "",
  notification_preference: "email",
};

export function AddTraineeForm({ onAdded }: { onAdded?: () => void }) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    const parsed = traineeSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      employee_code: parsed.data.employee_code,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      branch: parsed.data.branch,
      area_manager: parsed.data.area_manager,
      doj: parsed.data.doj,
      notification_preference: parsed.data.notification_preference,
    };
    if (parsed.data.age) payload.age = Number(parsed.data.age);
    if (parsed.data.college) payload.college = parsed.data.college;

    const { error } = await supabase.from("employees").insert(payload);
    setSubmitting(false);

    if (error) {
      setServerError(error.message.includes("duplicate") ? "Employee ID already exists." : error.message);
      return;
    }

    setSuccess(`Added ${parsed.data.name}`);
    setForm(empty);
    onAdded?.();
    setTimeout(() => setSuccess(null), 3500);
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-semibold text-foreground mb-1";
  const errCls = "mt-1 text-[11px] text-destructive";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-bubble backdrop-blur"
    >
      <h2 className="text-lg font-extrabold text-foreground">Add a trainee manually</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        For one-off additions. Use the CSV upload for bulk imports.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Employee ID *</label>
          <input className={fieldCls} value={form.employee_code} onChange={(e) => set("employee_code", e.target.value)} maxLength={50} />
          {errors.employee_code && <p className={errCls}>{errors.employee_code}</p>}
        </div>
        <div>
          <label className={labelCls}>Full name *</label>
          <input className={fieldCls} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
          {errors.name && <p className={errCls}>{errors.name}</p>}
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input type="email" className={fieldCls} value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
          {errors.email && <p className={errCls}>{errors.email}</p>}
        </div>
        <div>
          <label className={labelCls}>Phone *</label>
          <input className={fieldCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="+91…" />
          {errors.phone && <p className={errCls}>{errors.phone}</p>}
        </div>
        <div>
          <label className={labelCls}>Branch *</label>
          <input className={fieldCls} value={form.branch} onChange={(e) => set("branch", e.target.value)} maxLength={100} />
          {errors.branch && <p className={errCls}>{errors.branch}</p>}
        </div>
        <div>
          <label className={labelCls}>Area manager *</label>
          <input className={fieldCls} value={form.area_manager} onChange={(e) => set("area_manager", e.target.value)} maxLength={100} />
          {errors.area_manager && <p className={errCls}>{errors.area_manager}</p>}
        </div>
        <div>
          <label className={labelCls}>Date of joining *</label>
          <input type="date" className={fieldCls} value={form.doj} onChange={(e) => set("doj", e.target.value)} />
          {errors.doj && <p className={errCls}>{errors.doj}</p>}
        </div>
        <div>
          <label className={labelCls}>Notification preference</label>
          <select
            className={fieldCls}
            value={form.notification_preference}
            onChange={(e) => set("notification_preference", e.target.value as FormState["notification_preference"])}
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="both">Both</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Age</label>
          <input type="number" className={fieldCls} value={form.age} onChange={(e) => set("age", e.target.value)} min={16} max={80} />
          {errors.age && <p className={errCls}>{errors.age}</p>}
        </div>
        <div>
          <label className={labelCls}>College</label>
          <input className={fieldCls} value={form.college} onChange={(e) => set("college", e.target.value)} maxLength={200} />
        </div>
      </div>

      {serverError && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{serverError}</p>
      )}
      {success && (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          ✓ {success}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gradient-brand px-5 py-2 text-xs font-bold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add trainee"}
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(empty);
            setErrors({});
            setServerError(null);
          }}
          className="rounded-full border border-border bg-background px-5 py-2 text-xs font-bold hover:bg-secondary"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
