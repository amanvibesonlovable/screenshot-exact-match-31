import RequireAdmin from "./RequireAdmin";

export default function RequireHr({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
