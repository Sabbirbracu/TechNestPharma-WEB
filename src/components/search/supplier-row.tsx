import { Building2, User, Mail, ClipboardList, MapPin, ShieldCheck, Package } from "lucide-react";
import { ChannelChip } from "@/components/search/channel-chip";
import type { SearchSupplier } from "@/types/api";

/**
 * Premium supplier row - shows company info, contact person, and communication channels
 * in a visually organized, professional layout.
 */
export function SupplierRow({ supplier }: { supplier: SearchSupplier }) {
  const location = [supplier.city, supplier.country].filter(Boolean).join(", ");

  return (
    <li className="group flex flex-col gap-4 rounded-xl border border-border/70 bg-gradient-to-br from-card to-card/95 p-4 shadow-sm transition-all duration-300 hover:border-success/30 hover:shadow-md sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      {/* Company and Contact Info */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Company name */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Building2 className="size-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {supplier.company_name}
            </p>
            {supplier.company_name_cn && (
              <p className="truncate text-xs font-medium text-muted-foreground">
                {supplier.company_name_cn}
              </p>
            )}
            {location && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" strokeWidth={2} />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact person */}
        {supplier.contact && (
          <div className="flex items-center gap-2 rounded-lg bg-accent/20 px-3 py-2">
            <User className="size-3.5 shrink-0 text-success" strokeWidth={2} />
            <span className="text-xs font-bold text-foreground">
              {supplier.contact.name_en}
            </span>
            {supplier.contact.designation && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {supplier.contact.designation}
                </span>
              </>
            )}
          </div>
        )}

        {/* Specification, qualification, and packing — always shown, N/A
            when this supplier gave none */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
            <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2} />
            <div className="min-w-0 text-xs">
              <span className="font-bold text-foreground">Specification: </span>
              <span className={supplier.specification ? "text-muted-foreground" : "text-muted-foreground/60 italic"}>
                {supplier.specification || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2} />
            <div className="min-w-0 text-xs">
              <span className="font-bold text-foreground">Qualification / Approval: </span>
              <span className={supplier.qualification ? "text-muted-foreground" : "text-muted-foreground/60 italic"}>
                {supplier.qualification || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
            <Package className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2} />
            <div className="min-w-0 text-xs">
              <span className="font-bold text-foreground">Packing / Details: </span>
              <span className={supplier.packing ? "text-muted-foreground" : "text-muted-foreground/60 italic"}>
                {supplier.packing || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact channels */}
      <div className="flex flex-wrap gap-2 sm:max-w-[45%] sm:flex-col">
        {supplier.contact && supplier.contact.channels.length > 0 ? (
          supplier.contact.channels.map((ch) => (
            <ChannelChip
              key={`${ch.channel}-${ch.value}`}
              channel={ch.channel}
              value={ch.value}
              isPrimary={ch.is_primary}
            />
          ))
        ) : supplier.fallback_email ? (
          <ChannelChip channel="email" value={supplier.fallback_email} />
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Mail className="size-3.5" strokeWidth={2} />
            <span className="font-medium">No contact on file</span>
          </div>
        )}
      </div>
    </li>
  );
}
