import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { parseCsv } from "./csv";

const REQUIRED = [
  "employee_code",
  "name",
  "phone",
  "email",
  "branch",
  "area_manager",
  "doj",
] as const;

const employeeSchema = z.object({
  employee_code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(255),
  branch: z.string().trim().min(1).max(120),
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
});

type ParsedRow =
  | { ok: true; row: number; data: z.infer<typeof employeeSchema> }
  | { ok: false; row: number; errors: string[]; raw: Record<string, string> };

const SAMPLE_CSV = `employee_code,name,phone,email,branch,area_manager,doj,age,college
T0001,Aarav Sharma,9876543210,aarav@example.com,Mumbai - Andheri,Rohan Mehta,2026-04-01,23,IIT Bombay
T0002,Priya Iyer,9876500000,priya@example.com,Bengaluru - Koramangala,Sneha Rao,2026-04-10,24,NIT Trichy
`;

export default function CsvUploadModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);
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
    const out: ParsedRow[] = parsed.map((raw, i) => {
      const r = employeeSchema.safeParse(raw);
      if (r.success) return { ok: true, row: i + 2, data: r.data };
      return {
        ok: false,
        row: i + 2,
        errors: r.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`),
        raw,
      };
    });
    setRows(out);
  };

  const handleSubmit = async () => {
    if (!rows) return;
    const valid = rows.filter((r): r is Extract<ParsedRow, { ok: true }> => r.ok).map((r) => r.data);
    if (valid.length === 0) return;
    setSubmitting(true);
    const { error, count } = await supabase
      .from("employees")
      .insert(valid as any, { count: "exact" });
    setSubmitting(false);
    if (error) {
      setResult({ inserted: 0, failed: valid.length });
      return;
    }
    setResult({ inserted: count ?? valid.length, failed: 0 });
    onUploaded();
  };

  const reset = () => {
    setRows(null);
    setResult(null);
    setFilename(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Upload trainee roster</h2>
            <p className="text-xs text-muted-foreground">
              CSV with columns: {REQUIRED.join(", ")} (+ optional age, college)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            Close
          </button>
        </header>

        <div className="space-y-4 p-6">
          {!rows && (
            <>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-secondary/30 px-6 py-12 text-center hover:bg-secondary/50">
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
              <details className="rounded-2xl border border-border/60 bg-background/50 p-3 text-xs">
                <summary className="cursor-pointer font-bold text-foreground">
                  Sample CSV format
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-secondary/40 p-3 text-[11px] text-foreground">
                  {SAMPLE_CSV}
                </pre>
              </details>
            </>
          )}

          {rows && stats && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-3 text-sm">
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

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-border/60">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-secondary/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isOk = r.ok;
                      return (
                        <tr key={r.row} className="border-t border-border/40">
                          <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                          <td className="px-3 py-2">
                            {isOk ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                OK
                              </span>
                            ) : (
                              <span className="font-bold text-destructive">Error</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {isOk ? (
                              <span>
                                {(r as any).data.name}{" "}
                                <span className="text-muted-foreground">
                                  · {(r as any).data.employee_code} · {(r as any).data.branch}
                                </span>
                              </span>
                            ) : (
                              <span className="text-destructive">
                                {(r as any).errors.join("; ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={reset}
                  className="rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
                >
                  Choose another file
                </button>
                <button
                  disabled={submitting || stats.valid === 0}
                  onClick={handleSubmit}
                  className="rounded-full bg-gradient-brand px-5 py-2 text-xs font-bold text-primary-foreground shadow-soft disabled:opacity-50"
                >
                  {submitting ? "Importing…" : `Import ${stats.valid} trainees`}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 text-center">
              <p className="text-3xl">✅</p>
              <div>
                <p className="text-lg font-extrabold text-foreground">
                  Imported {result.inserted} trainees
                </p>
                {result.failed > 0 && (
                  <p className="mt-1 text-sm text-destructive">{result.failed} failed</p>
                )}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={reset}
                  className="rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
                >
                  Upload another
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full bg-gradient-brand px-5 py-2 text-xs font-bold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
