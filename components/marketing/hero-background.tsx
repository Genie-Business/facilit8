export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#F7FAFB]">
      <div
        className="hero-blob-1 absolute -top-24 -left-24 size-[520px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-light) 0%, transparent 70%)" }}
      />
      <div
        className="hero-blob-2 absolute top-1/3 -right-32 size-[560px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
