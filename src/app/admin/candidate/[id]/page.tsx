"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Shell, Spinner } from "@/components/ui";
import { CandidateDetailPanel } from "@/components/admin/CandidateDetailPanel";

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <Shell narrow>
      <div className="flex justify-center py-16">
        <Spinner className="w-6 h-6" />
      </div>
      <CandidateDetailPanel id={id} onClose={() => router.push("/admin")} />
    </Shell>
  );
}
