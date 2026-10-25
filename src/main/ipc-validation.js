export function requireNonEmptyString(value, fieldName, maxLength = 200) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw new TypeError(`Invalid ${fieldName}`);
  }

  return value.trim();
}

export function requireObjectIdString(id, fieldName = 'id') {
  if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new TypeError(`Invalid ${fieldName}`);
  }

  return id;
}

export function requireEnvironmentType(value) {
  if (value !== 'Production' && value !== 'Development') {
    throw new TypeError('Invalid environment type');
  }

  return value;
}
