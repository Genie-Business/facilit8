"use server";

import { auth, signOut } from "@/lib/auth";
import { siteUrl } from "@/lib/site";
import { deactivateOwnAccount } from "@/lib/services/account.service";
import { deactivateAccountSchema } from "@/lib/validation/account";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function deactivateAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const parsed = deactivateAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await deactivateOwnAccount(session.user.id, parsed.data.password);
  if (!result.success) return { error: result.error };

  await signOut({ redirectTo: siteUrl });
  return {};
}
