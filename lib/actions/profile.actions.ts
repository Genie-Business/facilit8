"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setFacilitatorSkills } from "@/lib/services/skill.service";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { profileUpdateSchema } from "@/lib/validation/profile";

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

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
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

  if (session.user.role === "FACILITATOR" && data.skillIds) {
    await setFacilitatorSkills(session.user.id, data.skillIds);
  }

  revalidatePath("/profile");
  redirect("/profile");
}
