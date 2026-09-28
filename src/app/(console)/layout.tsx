import { AppShell } from "@/components/platform/app-shell";
import { Toaster } from "@/components/ui/sonner";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
