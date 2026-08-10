import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about the platform, partnerships, or anything else — reach the Facilit8 team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Contact"
        title="Talk to us"
        description="Questions about the platform, partnerships, or anything else — we'd like to hear from you."
      />

      <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">partners@usefacilit8.training</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold text-foreground">Phone</p>
              <p className="text-sm text-muted-foreground">Available on request</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 text-brand" />
            <div>
              <p className="text-sm font-semibold text-foreground">Based in</p>
              <p className="text-sm text-muted-foreground">Nigeria</p>
            </div>
          </div>
        </div>

        <ContactForm />
      </section>
    </>
  );
}
