/**
 * What deleting from the tender board actually does, said before it happens.
 *
 * Two different outcomes hide behind one Delete button: a tender read out of a
 * notice is UNPUBLISHED — it returns to that notice as a draft, where it can
 * be confirmed again — while a tender typed in by hand is deleted. A mixed
 * selection gets both sentences.
 */
export function DeleteTenderDescription({
  label,
  fromNotice,
  typedIn,
}: {
  /** What is being deleted: `"SEM/18"`, or `"3 tenders"`. */
  label: string;
  /** How many of them were read out of a notice. */
  fromNotice: number;
  /** How many were typed in by hand. */
  typedIn: number;
}) {
  const total = fromNotice + typedIn;
  return (
    <div className="space-y-2">
      <p>
        Are you sure you want to delete{" "}
        <span className="font-semibold text-foreground">{label}</span>?
      </p>
      {fromNotice > 0 && (
        <p>
          {total === 1
            ? "This tender came from a tender notice, so it will be "
            : `${fromNotice === total ? "They" : `${fromNotice} of them`} came from a tender notice and will be `}
          <span className="font-semibold text-foreground">unpublished</span>:
          removed from this page and sent back to the notice as a draft, where
          it can be checked and confirmed again.
        </p>
      )}
      {typedIn > 0 && (
        <p>
          {total === 1
            ? "This tender was added by hand, so it will be deleted permanently."
            : `${typedIn === total ? "They were" : `${typedIn} of them were`} added by hand and will be deleted permanently.`}
        </p>
      )}
    </div>
  );
}
