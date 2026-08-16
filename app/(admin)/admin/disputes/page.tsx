import type { Metadata } from "next";
import Link from "next/link";

import { listDisputes } from "@/lib/services/dispute.service";
import { markDisputeUnderReviewAction } from "@/lib/actions/admin-dispute.actions";
import { ResolveDisputeForm } from "@/components/admin/resolve-dispute-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Disputes",
  robots: { index: false, follow: false },
};

const STATUS_BADGE: Record<string, "secondary" | "outline" | "destructive" | "default"> = {
  OPEN: "destructive",
  UNDER_REVIEW: "outline",
  RESOLVED_REFUNDED: "secondary",
  RESOLVED_NO_ACTION: "default",
};

export default async function AdminDisputesPage() {
  const disputes = await listDisputes();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Disputes</h1>
        <p className="text-muted-foreground">
          Event Managers can request a refund when a funded training didn't happen. Refunds only move money for
          engagements that haven't already been paid out to a facilitator.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All disputes</CardTitle>
          <CardDescription>{disputes.length} total</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {disputes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disputes have been raised.</p>
          ) : (
            disputes.map((dispute) => {
              const target = dispute.trainingEvent ?? dispute.mergedTrainingEvent;
              const targetHref =
                dispute.targetType === "TRAINING_EVENT"
                  ? `/events/${dispute.trainingEvent?.slug}`
                  : `/merged-trainings/${dispute.mergedTrainingEvent?.slug}`;

              return (
                <div key={dispute.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={targetHref} className="font-medium hover:underline">
                        {target?.title ?? "Unknown"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Raised by {dispute.raisedBy.firstName} {dispute.raisedBy.lastName} ({dispute.raisedBy.email})
                        {" · "}
                        {dispute.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE[dispute.status]}>{dispute.status.replaceAll("_", " ")}</Badge>
                  </div>

                  <p className="mt-2 text-sm">{dispute.reason}</p>

                  {dispute.status === "OPEN" && (
                    <form action={markDisputeUnderReviewAction.bind(null, dispute.id)} className="mt-3">
                      <Button type="submit" size="sm" variant="outline">
                        Mark under review
                      </Button>
                    </form>
                  )}

                  {(dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW") && (
                    <div className="mt-3">
                      <ResolveDisputeForm disputeId={dispute.id} alreadyPaid={target?.isPaid ?? false} />
                    </div>
                  )}

                  {(dispute.status === "RESOLVED_REFUNDED" || dispute.status === "RESOLVED_NO_ACTION") && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Resolved by {dispute.resolvedBy?.firstName} {dispute.resolvedBy?.lastName}
                      {dispute.resolutionNotes ? `: ${dispute.resolutionNotes}` : ""}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
