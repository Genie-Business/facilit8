import { prisma } from "@/lib/db";
import { MARKETING_PAGE_SCHEMAS, type MarketingPage } from "@/lib/validation/content";
import {
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_CAREERS_CONTENT,
  DEFAULT_HOME_CONTENT,
  DEFAULT_SERVICES_CONTENT,
} from "@/lib/data/marketing-defaults";

const DEFAULTS = {
  home: DEFAULT_HOME_CONTENT,
  about: DEFAULT_ABOUT_CONTENT,
  services: DEFAULT_SERVICES_CONTENT,
  careers: DEFAULT_CAREERS_CONTENT,
} as const;

/**
 * Falls back to the hardcoded defaults (matching what was in the JSX before this page
 * became editable) when no row exists yet, or when a stored row somehow fails the current
 * schema (e.g. an old shape after a field was renamed) — public pages should never render
 * blank/broken because of a CMS edit gone wrong.
 */
export async function getMarketingPageContent<P extends MarketingPage>(page: P) {
  const row = await prisma.marketingPageContent.findUnique({ where: { page } });
  if (!row) return DEFAULTS[page];

  const parsed = MARKETING_PAGE_SCHEMAS[page].safeParse(row.blocks);
  return parsed.success ? (parsed.data as (typeof DEFAULTS)[P]) : DEFAULTS[page];
}

export async function updateMarketingPageContent(page: MarketingPage, blocks: unknown): Promise<void> {
  await prisma.marketingPageContent.upsert({
    where: { page },
    create: { page, blocks: blocks as object },
    update: { blocks: blocks as object },
  });
}
