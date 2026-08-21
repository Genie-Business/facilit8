"use server";

import { revalidatePath } from "next/cache";

import { auth, signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import {
  sendOrgInvite,
  getOrgInviteByToken,
  redeemOrgInviteForExistingUser,
  redeemOrgInviteForNewAccount,
} from "@/lib/services/organization-invite.service";
import { sendOrgInviteSchema, redeemOrgInviteNewAccountSchema } from "@/lib/validation/organization";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { appUrl } from "@/lib/site";

export async function sendOrgInviteAction(
  organizationId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const parsed = sendOrgInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  const result = await sendOrgInvite(organizationId, session.user.id, parsed.data.email, parsed.data.role);
  if (!result.success) return { error: result.error };

  revalidatePath("/organization/members");
  return { success: `Invite sent to ${parsed.data.email}.` };
}

/** For someone already logged in when they open the invite link. Reads the token from a
 * hidden form field (not a bound arg) so it works with useActionState like every other
 * token-redemption flow in this codebase (see redeemAccountRecoveryAction). */
export async function acceptOrgInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) return { error: "Invalid or missing invite link." };

  const session = await auth();
  if (!session) return { error: "Please log in first." };

  const result = await redeemOrgInviteForExistingUser(token, session.user.id);
  if (!result.success) return { error: result.error };

  revalidatePath("/organization/members");
  return { success: "You've joined the organization." };
}

/** For someone who doesn't have an account yet — creates one, then signs them in. */
export async function redeemOrgInviteNewAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) return { error: "Invalid or missing invite link." };

  const invite = await getOrgInviteByToken(token);
  if (!invite) return { error: "This invite link is invalid or has expired." };

  const parsed = redeemOrgInviteNewAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  const result = await redeemOrgInviteForNewAccount(token, parsed.data);
  if (!result.success) return { error: result.error };

  try {
    await signIn("credentials", {
      email: invite.email,
      password: parsed.data.password,
      redirectTo: `${appUrl}/dashboard`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: "Account created. Please log in." };
    }
    throw err; // NEXT_REDIRECT is thrown as a "digest" error and must propagate
  }

  return {};
}

/** Lightweight lookup for the redemption page to decide which of the two forms to show. */
export async function checkInviteEmailHasAccount(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return !!user;
}
