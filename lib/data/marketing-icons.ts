import {
  Users,
  ShieldCheck,
  Handshake,
  Building2,
  GraduationCap,
  TrendingUp,
  Gavel,
  Wallet,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** Icon names an admin can pick for card-style marketing content — the set already used
 * across the landing pages today. Falls back to Sparkles for any unrecognized/legacy name. */
export const MARKETING_ICONS: Record<string, LucideIcon> = {
  Users,
  ShieldCheck,
  Handshake,
  Building2,
  GraduationCap,
  TrendingUp,
  Gavel,
  Wallet,
  MessageCircle,
  Sparkles,
};

export const MARKETING_ICON_NAMES = Object.keys(MARKETING_ICONS) as (keyof typeof MARKETING_ICONS)[];

export function getMarketingIcon(name: string): LucideIcon {
  return MARKETING_ICONS[name] ?? Sparkles;
}
