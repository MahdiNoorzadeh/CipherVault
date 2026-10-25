const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
export const MAX_BATCH_DELETE_SIZE = 100;

/** Validate and canonicalize a batch of Realm ObjectId strings before any mutation. */
export function validateBatchDeleteIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BATCH_DELETE_SIZE) {
    throw new TypeError(`Invalid token IDs: expected between 1 and ${MAX_BATCH_DELETE_SIZE} IDs`);
  }

  const normalized = ids.map((id) => {
    if (typeof id !== 'string' || !OBJECT_ID_PATTERN.test(id)) {
      throw new TypeError('Invalid token IDs');
    }
    return id.toLowerCase();
  });

  if (new Set(normalized).size !== normalized.length) {
    throw new TypeError('Invalid token IDs: duplicates are not allowed');
  }

  return normalized;
}
