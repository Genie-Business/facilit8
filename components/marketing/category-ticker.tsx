const CATEGORIES = [
  "Leadership",
  "Sales",
  "Customer Service",
  "Compliance",
  "Emotional Intelligence",
  "Project Management",
  "Communication",
  "Technical Skills",
];

export function CategoryTicker() {
  const items = [...CATEGORIES, ...CATEGORIES];

  return (
    <section className="border-y bg-white py-10">
      <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
        Training categories facilitators bid on every day
      </p>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {items.map((category, i) => (
            <span
              key={`${category}-${i}`}
              className="shrink-0 rounded-full border bg-white px-5 py-2 text-sm font-medium text-foreground"
            >
              {category}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
