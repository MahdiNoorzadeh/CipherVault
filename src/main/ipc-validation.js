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

export function requireTokenData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid token data');
  }

  const allowedFields = ['name', 'service', 'value'];

  if (
    Object.keys(value).length !== allowedFields.length ||
    Object.keys(value).some((key) => !allowedFields.includes(key))
  ) {
    throw new TypeError('Invalid token data');
  }

  return {
    name: requireNonEmptyString(value.name, 'token name'),
    service: requireNonEmptyString(value.service, 'service name'),
    value: requireNonEmptyString(value.value, 'token value', 10000)
  };
}
