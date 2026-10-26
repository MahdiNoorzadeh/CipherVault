import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcut,
  shortcutFromKeyboardEvent,
  validateShortcuts
} from '../src/shared/keyboard-shortcuts.js';

test('default shortcuts are valid and unique', () => {
  assert.deepEqual(validateShortcuts(DEFAULT_SHORTCUTS), DEFAULT_SHORTCUTS);
});

test('shortcut normalization is case-insensitive and canonicalizes modifiers', () => {
  assert.equal(normalizeShortcut('control+k'), 'Ctrl+K');
  assert.equal(normalizeShortcut('cmd+shift+s'), 'Shift+Meta+S');
  assert.equal(normalizeShortcut('CTRL+,'), 'Ctrl+,');
});

test('invalid shortcuts without a modifier or supported key are rejected', () => {
  for (const shortcut of ['K', 'Ctrl', 'Ctrl+Ctrl+K', 'Ctrl+NotAKey', '', null]) {
    assert.equal(normalizeShortcut(shortcut), null);
  }
});

test('duplicate shortcuts are rejected after normalization', () => {
  assert.throws(() => validateShortcuts({ search: 'Ctrl+K', settings: 'control+k' }), {
    name: 'TypeError', message: 'Invalid keyboard shortcuts'
  });
});

test('unknown or missing shortcut actions are rejected', () => {
  assert.throws(() => validateShortcuts({ search: 'Ctrl+K' }), TypeError);
  assert.throws(() => validateShortcuts({ search: 'Ctrl+K', settings: 'Ctrl+,', delete: 'Ctrl+D' }), TypeError);
});

test('keyboard events normalize modifier order and ignore bare keys', () => {
  assert.equal(shortcutFromKeyboardEvent({ key: 'k', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false }), 'Ctrl+K');
  assert.equal(shortcutFromKeyboardEvent({ key: 'Control', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false }), null);
  assert.equal(shortcutFromKeyboardEvent({ key: 'k', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }), null);
});
