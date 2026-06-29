import { RedesignShell } from "@/components/redesign/RedesignShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RedesignShell>{children}</RedesignShell>;
}
