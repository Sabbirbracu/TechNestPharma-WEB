import type { Metadata } from "next";
import { TestTube2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Samples" };

export default function SamplesPage() {
  return (
    <>
      <PageHeader
        title="Samples"
        description="Sample requests through their lifecycle, with a full status timeline."
      >
        <Button>
          <Plus />
          New sample request
        </Button>
      </PageHeader>

      <EmptyState
        icon={TestTube2}
        title="No sample requests yet"
        description="A sample moves requested → promised → shipped → received → under test → approved or rejected, with cancel reachable from any state."
      />
    </>
  );
}
