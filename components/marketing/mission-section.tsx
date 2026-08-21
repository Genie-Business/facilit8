export function MissionSection({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground">{eyebrow}</span>
        <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">{body}</p>
      </div>
    </section>
  );
}
