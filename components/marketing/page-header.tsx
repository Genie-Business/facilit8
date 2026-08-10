export function MarketingPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="border-b bg-[#F7FAFB] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1200px]">
        <span className="rounded-full border bg-white px-4 py-1.5 text-sm font-medium text-muted-foreground">
          {eyebrow}
        </span>
        <h1 className="mt-5 max-w-2xl text-4xl leading-tight font-medium tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">{description}</p>}
      </div>
    </div>
  );
}
