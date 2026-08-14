import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Urbanist } from "next/font/google";
import "./globals.css";

import { siteName, siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Only used by the public marketing site (app/(public)/layout.tsx scopes these via CSS
// variables), but loaded here rather than in that nested layout — Turbopack's dev server
// fails to resolve a second independent next/font/google call site, so this keeps Next's
// font loading to the one place (root layout) that reliably works in both dev and build.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName}: The Professional Development Ecosystem`,
    template: `%s | ${siteName}`,
  },
  description:
    "Facilit8 is Nigeria's professional development ecosystem, where Event Managers staff vetted training, Facilitators get discovered and paid, and every professional grows with Awé, an AI partner grounded in real platform data.",
  openGraph: {
    siteName,
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${urbanist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
