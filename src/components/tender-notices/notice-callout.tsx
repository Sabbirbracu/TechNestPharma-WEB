import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Callout({
  tone,
  children,
}: {
  tone: "warning" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-xs font-medium leading-relaxed",
        tone === "warning"
          ? "border-warning/30 bg-warning/10 text-warning-foreground"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
