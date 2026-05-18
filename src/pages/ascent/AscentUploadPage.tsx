import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { parseCsv } from "@/hr/csv";
import RequireAdmin from "@/hr/RequireAdmin";
import { ArrowLeft, Rocket, Download } from "lucide-react";

const REQUIRED = [
  "employee_code",
  "name",
  "phone",
  "email",
  "branch",
  "area_manager",
  "doj",
] as const;

const ALLOWED_BRANCHES = ["Mumbai", "Ahmedabad", "Pune", "Nagpur", "Bhopal"];
const ALLOWED_PROJECT_TYPES = [
  "Form Filling",
  "Promoter",
  "Outlet Addition",
  "Data Collection",
  "Market Survey",
];

const internSchema = z.object({
  employee_code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(255),
  branch: z.string().trim().refine((v) => ALLOWED_BRANCHES.includes(v), {
    message: `Branch must be one of: ${ALLOWED_BRANCHES.join(", ")}`,
  }),
  area_manager: z.string().trim().min(1).max(120),
  doj: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "DOJ must be YYYY-MM-DD"),
  age: z
    .union([z.string().regex(/^\d+$/), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? parseInt(v, 10) : null)),
  college: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
  project_type: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v == null || ALLOWED_PROJECT_TYPES.includes(v),
      `Project Type must be one of: ${ALLOWED_PROJECT_TYPES.join(", ")}`,
    ),
  intern_batch: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v ? v : null)),
});

type ParsedRow =
  | { ok: true; row: number; data: z.infer<typeof internSchema> }
  | { ok: false; row: number; errors: string[]; raw: Record<string, string> };

const SAMPLE_CSV = `employee_code,name,phone,email,branch,area_manager,doj,age,college,project_type,intern_batch
I0001,Riya Shah,9876543210,riya@example.com,Mumbai,Rohan Mehta,2026-05-04,22,IIM Mumbai,Form Filling,May 2026
I0002,Karan Verma,9876500000,karan@example.com,Pune,Sneha Rao,2026-05-04,23,SIBM Pune,Promoter,May 2026
`;

