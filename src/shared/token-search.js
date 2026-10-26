/** Filter token metadata only; never inspect or decrypt token values. */
export function filterTokensByQuery(tokens, query) {
  if (!Array.isArray(tokens)) return [];
  const normalizedQuery = typeof query === 'string' ? query.trim().toLocaleLowerCase() : '';
  if (!normalizedQuery) return tokens;
  return tokens.filter((token) =>
    `${typeof token?.name === 'string' ? token.name : ''} ${typeof token?.service === 'string' ? token.service : ''}`
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  );
}
