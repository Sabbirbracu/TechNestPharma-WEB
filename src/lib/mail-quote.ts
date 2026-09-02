/**
 * Splitting a reply away from the conversation it quotes.
 *
 * Suppliers reply from Gmail, Outlook and Foxmail, and every one of them
 * appends our own inquiry underneath the answer. A one-word reply — "Not
 * available" is the common case — then renders as forty lines of our own
 * questions with the actual answer lost at the top.
 *
 * The cut happens at display time rather than on sync: the raw body stays in
 * `communication.body` where a later parser (quotation extraction) can still
 * read the whole message, and a mis-cut costs a click to reveal rather than
 * data we no longer hold.
 */

/** Attribution line: "On <date>, <name> <addr> wrote:". Gmail wraps it across
 *  up to three lines when the sender's name and address are long, so this is
 *  matched against a joined lookahead rather than a single line. */
const ATTRIBUTION = /^\s*(On|Am|El|Le)\b[\s\S]{0,300}?\b(wrote|schrieb|escribió|a écrit)\s*:\s*$/;

/** Client-specific separators that introduce a quoted block on their own. */
const SEPARATORS: RegExp[] = [
  /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i,
  /^\s*-{3,}\s*Forwarded message\s*-{3,}\s*$/i,
  /^\s*_{10,}\s*$/,
  /^\s*-{10,}\s*$/,
  /^\s*(发件人|發件人|寄件者|差出人|보낸\s*사람)\s*[:：]/,
];

/** Outlook's quoted header block, which has no separator of its own — it just
 *  starts with From: and runs through Subject:. Matched only when the
 *  following lines confirm it, so a message body that opens "From: our last
 *  order..." is not mistaken for one. */
const OUTLOOK_FROM = /^\s*From\s*[:：]\s*\S/i;
const OUTLOOK_FOLLOW = /^\s*(Sent|Date|To|Subject|Cc)\s*[:：]/i;

export type SplitBody = {
  /** What the sender actually typed. */
  reply: string;
  /** The conversation they quoted underneath it, if any. */
  quoted: string;
};

/**
 * Cut `body` at the first quoted block.
 *
 * Falls back to the whole body whenever the cut would leave nothing to read —
 * a top-posted reply is worth more than a tidy rule, and an inline reply
 * (answers typed between the quoted questions) has no clean split at all.
 */
export function splitQuotedReply(body: string | null | undefined): SplitBody {
  const text = (body ?? "").replace(/\r\n?/g, "\n");
  if (!text.trim()) return { reply: "", quoted: "" };

  const lines = text.split("\n");
  const cut = findQuoteStart(lines);
  if (cut === null) return { reply: trimBlankEdges(text), quoted: "" };

  const reply = trimBlankEdges(lines.slice(0, cut).join("\n"));
  const quoted = trimBlankEdges(lines.slice(cut).join("\n"));

  // Nothing above the quote: the sender bottom-posted, or the whole message is
  // a forward. Showing an empty card would be worse than showing the quote.
  if (!reply) return { reply: trimBlankEdges(text), quoted: "" };

  return { reply, quoted };
}

function findQuoteStart(lines: string[]): number | null {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // A run of ">" quoting starts the block. The attribution line above it,
    // when there is one, is folded in by backing up over it below.
    if (/^\s*>/.test(line)) return backUpOverAttribution(lines, i);

    if (SEPARATORS.some((pattern) => pattern.test(line))) return i;

    // Attribution can span the next couple of lines before reaching "wrote:".
    if (/^\s*(On|Am|El|Le)\b/.test(line)) {
      for (let span = 1; span <= 3 && i + span <= lines.length; span += 1) {
        const joined = lines.slice(i, i + span).join(" ");
        if (ATTRIBUTION.test(joined)) return i;
      }
    }

    if (
      OUTLOOK_FROM.test(line) &&
      lines.slice(i + 1, i + 5).some((next) => OUTLOOK_FOLLOW.test(next))
    ) {
      return i;
    }
  }
  return null;
}

/** Pull the cut up past a "… wrote:" line (and the blank line before it) so
 *  the attribution does not strand itself at the bottom of the reply. */
function backUpOverAttribution(lines: string[], index: number): number {
  let cut = index;
  for (let back = 1; back <= 4 && cut - back >= 0; back += 1) {
    const joined = lines.slice(cut - back, cut).join(" ");
    if (ATTRIBUTION.test(joined)) {
      cut -= back;
      break;
    }
  }
  while (cut > 0 && !lines[cut - 1].trim()) cut -= 1;
  return cut;
}

function trimBlankEdges(text: string): string {
  return text.replace(/^\s*\n/, "").replace(/\s+$/, "").trimEnd();
}

/** Strip the Re:/Fwd: prefixes a thread accumulates, so every message in it
 *  can be compared against one subject. */
export function baseSubject(subject: string | null | undefined): string {
  return (subject ?? "")
    .replace(/^(\s*(re|aw|fw|fwd|sv|vs|回复|轉寄)\s*(\[\d+\])?\s*[:：])+/i, "")
    .trim();
}
