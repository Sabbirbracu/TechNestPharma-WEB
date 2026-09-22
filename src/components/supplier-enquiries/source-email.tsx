"use client";

import { useMemo } from "react";
import { Paperclip } from "lucide-react";

/**
 * The supplier's email, with the selected line's figures highlighted in it.
 *
 * This is the half of the Match-with-email dialog that makes checking safe. An
 * extracted "USD 12.50 / kg" means nothing on its own; beside the sentence it
 * was read from, a wrong decimal point is obvious in a second. Selecting a row
 * on the right highlights the run of text it came from here — which is why
 * `source_excerpt` is stored verbatim and the extraction prompt forbids
 * paraphrasing it.
 *
 * Matching is whitespace-tolerant and nothing else. Email bodies arrive with
 * lines re-wrapped, so an excerpt copied exactly can still differ from the
 * body by a newline; every other difference is a real one and must NOT be
 * papered over — a fuzzy match that highlights the wrong sentence would make
 * a wrong figure look confirmed.
 */

function excerptPattern(excerpt: string): RegExp | null {
  const trimmed = excerpt.trim();
  if (trimmed.length < 3) return null;
  const source = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  try {
    return new RegExp(source, "i");
  } catch {
    return null;
  }
}

export function SourceEmail({
  subject,
  body,
  counterparty,
  occurredAt,
  hasAttachments,
  highlight,
}: {
  subject: string | null;
  body: string | null;
  counterparty: string | null;
  occurredAt: string;
  hasAttachments: boolean;
  highlight: string | null;
}) {
  const segments = useMemo(() => {
    const text = body ?? "";
    if (!highlight) return [{ text, marked: false }];
    const pattern = excerptPattern(highlight);
    if (!pattern) return [{ text, marked: false }];
    const match = pattern.exec(text);
    if (!match) return [{ text, marked: false }];
    return [
      { text: text.slice(0, match.index), marked: false },
      { text: match[0], marked: true },
      { text: text.slice(match.index + match[0].length), marked: false },
    ];
  }, [body, highlight]);

  const found = segments.some((segment) => segment.marked);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="shrink-0 space-y-1 border-b border-border px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Supplier email
        </p>
        <p className="truncate text-sm font-bold text-foreground">
          {subject ?? "(no subject)"}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
          <span className="truncate">{counterparty ?? "Unknown sender"}</span>
          <span>
            {new Date(occurredAt).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {hasAttachments && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" strokeWidth={2.5} />
              Attachments
            </span>
          )}
        </div>
      </header>

      {highlight && !found && (
        // Said plainly rather than hidden. An excerpt that is not in the body
        // means the reading drifted from the email, and that is exactly when a
        // reviewer should stop trusting the row and read the whole message.
        <p className="shrink-0 border-b border-border bg-destructive/5 px-4 py-2 text-[11px] font-semibold text-destructive">
          This line&rsquo;s quoted text was not found in the email. Check the
          figures against the message yourself before confirming.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground">
          {segments.map((segment, index) =>
            segment.marked ? (
              <mark
                key={index}
                className="rounded bg-warning/30 px-0.5 font-semibold text-foreground ring-1 ring-warning/40"
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </pre>
      </div>
    </div>
  );
}
