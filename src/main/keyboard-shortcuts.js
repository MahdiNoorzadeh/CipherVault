export const DEFAULT_SHORTCUTS = Object.freeze({
  search: 'Ctrl+K',
  settings: 'Ctrl+,'
});

const ACTIONS = Object.freeze(['search', 'settings']);
const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];
const MODIFIER_ALIASES = new Map([
  ['ctrl', 'Ctrl'], ['control', 'Ctrl'],
  ['alt', 'Alt'], ['option', 'Alt'],
  ['shift', 'Shift'],
  ['meta', 'Meta'], ['cmd', 'Meta'], ['command', 'Meta'], ['super', 'Meta']
]);
const KEY_ALIASES = new Map([
  [' ', 'Space'], ['spacebar', 'Space'], ['esc', 'Escape'], ['del', 'Delete'],
  ['arrowup', 'ArrowUp'], ['arrowdown', 'ArrowDown'],
  ['arrowleft', 'ArrowLeft'], ['arrowright', 'ArrowRight']
]);

function normalizeKey(rawKey) {
  const key = String(rawKey ?? '').trim();
  if (!key) return null;
  const alias = KEY_ALIASES.get(key.toLowerCase());
  if (alias) return alias;
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  if (/^\d$/.test(key) || /^F(?:[1-9]|1[0-2])$/i.test(key)) return key.toUpperCase();
  if (/^(,|\.|\/|;|'|\[|\]|-|=|`|\\)$/.test(key)) return key;
  if (/^(Enter|Escape|Tab|Space|Backspace|Delete|Home|End|PageUp|PageDown|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/i.test(key)) {
    return key[0].toUpperCase() + key.slice(1);
  }
  return null;
}

export function normalizeShortcut(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  const parts = value.split('+').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const modifiers = new Set();
  let key = null;
  for (const part of parts) {
    const modifier = MODIFIER_ALIASES.get(part.toLowerCase());
    if (modifier) {
      if (modifiers.has(modifier)) return null;
      modifiers.add(modifier);
      continue;
    }
    if (key !== null) return null;
    key = normalizeKey(part);
    if (!key) return null;
  }
  if (key === null || modifiers.size === 0) return null;
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join('+');
}

export function shortcutFromKeyboardEvent(event) {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');
  const key = normalizeKey(event.key);
  if (!key || MODIFIER_ALIASES.has(String(event.key).toLowerCase()) || modifiers.length === 0) return null;
  return normalizeShortcut([...modifiers, key].join('+'));
}

export function validateShortcuts(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid keyboard shortcuts');
  }
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== [...ACTIONS].sort().join(',')) {
    throw new TypeError('Invalid keyboard shortcuts');
  }

  const normalized = {};
  const used = new Set();
  for (const action of ACTIONS) {
    const shortcut = normalizeShortcut(value[action]);
    if (!shortcut || used.has(shortcut)) throw new TypeError('Invalid keyboard shortcuts');
    normalized[action] = shortcut;
    used.add(shortcut);
  }
  return normalized;
}
