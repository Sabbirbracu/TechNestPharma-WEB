import { redirect } from "next/navigation";

/**
 * The old standalone Supplier Mail route, now the Email Config tab on
 * /settings.
 *
 * Kept as a redirect rather than deleted, because it is the URL Gmail's OAuth
 * callback lands on: the backend redirects the whole browser here with the
 * outcome in the query string (`?status=connected&email=…`), and that value is
 * registered on the Google OAuth client, so it cannot be changed on a whim.
 * The query is forwarded intact — the card on the other side reads it to
 * report whether the connection took.
 */
export default async function MailboxSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = new URLSearchParams({ tab: "email" });
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  redirect(`/settings?${params.toString()}`);
}
