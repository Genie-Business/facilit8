"use server";

import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";
import { sendEmail } from "@/lib/email/resend";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { getBankOptions } from "@/lib/services/bank-list.service";
import { provisionAnchorCustomer } from "@/lib/services/anchor-provisioning.service";
import { joinOrCreateOrganization, requestOrganizationMembership } from "@/lib/services/organization.service";
import { setFacilitatorSkills } from "@/lib/services/skill.service";
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

  const raw = { ...Object.fromEntries(formData), skillIds: formData.getAll("skillIds") };
  const parsed = signupSchema.safeParse(raw);
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
      profileDescription: data.profileDescription || null,
      profileImageUrl: data.profileImageUrl || null,
      slug,
    },
  });

  if (data.role === "EVENT_MANAGER" && data.organization) {
    await joinOrCreateOrganization(user.id, data.organization);
    revalidatePath("/signup");
  } else if (data.role === "PROFESSIONAL" && data.affiliationType === "organization" && data.organizationId) {
    await requestOrganizationMembership(user.id, data.organizationId);
  }

  if (data.role === "FACILITATOR" && data.skillIds && data.skillIds.length > 0) {
    await setFacilitatorSkills(user.id, data.skillIds);
  }

  // Never let account creation fail because Anchor is slow/unreachable — provisioning
  // records its own failure state on the user row and can be retried later.
  await provisionAnchorCustomer(user.id);

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/dashboard",
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

  const callbackUrl = formData.get("callbackUrl");
  const redirectTo = typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/dashboard";

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
  await signOut({ redirectTo: "/" });
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
