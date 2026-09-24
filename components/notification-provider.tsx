"use client";

import { useEffect } from "react";
import { useNotifications } from "@/hooks/use-notification";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSupported, requestPermission } = useNotifications();

  useEffect(() => {
    if (isSupported) {
      requestPermission();
    }
  }, [isSupported, requestPermission]);

  return <>{children}</>;
}
