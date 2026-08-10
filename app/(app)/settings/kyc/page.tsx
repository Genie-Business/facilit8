import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KycForm } from "@/components/kyc/kyc-form";
import { retryProvisioningAction } from "@/lib/actions/kyc.actions";

export default async function KycPage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Identity verification</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Status
            <Badge variant={user.kycVerified ? "secondary" : "outline"}>
              {user.kycVerified ? "Verified" : "Not verified"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!user.anchorCustomerId && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your account is still being set up with our payment provider.
              </p>
              <form action={retryProvisioningAction}>
                <Button type="submit" size="sm" variant="outline">
                  Retry setup
                </Button>
              </form>
            </div>
          )}
          {user.vaFailureReason && (
            <p className="text-destructive">Setup error: {user.vaFailureReason}</p>
          )}
          {user.kycFailedReason && <p className="text-destructive">Verification error: {user.kycFailedReason}</p>}
        </CardContent>
      </Card>

      {!user.kycVerified && user.anchorCustomerId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verify your identity</CardTitle>
          </CardHeader>
          <CardContent>
            <KycForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
