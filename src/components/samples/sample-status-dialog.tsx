"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useChangeSampleStatus } from "@/lib/queries";
import { SAMPLE_STATUS_STYLES, STATUS_ACTION_LABEL } from "./sample-taxonomy";
import type { SampleRequestListItem, SampleStatusChangeInput } from "@/types/api";
import type { SampleStatus, SampleTestResult } from "@/types/domain";

/**
 * Moving a sample, and recording what moved it, in one step.
 *
 * The design decision this file exists to hold: a status change is never asked
 * for on its own. A sample goes to Shipped *because* a courier collected it,
 * and to Approved *because* it passed — and if the courier and the result are
 * a separate edit afterwards, they are an edit nobody does. So each
 * destination brings its own fields, and only its own: marking something
 * received asks for a date, not a tracking number it already has.
 *
 * The dates default to today on the server rather than being pre-filled here,
 * so an empty field means "today" instead of the reader having to notice a
 * value they did not type.
 */
const today = () => new Date().toISOString().slice(0, 10);

export function SampleStatusDialog({
  sample,
  target,
  onClose,
}: {
  sample: SampleRequestListItem;
  target: SampleStatus;
  onClose: () => void;
}) {
  const change = useChangeSampleStatus(sample.id);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [courier, setCourier] = useState(sample.courier ?? "");
  const [tracking, setTracking] = useState(sample.tracking_no ?? "");
  const [result, setResult] = useState<SampleTestResult>("pass");

  // What this particular move needs. Anything not listed is not asked for.
  const wantsPromisedDate = target === "promised";
  const wantsShipping = target === "shipped";
  const wantsReceivedDate = target === "received";
  const wantsResult = target === "approved" || target === "rejected";

  const style = SAMPLE_STATUS_STYLES[target];

  async function submit() {
    const payload: SampleStatusChangeInput = {
      to_status: target,
      note: note.trim() || null,
    };
    if (wantsPromisedDate) payload.promised_on = date;
    if (wantsShipping) {
      payload.shipped_on = date;
      payload.courier = courier.trim() || null;
      payload.tracking_no = tracking.trim() || null;
    }
    if (wantsReceivedDate) payload.received_on = date;
    if (wantsResult) {
      // A rejection is a fail unless somebody says otherwise; an approval
      // defaults to a clean pass. Both are overridable — "conditional" is a
      // real outcome and the one people forget the field exists for.
      payload.test_result = target === "rejected" ? "fail" : result;
    }

    try {
      await change.mutateAsync(payload);
      toast.success(`Moved to ${style.label}.`);
      onClose();
    } catch {
      // `useChangeSampleStatus` surfaces the server's own sentence, which
      // names the moves that *are* legal from here.
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={STATUS_ACTION_LABEL[target]}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              {STATUS_ACTION_LABEL[target]}
            </h2>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              {sample.product?.name_en ?? "Sample"}
              {sample.company ? ` · ${sample.company.name_en}` : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          {(wantsPromisedDate || wantsShipping || wantsReceivedDate) && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                {wantsPromisedDate
                  ? "Promised for"
                  : wantsShipping
                    ? "Shipped on"
                    : "Received on"}
              </span>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}

          {wantsShipping && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Courier
                </span>
                <Input
                  value={courier}
                  onChange={(event) => setCourier(event.target.value)}
                  placeholder="DHL, FedEx…"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Tracking number
                </span>
                <Input
                  value={tracking}
                  onChange={(event) => setTracking(event.target.value)}
                  placeholder="AWB / consignment"
                />
              </label>
            </div>
          )}

          {wantsResult && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Test result
              </span>
              <Select
                value={target === "rejected" ? "fail" : result}
                disabled={target === "rejected"}
                onChange={(event) =>
                  setResult(event.target.value as SampleTestResult)
                }
              >
                <option value="pass">Pass</option>
                <option value="conditional">Conditional — pass with caveats</option>
                <option value="fail">Fail</option>
              </Select>
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Note <span className="font-medium opacity-70">(optional)</span>
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder={
                wantsResult
                  ? "Assay, appearance, what the lab said…"
                  : "Anything worth remembering about this step…"
              }
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3.5">
          <Button variant="outline" onClick={onClose} disabled={change.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={change.isPending}>
            {change.isPending && <Loader2 className="animate-spin" />}
            {STATUS_ACTION_LABEL[target]}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
