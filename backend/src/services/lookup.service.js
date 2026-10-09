import { ApiError } from '../utils/ApiError.js';
import { isObjectId } from '../utils/objectId.js';

export const splitList = (input) => [
  ...new Set(
    String(input)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ),
];

/**
 * Resolves a comma-separated list of ids and/or slugs to documents.
 * Throws a 404 naming every value that does not exist.
 */
export async function resolveByIdOrSlug(Model, input, label) {
  const values = splitList(input);
  const ids = values.filter(isObjectId);
  const slugs = values.filter((value) => !isObjectId(value)).map((value) => value.toLowerCase());

  const docs = await Model.find({
    $or: [{ _id: { $in: ids } }, { slug: { $in: slugs } }],
  }).select('_id slug');

  const known = new Set(docs.flatMap((doc) => [String(doc._id), doc.slug]));
  const missing = values.filter((value) => !known.has(value.toLowerCase()));

  if (missing.length > 0) {
    throw ApiError.notFound(`${label} not found: ${missing.join(', ')}`);
  }

  return docs;
}

/** Builds the filter that finds one document by id or slug. */
export const idOrSlugFilter = (identifier) =>
  isObjectId(identifier) ? { _id: identifier } : { slug: String(identifier).toLowerCase() };
