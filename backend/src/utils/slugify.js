/** "Home & Kitchen" -> "home-and-kitchen", "Levi's 511" -> "levis-511" */
export function slugify(text, maxLength = 160) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Returns `base`, or `base-2`, `base-3`... until no document of `Model` uses that slug. */
export async function generateUniqueSlug(Model, base) {
  const root = base || 'item';
  let candidate = root;

  for (let n = 2; n <= 50; n += 1) {
    if (!(await Model.exists({ slug: candidate }))) return candidate;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}
