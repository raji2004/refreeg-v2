import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-cream text-ink">{children}</div>;
}
