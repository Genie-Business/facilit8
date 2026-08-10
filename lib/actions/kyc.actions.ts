"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { submitKyc } from "@/lib/services/kyc.service";
import { provisionAnchorCustomer } from "@/lib/services/anchor-provisioning.service";
import { kycFormSchema } from "@/lib/validation/kyc";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function submitKycAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const raw = Object.fromEntries(formData);
  const parsed = kycFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await submitKyc(session.user.id, {
    bvn: parsed.data.bvn,
    dateOfBirth: new Date(parsed.data.dateOfBirth),
    gender: parsed.data.gender,
  });

  if (!result.success) return { error: result.error };

  revalidatePath("/settings/kyc");
  return { success: "KYC submitted. We'll notify you once it's verified." };
}

export async function retryProvisioningAction(): Promise<void> {
  const session = await auth();
  if (!session) return;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return;
  // provisionAnchorCustomer no-ops per-step internally once each piece is set, so it's
  // safe to call whenever provisioning isn't fully complete (customer + counterparty).
  if (user.anchorCustomerId && (user.anchorCounterpartyId || !user.linkedBankCode)) return;

  await provisionAnchorCustomer(session.user.id);
  revalidatePath("/settings/kyc");
  revalidatePath("/wallet");
}
