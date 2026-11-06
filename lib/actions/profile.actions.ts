"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setFacilitatorSkills } from "@/lib/services/skill.service";
import { prepareProfileIdentityChange, type IdentityFields } from "@/lib/services/profile-identity.service";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validation/profile";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const raw = {
    ...Object.fromEntries(formData),
    travel: formData.get("travel") === "on",
    skillIds: formData.getAll("skillIds"),
  };
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;

  // Before anything is saved: a real name/phone change may need to go to Anchor first, and a
  // refusal there should block the whole save, not leave profile and Anchor disagreeing.
  // formData.has() distinguishes "field not on this form" from "cleared".
  const field = (name: "firstName" | "lastName" | "mobilePhone") => (formData.has(name) ? data[name] ?? "" : undefined);
  const identity = await prepareProfileIdentityChange(session.user.id, {
    firstName: field("firstName"),
    lastName: field("lastName"),
    mobilePhone: field("mobilePhone"),
  });
  if (!identity.ok) return { error: identity.error, fieldErrors: identity.fieldErrors };

  try {
    await saveProfile(session.user.id, data, identity.changes);
  } catch (err) {
    // Lost a race for the number between the uniqueness check and the write.
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return { fieldErrors: { mobilePhone: "An account with this phone number already exists." } };
    }
    throw err;
  }

  if (session.user.role === "FACILITATOR" && data.skillIds) {
    await setFacilitatorSkills(session.user.id, data.skillIds);
  }

  revalidatePath("/profile");
  redirect("/profile");
}

async function saveProfile(userId: string, data: ProfileUpdateInput, identity: IdentityFields) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...identity,
      profileImageUrl: data.profileImageUrl || null,
      profileDescription: data.profileDescription || null,
      organization: data.organization || null,
      state: data.state || null,
      localGovt: data.localGovt || null,
      address: data.address || null,
      specialization: data.specialization || null,
      qualification: data.qualification || null,
      experience: data.experience || null,
      travel: !!data.travel,
      cvUrl: data.cvUrl || null,
      certificateUrl: data.certificateUrl || null,
    },
  });
}
