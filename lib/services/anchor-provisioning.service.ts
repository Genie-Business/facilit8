import { prisma } from "@/lib/db";
import { AnchorApiError } from "@/lib/anchor/types";
import { createCounterParty, createIndividualCustomer } from "@/lib/anchor/customers";

/**
 * Provisions a new user's Anchor IndividualCustomer and CounterParty (their linked
 * withdrawal bank account). Called from signup, but never throws — failures are recorded
 * on the user row (vaCreationFailed/vaFailureReason) so signup always succeeds and the
 * "retry provisioning" flow can pick it back up later.
 *
 * The two calls are sequenced deliberately, not run in parallel: an earlier Promise.all
 * version lost successful customer creation whenever the paired counterparty call failed,
 * because neither result was persisted until both resolved — leaving an orphaned customer
 * on Anchor's side with no local record of it. Each step now saves its own result the
 * moment it succeeds.
 */
export async function provisionAnchorCustomer(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  let customerId = user.anchorCustomerId;

  if (!customerId) {
    try {
      customerId = await createIndividualCustomer(user);
      await prisma.user.update({
        where: { id: userId },
        data: { anchorCustomerId: customerId, vaFailureReason: null },
      });
    } catch (err) {
      const alreadyExists = err instanceof AnchorApiError && /already exist/i.test(JSON.stringify(err.body));
      const message = alreadyExists
        ? "A customer with this email already exists in Anchor for this organization. Needs manual reconciliation."
        : err instanceof Error
          ? err.message
          : "Unknown provisioning error";
      console.error(`Anchor customer creation failed for user ${userId}:`, err);
      await prisma.user.update({ where: { id: userId }, data: { vaCreationFailed: true, vaFailureReason: message } });
      return; // Can't create the counterparty without a customer to attach it to.
    }
  }

  if (!user.anchorCounterpartyId && user.linkedBankCode && user.linkedAccountNumber && user.linkedAccountName) {
    try {
      const counterpartyId = await createCounterParty({
        bankCode: user.linkedBankCode,
        accountNumber: user.linkedAccountNumber,
        accountName: user.linkedAccountName,
      });
      await prisma.user.update({
        where: { id: userId },
        data: { anchorCounterpartyId: counterpartyId, vaCreationFailed: false, vaFailureReason: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown provisioning error";
      console.error(`Anchor counterparty creation failed for user ${userId}:`, err);
      await prisma.user.update({ where: { id: userId }, data: { vaCreationFailed: true, vaFailureReason: message } });
    }
  }
}

export interface UpdateLinkedBankAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Links a (possibly new) withdrawal bank account for an existing user — used both by users
 * who skipped this at signup and by anyone switching banks later. Anchor CounterParty
 * objects represent one specific external account each, so switching banks means creating
 * a fresh CounterParty rather than mutating the old one; the old one is simply abandoned
 * (Anchor doesn't require deleting it).
 */
export async function updateLinkedBankAccount(
  userId: string,
  params: { bankCode: string; bankName: string; accountNumber: string; accountName: string }
): Promise<UpdateLinkedBankAccountResult> {
  try {
    const counterpartyId = await createCounterParty({
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      accountName: params.accountName,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        linkedBankCode: params.bankCode,
        linkedBankName: params.bankName,
        linkedAccountNumber: params.accountNumber,
        linkedAccountName: params.accountName,
        anchorCounterpartyId: counterpartyId,
        // A freshly-created counterparty means whatever provisioning problem existed before
        // (if any) no longer applies to the counterparty side. Cleared here rather than left
        // to provisionAnchorCustomer's own counterparty branch, since that branch is skipped
        // whenever anchorCounterpartyId is already set by the time it runs (e.g. right after
        // this call, from the account-recovery flow) — it would otherwise never fire.
        vaCreationFailed: false,
        vaFailureReason: null,
      },
    });
    return { success: true };
  } catch (err) {
    console.error(`Failed to link bank account for user ${userId}:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Couldn't link this account." };
  }
}
