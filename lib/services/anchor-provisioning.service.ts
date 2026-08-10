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
        ? "A customer with this email already exists in Anchor for this organization — needs manual reconciliation."
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
