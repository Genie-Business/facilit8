import { getMarketingIcon } from "@/lib/data/marketing-icons";
import type { HomeContent } from "@/lib/validation/content";

export function ServicesGrid({
  eyebrow,
  title,
  services,
}: {
  eyebrow: string;
  title: string;
  services: HomeContent["services"];
}) {
  return (
    <section className="bg-[#F5F5F5] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <span className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-muted-foreground">
            {eyebrow}
          </span>
          <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = getMarketingIcon(service.icon);
            return (
              <div key={service.title} className="rounded-2xl bg-white p-6">
                <Icon className="size-6 text-brand" strokeWidth={1.5} />
                <p className="mt-4 font-semibold text-foreground">{service.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
