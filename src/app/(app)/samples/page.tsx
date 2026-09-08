import type { Metadata } from "next";
import { SampleWorkspace } from "@/components/samples/sample-workspace";

export const metadata: Metadata = { title: "Samples" };

export default function SamplesPage() {
  return <SampleWorkspace />;
}
