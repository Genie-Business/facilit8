import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckWalletForm } from "@/components/kyc/check-wallet-form";
import { FundingDetails } from "@/components/wallet/funding-details";
import { KycForm } from "@/components/kyc/kyc-form";
import { LinkBankAccountForm } from "@/components/wallet/link-bank-account-form";
import { retryProvisioningAction } from "@/lib/actions/kyc.actions";
import { getBankOptions } from "@/lib/services/bank-list.service";

export default async function KycPage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  // Verification checks the BVN against the user's own bank account, so that has to come first.
  const needsBank = !user.paystackRecipientCode || !user.linkedAccountNumber;
  const banks = needsBank ? await getBankOptions() : [];
  const submitted = !!user.bvn && !user.kycFailedReason;

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
          {!user.paystackCustomerCode && (
            <div className="space-y-2">
              <p className="text-muted-foreground">Your account is still being set up with our payment partner.</p>
              <form action={retryProvisioningAction}>
                <Button type="submit" size="sm" variant="outline">
                  Retry setup
                </Button>
              </form>
            </div>
          )}
          {user.kycVerified && user.vaAccountNumber && (
            <div className="space-y-3">
              <p className="text-muted-foreground">Pay into this account to add money to your wallet.</p>
              <FundingDetails bankName={user.vaBankName} accountNumber={user.vaAccountNumber} accountName={user.vaAccountName} />
            </div>
          )}
          {user.vaFailureReason && <p className="text-destructive">Setup error: {user.vaFailureReason}</p>}
          {user.kycFailedReason && <p className="text-destructive">Verification error: {user.kycFailedReason}</p>}
          {!user.kycVerified && submitted && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your details have been submitted. We&apos;ll notify you as soon as they&apos;re confirmed, usually
                within a few minutes.
              </p>
              <CheckWalletForm />
            </div>
          )}
        </CardContent>
      </Card>

      {!user.kycVerified && needsBank && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link your bank account first</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We check your BVN against a bank account in your own name, and it&apos;s also where your withdrawals are
              sent.
            </p>
            <LinkBankAccountForm banks={banks} />
          </CardContent>
        </Card>
      )}

      {!user.kycVerified && !needsBank && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verify your identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your name and your BVN must match the{" "}
              <span className="font-medium text-foreground">
                {user.linkedBankName ?? "linked"} account ending {user.linkedAccountNumber?.slice(-4)}
              </span>
              . Verifying creates your wallet.
            </p>
            <KycForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
