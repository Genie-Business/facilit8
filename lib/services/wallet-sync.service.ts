import { prisma } from "@/lib/db";
import { fetchCustomerDedicatedAccount } from "@/lib/paystack/api";
import { isPaystackConfigured } from "@/lib/paystack/client";
import { activateWallet } from "@/lib/services/wallet-activation.service";

export type WalletSyncOutcome =
  | "activated" // the virtual account existed at Paystack; the wallet is live now
  | "already_active"
  | "not_ready" // nothing submitted, or Paystack hasn't created the virtual account yet
  | "not_configured"
  | "not_found"
  | "unavailable"; // Paystack couldn't be reached or answered unexpectedly; try again later

/**
 * Brings a user's wallet up from Paystack's side, without waiting for a webhook.
 *
 * Verification normally completes when Paystack's "virtual account assigned" event arrives. Events
 * can be late or lost (a misconfigured webhook, an outage), and then the person would have a
 * virtual account at Paystack and an unverified profile here. This asks Paystack directly instead.
 * Paystack only creates the account once the BVN has been matched to the bank account, so an
 * existing account IS the verification result.
 *
 * Only someone who has submitted identity verification is considered (that is when their BVN is
 * stored), so a virtual account that has nothing to do with a Facilit8 submission can't activate
 * anyone. Safe to run any number of times.
 */
export async function syncWalletFromPaystack(userId: string): Promise<WalletSyncOutcome> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, bvn: true, kycVerified: true, depositAccountId: true },
  });
  if (!user) return "not_found";
  if (user.kycVerified && user.depositAccountId) return "already_active";
  if (!isPaystackConfigured()) return "not_configured";
  if (!user.bvn) return "not_ready";

  try {
    const found = await fetchCustomerDedicatedAccount(user.email);
    if (!found?.account) return "not_ready";

    const outcome = await activateWallet({ customerCode: found.customerCode, email: user.email }, found.account);
    if (outcome === "user_not_found") return "not_found";
    return outcome === "activated" ? "activated" : "already_active";
  } catch (err) {
    console.error(`Could not sync the wallet for user ${userId} from Paystack:`, err);
    // The wallet is saved before the "your wallet is ready" notification goes out, so a failure in that
    // last step (the realtime push, say) can still leave the wallet live. Report what is true.
    const now = await prisma.user.findUnique({ where: { id: userId }, select: { kycVerified: true, depositAccountId: true } }).catch(() => null);
    return now?.kycVerified && now.depositAccountId ? "activated" : "unavailable";
  }
}

const MAX_USERS_PER_RUN = 25;

/**
 * The scheduled catch-up for the same thing: everyone who has submitted identity verification and
 * has no wallet yet gets looked up at Paystack. A person whose event simply hasn't arrived yet is
 * found here within the cron interval.
 */
export async function reconcilePendingKyc(): Promise<{ kycChecked: number; kycActivated: number }> {
  const pending = await prisma.user.findMany({
    where: { bvn: { not: null }, kycVerified: false, depositAccountId: null },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: MAX_USERS_PER_RUN,
  });

  let activated = 0;
  for (const { id } of pending) {
    if ((await syncWalletFromPaystack(id)) === "activated") activated += 1;
  }
  return { kycChecked: pending.length, kycActivated: activated };
}
