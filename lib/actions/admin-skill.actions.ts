"use server";

import { revalidatePath } from "next/cache";

import { createSkill, deleteSkill, setSkillActive } from "@/lib/services/skill.service";
import { ActionState } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function createSkillAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Enter a skill name." };
  }

  await createSkill(name);
  revalidatePath("/admin/skills");
  revalidatePath("/signup");
  return { success: "Skill added." };
}

export async function toggleSkillActiveAction(id: string, isActive: boolean): Promise<void> {
  await requireAdmin();
  await setSkillActive(id, isActive);
  revalidatePath("/admin/skills");
  revalidatePath("/signup");
}

export async function deleteSkillAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteSkill(id);
  revalidatePath("/admin/skills");
  revalidatePath("/signup");
}
