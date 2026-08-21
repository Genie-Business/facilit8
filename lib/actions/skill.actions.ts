"use server";

import { auth } from "@/lib/auth";
import { findOrCreateSkill } from "@/lib/services/skill.service";

interface FindOrCreateSkillResult {
  success: boolean;
  skill?: { id: string; name: string };
  error?: string;
}

/** Any authenticated user can add a skill via the signup/onboarding autocomplete — unlike
 * admin-skill.actions.ts, this is deliberately not admin-gated. */
export async function findOrCreateSkillAction(name: string): Promise<FindOrCreateSkillResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Not authenticated." };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Enter a skill name." };
  if (trimmed.length > 60) return { success: false, error: "Skill name is too long." };

  const skill = await findOrCreateSkill(trimmed);
  return { success: true, skill: { id: skill.id, name: skill.name } };
}
