"use client";

import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  FlaskConical,
  Loader2,
  Plus,
  ScrollText,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * Title, and the two things a buyer starts from.
 *
 * No mailbox status line: sync is a fallback, not the workflow, and a
 * connection state parked under the page title was reporting on plumbing
 * rather than on the work. It lives in Quick Actions instead, next to the
 * button that acts on it.
 */
export function SourcingHeader({
  onExport,
  exporting,
  exportDisabled,
}: {
  onExport: () => void;
  exporting: boolean;
  exportDisabled: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Sourcing
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Manage supplier enquiries, track communications, and compare quotations.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onExport}
          disabled={exporting || exportDisabled}
        >
          {exporting ? (
            <Loader2 className="animate-spin" strokeWidth={2.25} />
          ) : (
            <Download strokeWidth={2.25} />
          )}
          Export
        </Button>

        {/* A split button: the primary half is the common case, the chevron
            holds the two other ways an enquiry actually starts in this ERP. */}
        <div className="flex items-stretch">
          <Button
            type="button"
            disabled
            title="Composing an enquiry from scratch is not built yet — start from a tender or a product"
            className="rounded-r-none"
          >
            <Plus strokeWidth={2.25} />
            New Enquiry
          </Button>
          <DropdownMenu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label="Other ways to start an enquiry"
                className="flex items-center rounded-r-xl border-l border-primary-foreground/20 bg-primary px-2 text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <ChevronDown className="size-4" strokeWidth={2.5} />
              </button>
            )}
          >
            {(close) => (
              <>
                {/* Router pushes rather than <Link>: DropdownMenuItem renders a
                    <button>, and an anchor inside one is invalid markup. */}
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    router.push("/tenders");
                  }}
                >
                  <ScrollText />
                  Start from a tender
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    router.push("/products");
                  }}
                >
                  <FlaskConical />
                  Start from a product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  title="Sending one enquiry to several suppliers at once is not built yet"
                >
                  <Send />
                  Bulk enquiry
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
