"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SourcingRequestDetail } from "@/types/api";

export function SourcingRedirect() {
  const router = useRouter();
  const open = useSearchParams().get("open");

  useEffect(() => {
    const id = Number(open);
    if (!open || !Number.isFinite(id)) {
      router.replace("/supplier-enquiries");
      return;
    }
    apiFetch<SourcingRequestDetail>(`/sourcing/requests/${id}`)
      .then((line) =>
        router.replace(
          line.inquiry_id
            ? `/supplier-enquiries/${line.inquiry_id}#item-${line.id}`
            : "/supplier-enquiries",
        ),
      )
      .catch(() => router.replace("/supplier-enquiries"));
  }, [open, router]);

  return (
    <div className="flex items-center gap-2 p-10 text-sm font-medium text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Opening enquiry…
    </div>
  );
}
