import sanitizeHtml from "sanitize-html";

import { prisma } from "@/lib/db";

export async function getLegalPage(slug: "privacy" | "terms") {
  return prisma.legalPage.findUnique({ where: { slug } });
}

// Rendered via dangerouslySetInnerHTML on the public /privacy and /terms pages, so this is
// the boundary that keeps a compromised or malicious admin account from injecting stored XSS
// into pages every visitor loads — allowlist only what a legal document actually needs.
const LEGAL_PAGE_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote",
    "a", "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export async function upsertLegalPage(slug: string, title: string, contentHtml: string) {
  const sanitized = sanitizeHtml(contentHtml.trim(), LEGAL_PAGE_SANITIZE_OPTIONS);
  return prisma.legalPage.upsert({
    where: { slug },
    create: { slug, title: title.trim(), contentHtml: sanitized },
    update: { title: title.trim(), contentHtml: sanitized },
  });
}
