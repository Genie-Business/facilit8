import { getMarketingIcon } from "@/lib/data/marketing-icons";
import type { HomeContent } from "@/lib/validation/content";

export function ThreeAudiences({
  eyebrow,
  title,
  audiences,
}: {
  eyebrow: string;
  title: string;
  audiences: HomeContent["audiences"];
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mb-12 max-w-2xl">
        <span className="rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground">{eyebrow}</span>
        <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {audiences.map((audience) => {
          const Icon = getMarketingIcon(audience.icon);
          return (
            <div key={audience.eyebrow} className="rounded-2xl border p-6">
              <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
                <Icon className="size-5 text-brand-dark" />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-brand-dark uppercase">{audience.eyebrow}</p>
              <p className="mt-2 font-semibold text-foreground">{audience.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{audience.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
