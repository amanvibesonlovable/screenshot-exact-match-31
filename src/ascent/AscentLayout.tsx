import RequireAdmin from "@/hr/RequireAdmin";
import { AscentSidebar, AscentHeader } from "./AscentSidebar";

export function AscentLayout({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <RequireAdmin>
      <div className="min-h-dvh bg-background">
        <AscentHeader title={title} rightSlot={rightSlot} />
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
          <AscentSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </RequireAdmin>
  );
}
