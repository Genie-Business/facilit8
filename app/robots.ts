import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { siteUrl, appUrl } from "@/lib/site";

// Same deployment serves both hosts, so this must differ by host: the app subdomain is
// 100% authenticated product — nothing there is worth indexing.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const hostname = (await headers()).get("host")?.split(":")[0] ?? "";

  if (hostname === new URL(appUrl).hostname) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/reset-password/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
