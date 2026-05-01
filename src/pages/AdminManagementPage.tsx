import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RequireAdmin from "@/hr/RequireAdmin";
import { useAdminAuth, type AdminRecord } from "@/hr/useAdminAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import { UserMenu } from "@/hr/UserMenu";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Plus, X, Check, AlertCircle } from "lucide-react";

type FormState = {
  name: string;
  email: string;
  role: "admin" | "super_admin";
  useGoogle: boolean;
  usePassword: boolean;
  password: string;
  confirm: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "admin",
  useGoogle: true,
  usePassword: true,
  password: "",
  confirm: "",
};

function relTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <span
        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
        style={{ background: "#0F766E" }}
      >
        Super Admin
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
      Admin
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: active ? "#22C55E" : "#DC2626" }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function AdminFormFields({
  form,
  setForm,
  showPasswordSection,
  errors,
  isEdit = false,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  showPasswordSection: boolean;
  errors: Record<string, string>;
  isEdit?: boolean;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordsMatch = form.password.length > 0 && form.password === form.confirm;
  const passwordsBad = form.confirm.length > 0 && !passwordsMatch;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Name *</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full Name"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Email *</label>
        <input
          type="email"
          value={form.email}
          disabled={isEdit}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@company.in"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Role</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={form.role === "admin"}
              onChange={() => setForm({ ...form, role: "admin" })}
            />
            Admin
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={form.role === "super_admin"}
              onChange={() => setForm({ ...form, role: "super_admin" })}
            />
            Super Admin
          </label>
        </div>
        {form.role === "super_admin" && (
          <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            Super Admins can add, edit, and remove other admins. Assign carefully.
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Authentication Method</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useGoogle}
              onChange={(e) => setForm({ ...form, useGoogle: e.target.checked })}
            />
            Google Sign-In
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.usePassword}
              onChange={(e) => setForm({ ...form, usePassword: e.target.checked })}
            />
            Email &amp; Password
          </label>
        </div>
        {errors.auth_method && <p className="mt-1 text-xs text-destructive">{errors.auth_method}</p>}
      </div>

      {showPasswordSection && form.usePassword && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Set Initial Password *</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter password"
                className="w-full rounded-lg border px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-teal-100"
                style={{
                  borderColor: passwordsBad ? "#DC2626" : passwordsMatch ? "#22C55E" : "#D1D5DB",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {passwordsMatch && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <Check size={12} /> Passwords match
              </p>
            )}
            {passwordsBad && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <X size={12} /> Passwords do not match
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Password must be at least 8 characters.</p>
        </div>
      )}
    </div>
  );
}

export default function AdminManagementPage() {
  return (
    <RequireAdmin requireSuperAdmin>
      <Inner />
    </RequireAdmin>
  );
}

function Inner() {
  const { admin: me } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admins" as any)
      .select("*")
      .order("status", { ascending: true })
      .order("name", { ascending: true });
    setAdmins(((data as any) ?? []) as AdminRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...admins].sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [admins]);

  const adminById = useMemo(() => {
    const m = new Map<string, AdminRecord>();
    admins.forEach((a) => m.set(a.id, a));
    return m;
  }, [admins]);

  const validateForm = (f: FormState, isEdit = false): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Name is required";
    if (!isEdit) {
      if (!f.email.trim()) errs.email = "Email is required";
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email))
        errs.email = "Please enter a valid email address";
      else if (admins.some((a) => a.email === f.email.trim().toLowerCase()))
        errs.email = "An admin with this email already exists";
    }
    if (!f.useGoogle && !f.usePassword)
      errs.auth_method = "At least one authentication method must be selected";
    if (!isEdit && f.usePassword) {
      if (f.password.length < 8) errs.password = "Password must be at least 8 characters";
      else if (f.password !== f.confirm) errs.password = "Passwords do not match";
    }
    return errs;
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const auth_method = form.useGoogle && form.usePassword
      ? "both"
      : form.useGoogle
      ? "google"
      : "password";

    const { data, error } = await supabase.functions.invoke("admin-management", {
      body: {
        action: "create_admin",
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        auth_method,
        password: form.usePassword ? form.password : undefined,
      },
    });
    setSubmitting(false);

    if (error || (data as any)?.error) {
      toast({
        title: "Could not add admin",
        description: (data as any)?.error || error?.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    toast({ title: `${form.name} has been added as an admin.` });
    setForm(EMPTY_FORM);
    setShowAddForm(false);
    load();
  };

  const onDisable = async (a: AdminRecord) => {
    if (a.id === me?.id) {
      toast({ title: "You cannot disable your own account.", variant: "destructive" });
      return;
    }
    if (!confirm(`Disable ${a.name}? They will no longer be able to sign in.`)) return;
    const { error } = await supabase
      .from("admins" as any)
      .update({ status: "inactive" })
      .eq("id", a.id);
    if (error) {
      toast({ title: "Failed to disable", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${a.name} disabled.` });
    load();
  };

  const onActivate = async (a: AdminRecord) => {
    const { error } = await supabase
      .from("admins" as any)
      .update({ status: "active" })
      .eq("id", a.id);
    if (error) {
      toast({ title: "Failed to activate", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const onDelete = async (a: AdminRecord) => {
    if (a.id === me?.id) {
      toast({ title: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    if (a.role === "super_admin") {
      toast({ title: "Cannot delete other super admins.", variant: "destructive" });
      return;
    }
    if (!confirm(`Permanently delete ${a.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("admins" as any).delete().eq("id", a.id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${a.name} deleted.` });
    load();
  };

  const onResetPassword = async (a: AdminRecord) => {
    const { data, error } = await supabase.functions.invoke("admin-management", {
      body: {
        action: "reset_password",
        email: a.email,
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error || (data as any)?.error) {
      toast({
        title: "Failed to send reset",
        description: (data as any)?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `Password reset email sent to ${a.email}` });
  };

  const openEdit = (a: AdminRecord) => {
    setEditing(a);
    setEditForm({
      name: a.name,
      email: a.email,
      role: a.role,
      useGoogle: a.auth_method === "google" || a.auth_method === "both",
      usePassword: a.auth_method === "password" || a.auth_method === "both",
      password: "",
      confirm: "",
    });
    setErrors({});
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const errs = validateForm(editForm, true);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const auth_method = editForm.useGoogle && editForm.usePassword
      ? "both"
      : editForm.useGoogle
      ? "google"
      : "password";

    const { error } = await supabase
      .from("admins" as any)
      .update({ name: editForm.name.trim(), role: editForm.role, auth_method })
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Changes saved." });
    setEditing(null);
    load();
  };

  return (
    <main className="min-h-dvh bg-background">
      <DashboardHeader rightSlot={<UserMenu />} />
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <DashboardSidebar />
        <section className="flex-1 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Add, edit, or remove dashboard users. Only super admins can manage this page.
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddForm((v) => !v);
                setForm(EMPTY_FORM);
                setErrors({});
              }}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "#0F766E" }}
            >
              <Plus size={14} /> {showAddForm ? "Close form" : "Add Admin"}
            </button>
          </div>

          {/* Admins table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Auth</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-left">Added By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No admins yet.
                    </td>
                  </tr>
                )}
                {sorted.map((a) => {
                  const isMe = a.id === me?.id;
                  const isInactive = a.status === "inactive";
                  const canDelete = isInactive && !isMe && a.role !== "super_admin";
                  const showResetPwd = a.auth_method === "password" || a.auth_method === "both";
                  const addedBy = a.created_by ? adminById.get(a.created_by)?.name ?? "—" : "—";
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {a.name}
                        {isMe && (
                          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={a.role} /></td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                        {a.auth_method}
                      </td>
                      <td className="px-4 py-3"><StatusDot status={a.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{relTime(a.last_login)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{addedBy}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(a)}
                            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                          >
                            Edit
                          </button>
                          {!isInactive && !isMe && (
                            <button
                              onClick={() => onDisable(a)}
                              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-secondary"
                            >
                              Disable
                            </button>
                          )}
                          {isInactive && (
                            <button
                              onClick={() => onActivate(a)}
                              className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                              style={{ background: "#0F766E" }}
                            >
                              Activate
                            </button>
                          )}
                          {showResetPwd && !isInactive && (
                            <button
                              onClick={() => onResetPassword(a)}
                              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
                            >
                              Reset Pwd
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => onDelete(a)}
                              className="rounded-md border border-destructive/30 bg-background px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form
              onSubmit={onAdd}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h2 className="text-lg font-semibold text-foreground">Add New Admin</h2>
              <div className="mt-4">
                <AdminFormFields
                  form={form}
                  setForm={setForm}
                  showPasswordSection
                  errors={errors}
                />
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(EMPTY_FORM);
                    setErrors({});
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "#0F766E" }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Add Admin
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={onSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Edit Admin</h2>
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4">
              <AdminFormFields
                form={editForm}
                setForm={setEditForm}
                showPasswordSection={false}
                errors={errors}
                isEdit
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "#0F766E" }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
