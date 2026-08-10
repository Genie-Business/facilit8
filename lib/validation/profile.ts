import { z } from "zod";

// Everything here is display/marketplace metadata — deliberately excludes fields Anchor
// relies on for KYC/KYB identity matching (bvn, dateOfBirth, gender, phone, legal name)
// so editing a profile can never desync a user's record from their verified Anchor identity.
export const profileUpdateSchema = z.object({
  profileImageUrl: z.string().trim().optional().or(z.literal("")),
  profileDescription: z.string().trim().max(1000, "Keep it under 1000 characters.").optional().or(z.literal("")),
  organization: z.string().trim().max(200).optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  localGovt: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().max(500, "Keep it under 500 characters.").optional().or(z.literal("")),
  specialization: z.string().trim().max(200).optional().or(z.literal("")),
  qualification: z.string().trim().max(200).optional().or(z.literal("")),
  experience: z.string().trim().max(200).optional().or(z.literal("")),
  travel: z.coerce.boolean().optional(),
  cvUrl: z.string().trim().optional().or(z.literal("")),
  certificateUrl: z.string().trim().optional().or(z.literal("")),
  skillIds: z.array(z.string()).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
