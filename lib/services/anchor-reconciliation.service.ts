import { prisma } from "@/lib/db";
import { getIndividualCustomer } from "@/lib/anchor/customers";
import { createDepositAccount, fetchUnmaskedAccountNumber } from "@/lib/anchor/accounts";

interface ReconciliationResult {
  success: boolean;
  error?: string;
}

/** Looks up any account's current Anchor-linkage state by email, for the admin lookup tool —
 * separate from listUsersNeedingRecovery, which only catches outright-failed provisioning,
 * not "everything succeeded except the wallet number never landed." */
export async function findUserAnchorState(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      kycVerified: true,
      anchorCustomerId: true,
      anchorCounterpartyId: true,
      depositAccountId: true,
      vaAccountNumber: true,
      vaBankName: true,
      vaCreationFailed: true,
      vaFailureReason: true,
    },
  });
}

/**
 * Manual-reconciliation path for "a customer with this email already exists in Anchor for
 * this organization" — the one failure provisionAnchorCustomer can't recover from on its
 * own, since Anchor has no search-by-email endpoint to find the existing customer
 * automatically. An admin who's found the right customer ID via Anchor's own dashboard
 * supplies it here; this verifies the email actually matches before linking, so a typo'd ID
 * can't silently attach someone else's identity to this account.
 */
export async function linkExistingAnchorCustomer(userId: string, anchorCustomerId: string): Promise<ReconciliationResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };
  if (user.anchorCustomerId) {
    return { success: false, error: `This account already has anchorCustomerId ${user.anchorCustomerId} linked.` };
  }

  const customer = await getIndividualCustomer(anchorCustomerId);
  if (!customer) return { success: false, error: "Couldn't fetch that customer from Anchor — check the ID." };
  if (customer.email?.toLowerCase() !== user.email.toLowerCase()) {
    return {
      success: false,
      error: `That Anchor customer's email (${customer.email ?? "none"}) doesn't match this account's email (${user.email}).`,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { anchorCustomerId, vaCreationFailed: false, vaFailureReason: null },
  });
  return { success: true };
}

/**
 * Fetches (or, if missing entirely, first creates) this user's wallet details directly from
 * Anchor rather than waiting on a webhook — Anchor never sends the unmasked account number
 * over a webhook at all (confirmed against their docs), so any account whose number never
 * showed up needs this, not just ones that errored outright.
 */
export async function syncWalletFromAnchor(userId: string): Promise<ReconciliationResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };
  if (!user.anchorCustomerId) return { success: false, error: "No anchorCustomerId on this account yet." };

  let depositAccountId = user.depositAccountId;
  if (!depositAccountId) {
    try {
      depositAccountId = await createDepositAccount(user.anchorCustomerId);
      await prisma.user.update({ where: { id: userId }, data: { depositAccountId } });
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to create deposit account." };
    }
  }

  const details = await fetchUnmaskedAccountNumber(depositAccountId);
  if (!details) {
    return { success: false, error: "Account created, but no account number is available from Anchor yet — try again shortly." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { vaAccountNumber: details.accountNumber, vaAccountName: details.accountName, vaBankName: details.bankName },
  });
  return { success: true };
}
