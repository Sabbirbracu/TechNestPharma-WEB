import { redirect } from "next/navigation";

/** "Email" is a menu group, not a screen — its first entry is the inbox. */
export default function EmailPage() {
  redirect("/email/inbox");
}
