import { type ReactNode } from "react";

import { AppShell } from "~/components/layout/app-shell";

/**
 * Authenticated app shell layout.
 * Every screen under /(app) inherits sidebar, header, and bottom nav.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
