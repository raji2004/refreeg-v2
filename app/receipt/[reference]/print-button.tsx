"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      variant="ink"
      onClick={() => window.print()}
      className="h-11 gap-2 rounded-xl px-5 print:hidden"
    >
      <Download className="h-4 w-4" />
      Download or print
    </Button>
  );
}
