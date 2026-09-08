const MAX_SLUG_LENGTH = 60;

/**
 * Normalize a cause title into a URL-safe slug base (no uniqueness suffix).
 */
export function slugifyCauseTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  return base || "cause";
}

/**
 * Build a unique slug for a cause title.
 * Tries base, then base-2, base-3, … then base-<shortId>.
 */
export async function allocateUniqueCauseSlug(
  title: string,
  options: {
    excludeCauseId?: string;
    isTaken: (slug: string) => Promise<boolean>;
    shortId?: string;
  },
): Promise<string> {
  const base = slugifyCauseTitle(title);
  let candidate = base;
  let suffix = 2;

  while (await options.isTaken(candidate)) {
    if (suffix > 50) {
      const idPart = (options.shortId || crypto.randomUUID())
        .replace(/-/g, "")
        .slice(0, 8);
      candidate = `${base.slice(0, Math.max(1, MAX_SLUG_LENGTH - 9))}-${idPart}`;
      if (!(await options.isTaken(candidate))) {
        return candidate;
      }
      candidate = `cause-${idPart}`;
      return candidate;
    }

    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, MAX_SLUG_LENGTH - suffixText.length))}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

/** Public path segment for a cause: prefer slug, fall back to id. */
export function causePublicPath(cause: {
  id: string;
  slug?: string | null;
}): string {
  return `/causes/${cause.slug || cause.id}`;
}

/**
 * True when the current slug still matches the previous title's slugify
 * (with optional numeric suffix), so a title rename can refresh the slug.
 */
export function shouldRefreshCauseSlug(
  currentSlug: string | null | undefined,
  previousTitle: string,
): boolean {
  if (!currentSlug) return true;
  const base = slugifyCauseTitle(previousTitle);
  if (currentSlug === base) return true;
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}-\\d+$`).test(currentSlug);
}