export default function AscentUploadPage() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    failed: number;
    links: { name: string; employee_code: string; token: string }[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    if (!rows) return null;
    const valid = rows.filter((r) => r.ok).length;
    return { valid, invalid: rows.length - valid, total: rows.length };
  }, [rows]);

  const handleFile = async (file: File) => {
    setResult(null);
    setFilename(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setRows([]);
      return;
    }
    const missing = REQUIRED.filter((h) => !(h in parsed[0]));
    if (missing.length > 0) {
      setRows([
        {
          ok: false,
          row: 0,
          errors: [`Missing required columns: ${missing.join(", ")}`],
          raw: parsed[0],
        },
      ]);
      return;
    }
    const seenCodes = new Set<string>();
    const out: ParsedRow[] = parsed.map((raw, i) => {
      const r = internSchema.safeParse(raw);
      if (!r.success) {
        return {
          ok: false,
          row: i + 2,
          errors: r.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`),
          raw,
        };
      }
      if (seenCodes.has(r.data.employee_code)) {
        return {
          ok: false,
          row: i + 2,
          errors: [`Duplicate Intern ID in this file: ${r.data.employee_code}`],
          raw,
        };
      }
      seenCodes.add(r.data.employee_code);
      return { ok: true, row: i + 2, data: r.data };
    });
    setRows(out);
  };

  const handleSubmit = async () => {
    if (!rows) return;
    const valid = rows
      .filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok)
      .map((r) => ({ ...r.data, program: "ascent" }));
    if (valid.length === 0) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("employees")
      .insert(valid as any)
      .select("name, employee_code, token");
    setSubmitting(false);
    if (error) {
      setResult({ inserted: 0, failed: valid.length, links: [] });
      return;
    }
    setResult({
      inserted: data?.length ?? valid.length,
      failed: 0,
      links: (data ?? []).map((d: any) => ({
        name: d.name,
        employee_code: d.employee_code,
        token: d.token,
      })),
    });
  };

  const reset = () => {
    setRows(null);
    setResult(null);
    setFilename(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const exportLinks = () => {
    if (!result?.links?.length) return;
    const origin = window.location.origin;
    const lines = ["employee_code,name,survey_link"];
    for (const l of result.links) {
      lines.push(`${l.employee_code},${JSON.stringify(l.name)},${origin}/survey/${l.token}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ascent-survey-links.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RequireAdmin>
      <main className="min-h-dvh bg-background">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Back to program chooser
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "#CCFBF1", color: "#0F766E" }}
            >
              <Rocket size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload Ascent interns</h1>
              <p className="text-sm text-muted-foreground">
                CSV with: {REQUIRED.join(", ")} (+ optional age, college, project_type, intern_batch).
                Branch must be one of {ALLOWED_BRANCHES.join(", ")}.
              </p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            {!rows && (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 px-6 py-14 text-center hover:bg-secondary/50">
                  <span className="text-3xl">📥</span>
                  <span className="font-bold text-foreground">Drop CSV or click to browse</span>
                  <span className="text-xs text-muted-foreground">UTF-8, comma-separated</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
                <details className="mt-4 rounded-xl border border-border/60 bg-background/50 p-3 text-xs">
                  <summary className="cursor-pointer font-bold text-foreground">
                    Sample CSV format
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-secondary/40 p-3 text-[11px] text-foreground">
                    {SAMPLE_CSV}
                  </pre>
                </details>
              </>
            )}

            {rows && stats && !result && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3 text-sm">
                  <span className="text-foreground">
                    <span className="font-bold">{filename}</span> · {stats.total} rows
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                      {stats.valid} valid
                    </span>
                    {stats.invalid > 0 && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-bold text-destructive">
                        {stats.invalid} errors
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto rounded-xl border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/60 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.row} className="border-t border-border/40">
                          <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                          <td className="px-3 py-2">
                            {r.ok ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">OK</span>
                            ) : (
                              <span className="font-bold text-destructive">Error</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {r.ok ? (
                              <span>
                                {r.data.name}{" "}
                                <span className="text-muted-foreground">
                                  · {r.data.employee_code} · {r.data.branch}
                                  {r.data.project_type ? ` · ${r.data.project_type}` : ""}
                                </span>
                              </span>
                            ) : (
                              <span className="text-destructive">{r.errors.join("; ")}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between gap-3 pt-2">
                  <button
                    onClick={reset}
                    className="rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
                  >
                    Choose another file
                  </button>
                  <button
                    disabled={submitting || stats.valid === 0}
                    onClick={handleSubmit}
                    className="rounded-full px-5 py-2 text-xs font-bold text-white shadow disabled:opacity-50"
                    style={{ background: "#0F766E" }}
                  >
                    {submitting ? "Importing…" : `Import ${stats.valid} interns`}
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-5 text-center">
                <p className="text-3xl">✅</p>
                <div>
                  <p className="text-lg font-extrabold text-foreground">
                    Imported {result.inserted} interns
                  </p>
                  {result.failed > 0 && (
                    <p className="mt-1 text-sm text-destructive">{result.failed} failed</p>
                  )}
                </div>

                {result.links.length > 0 && (
                  <div className="mx-auto max-w-2xl rounded-xl border border-border bg-background p-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Survey links</span>
                      <button
                        onClick={exportLinks}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                      >
                        <Download size={12} /> Export CSV
                      </button>
                    </div>
                    <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto text-xs">
                      {result.links.map((l) => (
                        <div
                          key={l.token}
                          className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2"
                        >
                          <span className="font-semibold text-foreground">
                            {l.name}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {l.employee_code}
                            </span>
                          </span>
                          <code className="truncate text-[11px] text-muted-foreground">
                            /survey/{l.token}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={reset}
                    className="rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
                  >
                    Upload another
                  </button>
                  <Link
                    to="/"
                    className="rounded-full px-5 py-2 text-xs font-bold text-white"
                    style={{ background: "#0F766E" }}
                  >
                    Done
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </RequireAdmin>
  );
}
