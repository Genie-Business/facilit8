function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Builds a unique slug by appending a short random suffix on collision, checked via
 * `exists`. Used for every slugged model (User, TrainingEvent, Application, ...).
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let attempt = 0;

  while (await exists(candidate)) {
    attempt += 1;
    const suffix = Math.random().toString(36).slice(2, 7);
    candidate = `${root}-${suffix}`;
    if (attempt > 10) {
      candidate = `${root}-${Date.now().toString(36)}`;
      break;
    }
  }

  return candidate;
}
