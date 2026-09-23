import { ReactNode } from "react";

/**
 * Settings surfaces use the cream/ink system (see docs/DESIGN_GUIDE.md).
 * Sub-navigation lives in SettingsShell so the index page can stay a flat
 * routed list on narrow screens.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-cream text-ink">{children}</div>;
}
