import type { Metadata } from "next";
import { ImportChannels } from "@/components/imports/import-channels";

export const metadata: Metadata = { title: "Import" };

export default function ImportsPage() {
  return <ImportChannels />;
}
