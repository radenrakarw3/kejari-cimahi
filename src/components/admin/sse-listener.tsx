"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export function SseListener() {
  useEffect(() => {
    const es = new EventSource("/api/sse/updates");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_report") {
          toast.info("Laporan Baru Masuk", {
            description: `Nomor: ${event.report?.nomorLaporan ?? "-"}`,
            icon: <FileText className="w-4 h-4 text-amber-400" />,
            duration: 5000,
          });
        }
      } catch {}
    };

    es.onerror = () => {
      // SSE will auto-reconnect, no need to handle
    };

    return () => es.close();
  }, []);

  return null;
}
