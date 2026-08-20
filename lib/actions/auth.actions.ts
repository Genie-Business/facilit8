"use server";

import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { sendEmail } from "@/lib/email/resend";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { appUrl, siteUrl } from "@/lib/site";
import { getBankOptions } from "@/lib/services/bank-list.service";
import { provisionAnchorCustomer } from "@/lib/services/anchor-provisioning.service";
import { joinOrCreateOrganization, requestOrganizationMembership } from "@/lib/services/organization.service";
import { reactivateUser } from "@/lib/services/user-status.service";
import { isRateLimited, RATE_LIMITS, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  deactivated?: boolean;
}

function firstFieldErrors(flat: Record<string, string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages && messages.length > 0) out[key] = messages[0];
  }
  return out;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await isRateLimited("signup", RATE_LIMITS.signup.limit, RATE_LIMITS.signup.windowMs)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;

  const [emailTaken, phoneTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.user.findUnique({ where: { mobilePhone: data.mobilePhone } }),
  ]);
  if (emailTaken) return { fieldErrors: { email: "An account with this email already exists." } };
  if (phoneTaken) return { fieldErrors: { mobilePhone: "An account with this phone number already exists." } };

  const passwordHash = await bcrypt.hash(data.password, 12);
  const slug = await generateUniqueSlug(
    `${data.firstName}-${data.lastName}`,
    async (candidate) => (await prisma.user.findUnique({ where: { slug: candidate } })) !== null
  );

  let bankName: string | null = null;
  if (data.bankCode) {
    const banks = await getBankOptions();
    bankName = banks.find((bank) => bank.code === data.bankCode)?.name ?? null;
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      mobilePhone: data.mobilePhone,
      state: data.state || null,
      localGovt: data.localGovt || null,
      address: data.address || null,
      organization: data.organization || null,
      linkedBankCode: data.bankCode || null,
      linkedBankName: bankName,
      linkedAccountNumber: data.accountNumber || null,
      linkedAccountName: data.accountName || null,
      slug,
    },
  });

  if (data.role === "EVENT_MANAGER" && data.organization) {
    await joinOrCreateOrganization(user.id, data.organization);
    revalidatePath("/signup");
  } else if (data.role === "PROFESSIONAL" && data.affiliationType === "organization" && data.organizationId) {
    await requestOrganizationMembership(user.id, data.organizationId);
  }

  // Never let account creation fail because Anchor is slow/unreachable — provisioning
  // records its own failure state on the user row and can be retried later.
  await provisionAnchorCustomer(user.id);

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: `${appUrl}/dashboard`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed. Please log in." };
    }
    throw err; // NEXT_REDIRECT is thrown as a "digest" error and must propagate
  }

  return {};
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await isRateLimited("login", RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  // Checked here, before signIn(), rather than by threading a custom error type through
  // NextAuth's authorize() -> CredentialsSignin pipeline: that mechanism is fragile and
  // version-sensitive (this project has already been burned once trusting unverified
  // Next.js internals in production). authorize() still independently rejects deactivated
  // accounts as a backstop for the raw /api/auth/callback/credentials endpoint, which
  // bypasses this action entirely — see lib/auth.ts.
  //
  // "intent=reactivate" comes from the submit button's own name/value (native HTML
  // multi-submitter behavior — only present in FormData when THAT button was clicked, not
  // the default "Sign in" one), which LoginForm swaps in once it's already shown the
  // reactivate prompt below. A single useActionState-bound action can't be handed a second
  // per-button formAction that also needs the (prevState, formData) signature, so this is
  // one action branching on intent rather than two.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const isReactivateIntent = formData.get("intent") === "reactivate";

  if (isReactivateIntent) {
    if (!user?.deactivatedAt) return { error: "Something went wrong. Please try logging in again." };
    const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordValid) return { error: "Something went wrong. Please try logging in again." };
    await reactivateUser(user.id);
  } else if (user?.deactivatedAt && (await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { deactivated: true };
  }

  // Admins land on their own dashboard (apex /admin), not the app subdomain's member
  // dashboard — the redirect callback in auth.config.ts already allow-lists both origins,
  // and this exact signIn()-redirectTo mechanism already crosses from the apex /login page
  // to the app subdomain for every normal login today, so this is a proven-safe cross-host
  // hop (unlike a middleware-level NextResponse.redirect(), which has a real, documented bug
  // collapsing cross-host redirects back to a relative path — see proxy.ts's crossHostRedirect
  // comment). An explicit callbackUrl (e.g. bounced here from a specific admin page while
  // logged out) still wins over this default.
  const callbackUrl = formData.get("callbackUrl");
  const defaultRedirect = user?.role === "ADMIN" ? `${siteUrl}/admin` : `${appUrl}/dashboard`;
  const redirectTo = typeof callbackUrl === "string" && callbackUrl ? callbackUrl : defaultRedirect;

  try {
    await signIn("credentials", { ...parsed.data, redirectTo });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: siteUrl });
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (await isRateLimited("password-reset", RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const raw = Object.fromEntries(formData);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const genericSuccess = "If an account exists for that email, a reset link has been sent.";

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    // Don't reveal whether the email is registered.
    return { success: genericSuccess };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Facilit8 password",
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return { success: genericSuccess };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Invalid or missing reset token." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: "Password updated. You can now log in." };
}
