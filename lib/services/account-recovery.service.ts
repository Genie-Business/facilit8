import { randomBytes, createHash } from "node:crypto";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { updateLinkedBankAccount, provisionAnchorCustomer } from "@/lib/services/anchor-provisioning.service";

const RECOVERY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d — longer than password reset's 1h,
// since this isn't a credential change and users may not check email right away.

/**
 * Anyone whose Anchor wallet setup never finished: either provisioning outright failed
 * (vaCreationFailed — e.g. the historical leading-"+" phone bug, now fixed in code but not
 * retroactively applied to already-broken rows), or it silently stalled because
 * linkedBankCode/etc. were never collected (Professionals were exempt from bank fields at
 * signup until later in the product's life — see provisionAnchorCustomer's silent-skip
 * condition). ADMIN role excluded; this is only ever meaningful for the three roles that get
 * a wallet.
 */
export async function listUsersNeedingRecovery() {
  return prisma.user.findMany({
    where: {
      role: { in: ["EVENT_MANAGER", "FACILITATOR", "PROFESSIONAL"] },
      OR: [{ vaCreationFailed: true }, { anchorCustomerId: null }, { anchorCounterpartyId: null }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      anchorCustomerId: true,
      anchorCounterpartyId: true,
      vaCreationFailed: true,
      vaFailureReason: true,
      createdAt: true,
      accountRecoveryTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

interface RecoveryResult {
  success: boolean;
  error?: string;
}

/** Reuses an existing valid (unused, unexpired) token if one was already sent, rather than
 * minting a new one each time an admin clicks send — avoids confusing "which link is the
 * real one" if the button gets clicked twice. */
export async function sendRecoveryEmail(userId: string): Promise<RecoveryResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };

  const existing = await prisma.accountRecoveryToken.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  let rawToken: string;
  if (existing) {
    // The raw token was never stored (only its hash), so a still-valid existing row can't be
    // resent as-is — mint a fresh one and let the old row simply expire unused.
    rawToken = randomBytes(32).toString("hex");
    await prisma.accountRecoveryToken.create({
      data: { userId, tokenHash: createHash("sha256").update(rawToken).digest("hex"), expiresAt: existing.expiresAt },
    });
  } else {
    rawToken = randomBytes(32).toString("hex");
    await prisma.accountRecoveryToken.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: new Date(Date.now() + RECOVERY_TOKEN_TTL_MS),
      },
    });
  }

  const recoveryUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/recover-account/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Action needed: finish setting up your Facilit8 wallet",
    html: `<p>Hi ${user.firstName},</p>
      <p>We found an issue finishing the setup of your Facilit8 wallet. Click the link below to confirm your withdrawal bank account, and we'll complete the rest automatically.</p>
      <p><a href="${recoveryUrl}">${recoveryUrl}</a></p>
      <p>This link expires in 7 days.</p>`,
  });

  return { success: true };
}

interface RedeemInput {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export async function redeemAccountRecoveryToken(rawToken: string, input: RedeemInput): Promise<RecoveryResult> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const recoveryToken = await prisma.accountRecoveryToken.findUnique({ where: { tokenHash } });

  if (!recoveryToken || recoveryToken.usedAt || recoveryToken.expiresAt < new Date()) {
    return { success: false, error: "This recovery link is invalid or has expired. Please request a new one." };
  }

  const bankResult = await updateLinkedBankAccount(recoveryToken.userId, input);
  if (!bankResult.success) return bankResult;

  // Retries whatever's still missing — customer creation if that never succeeded, then the
  // counterparty now that bank details exist. Never throws; failures land back on the user
  // row (vaCreationFailed/vaFailureReason), which is why the user is re-queried below rather
  // than trusting this call's return value (it has none).
  await provisionAnchorCustomer(recoveryToken.userId);

  await prisma.accountRecoveryToken.update({ where: { id: recoveryToken.id }, data: { usedAt: new Date() } });

  const user = await prisma.user.findUnique({
    where: { id: recoveryToken.userId },
    select: { anchorCustomerId: true, anchorCounterpartyId: true, vaFailureReason: true },
  });

  if (!user?.anchorCustomerId || !user?.anchorCounterpartyId) {
    return {
      success: false,
      error: `Your bank account was saved, but we couldn't finish setting up your wallet${
        user?.vaFailureReason ? `: ${user.vaFailureReason}` : ""
      }. Please contact support.`,
    };
  }

  return { success: true };
}
