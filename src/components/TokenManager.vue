<template>
  <div class="token-manager pa-4">
    <div class="d-flex align-center justify-space-between mb-4">
      <h3 class="text-h6">{{ environmentType }} Environment</h3>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        Add Token
      </v-btn>
    </div>

    <v-text-field
      ref="searchField"
      v-model="searchQuery"
      label="Search tokens by name or service"
      placeholder="e.g. GitHub, AWS"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      class="mb-4"
      :disabled="tokens.length === 0"
      aria-label="Search tokens by name or service"
    ></v-text-field>

    <v-toolbar
      v-if="selectedTokenIds.length > 0"
      density="comfortable"
      color="surface-variant"
      class="mb-4 rounded"
    >
      <v-toolbar-title class="text-body-2">
        {{ selectedTokenIds.length }} token(s) selected
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        color="error"
        prepend-icon="mdi-delete"
        variant="tonal"
        @click="showBatchDeleteDialog = true"
      >
        Delete selected
      </v-btn>
      <v-btn icon="mdi-close" variant="text" aria-label="Clear selection" @click="clearSelection"></v-btn>
    </v-toolbar>

    <v-alert
      v-if="tokens.length === 0"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      No tokens in this environment. Click "Add Token" to create one.
    </v-alert>

    <v-alert
      v-else-if="filteredTokens.length === 0"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      No tokens match “{{ searchQuery }}”. Try a different name or service.
    </v-alert>

    <v-table v-else>
      <thead>
        <tr>
          <th class="selection-column">
            <v-checkbox
              :model-value="allFilteredSelected"
              :indeterminate="someFilteredSelected"
              density="compact"
              hide-details
              aria-label="Select all filtered tokens"
              @update:model-value="toggleFilteredSelection"
            ></v-checkbox>
          </th>
          <th>Name</th>
          <th>Service</th>
          <th>Token</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="token in filteredTokens"
          :key="token._id"
          tabindex="0"
          :aria-label="`Token ${token.name}`"
          @contextmenu.prevent="openTokenContextMenu($event, token)"
          @keydown="handleTokenRowKeydown($event, token)"
        >
          <td class="selection-column">
            <v-checkbox
              :model-value="selectedTokenIds.includes(token._id)"
              density="compact"
              hide-details
              :aria-label="`Select token ${token.name}`"
              @update:model-value="toggleTokenSelection(token._id)"
            ></v-checkbox>
          </td>
          <td>{{ token.name }}</td>
          <td>
            <div class="cv-service-cell">
              <span class="cv-service-icon">
                <img
                  v-if="getIconForToken(token)"
                  :src="getIconForToken(token)"
                  :alt="`${token.service} icon`"
                  loading="lazy"
                  decoding="async"
                  @error="handleIconError($event, token)"
                />
                <v-icon v-else icon="mdi-puzzle-outline" size="20"></v-icon>
              </span>
              <v-chip size="small" color="primary" variant="tonal">
                {{ token.service }}
              </v-chip>
            </div>
          </td>
          <td>
            <div class="d-flex align-center">
              <span v-if="!token.showValue" class="text-medium-emphasis">
                •••••••••••••••••
              </span>
              <span v-else class="token-value">{{ token.value }}</span>
              <v-btn
                :icon="token.showValue ? 'mdi-eye-off' : 'mdi-eye'"
                :aria-label="`${token.showValue ? 'Hide' : 'Reveal'} token ${token.name}`"
                :title="`${token.showValue ? 'Hide' : 'Reveal'} token`"
                size="x-small"
                variant="text"
                class="ml-2"
                @click="toggleTokenVisibility(token)"
              ></v-btn>
              <v-btn
                icon="mdi-content-copy"
                :aria-label="`Copy token ${token.name}`"
                title="Copy token"
                size="x-small"
                variant="text"
                class="ml-1"
                @click="copyToken(token)"
              ></v-btn>
            </div>
          </td>
          <td>
            <v-btn
              icon="mdi-pencil"
              :aria-label="`Edit token ${token.name}`"
              title="Edit token"
              size="x-small"
              variant="text"
              @click="editToken(token)"
            ></v-btn>
            <v-btn
              icon="mdi-delete"
              :aria-label="`Delete token ${token.name}`"
              title="Delete token"
              size="x-small"
              variant="text"
              color="error"
              @click="confirmDelete(token)"
            ></v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Accessible token context menu; actions reuse existing secure handlers. -->
    <v-card
      v-if="contextMenuOpen && contextMenuToken"
      ref="contextMenuElement"
      class="token-context-menu"
      :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
      role="menu"
      :aria-label="`Actions for ${contextMenuToken.name}`"
      @keydown="handleContextMenuKeydown"
      @click.stop
    >
      <v-list density="compact" role="none" nav>
        <v-list-item
          role="menuitem"
          tabindex="0"
          :prepend-icon="contextMenuToken.showValue ? 'mdi-eye-off' : 'mdi-eye'"
          @click="runContextMenuAction((token) => toggleTokenVisibility(token))"
        >
          {{ contextMenuToken.showValue ? 'Hide token' : 'Reveal token' }}
        </v-list-item>
        <v-list-item
          role="menuitem"
          tabindex="0"
          prepend-icon="mdi-content-copy"
          @click="runContextMenuAction((token) => copyToken(token))"
        >
          Copy token
        </v-list-item>
        <v-list-item
          role="menuitem"
          tabindex="0"
          prepend-icon="mdi-pencil"
          @click="runContextMenuAction((token) => editToken(token))"
        >
          Edit token
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item
          role="menuitem"
          tabindex="0"
          prepend-icon="mdi-delete"
          class="text-error"
          @click="runContextMenuAction((token) => confirmDelete(token))"
        >
          Delete token
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Create/Edit Token Dialog -->
    <v-dialog v-model="showTokenDialog" max-width="600">
      <v-card>
        <v-card-title>
          {{ editingToken ? 'Edit Token' : 'Create New Token' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="tokenForm.name"
            label="Token Name"
            variant="outlined"
            class="mb-3"
            required
          ></v-text-field>
          <v-text-field
            v-model="tokenForm.service"
            label="Service (e.g., GitHub, AWS, Slack)"
            variant="outlined"
            class="mb-2"
            required
            hint="A matching service icon is detected automatically."
            persistent-hint
          ></v-text-field>

          <div class="cv-icon-customizer mb-4">
            <div class="cv-icon-preview">
              <img
                v-if="previewIconUrl"
                :src="previewIconUrl"
                alt="Service icon preview"
                @error="handlePreviewIconError"
              />
              <v-icon v-else icon="mdi-puzzle-outline" size="24"></v-icon>
            </div>
            <div class="cv-icon-fields">
              <v-text-field
                v-model="tokenForm.iconUrl"
                label="Custom icon URL (optional)"
                placeholder="https://example.com/icon.png"
                density="compact"
                hide-details
                clearable
                @update:model-value="resetPreviewIconError"
              ></v-text-field>
              <v-file-input
                label="Or upload an icon"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                density="compact"
                variant="outlined"
                prepend-icon="mdi-image-plus-outline"
                hide-details
                clearable
                @update:model-value="handleIconFile"
              ></v-file-input>
            </div>
          </div>

          <v-textarea
            v-model="tokenForm.value"
            label="Token Value"
            variant="outlined"
            rows="3"
            required
            :class="{ 'token-value-hidden': !showTokenValue }"
          >
            <template v-slot:append-inner>
              <v-btn
                :icon="showTokenValue ? 'mdi-eye-off' : 'mdi-eye'"
                size="small"
                variant="text"
                @click="showTokenValue = !showTokenValue"
              ></v-btn>
            </template>
          </v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeTokenDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveToken" :disabled="!isTokenFormValid">
            {{ editingToken ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">Delete Token</v-card-title>
        <v-card-text>
          Are you sure you want to delete the token "{{ deletingToken?.name }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteToken">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Batch Delete Confirmation Dialog -->
    <v-dialog v-model="showBatchDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">Delete selected tokens</v-card-title>
        <v-card-text>
          Are you sure you want to permanently delete {{ selectedTokenIds.length }} selected token(s)? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showBatchDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="batchDeleteInProgress" :disabled="batchDeleteInProgress || selectedTokenIds.length === 0" @click="deleteSelectedTokens">
            Delete {{ selectedTokenIds.length }} token(s)
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { filterTokensByQuery } from '../main/token-search.js';
import { getServiceIconUrl, normalizeServiceKey } from '../main/service-icons.js';

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  environmentType: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['tokens-updated']);

const tokens = ref([]);
const searchQuery = ref('');
const searchField = ref(null);
const iconOverrides = ref({});
const failedIconUrls = ref([]);
const previewIconFailed = ref(false);
const MAX_CUSTOM_ICON_BYTES = 512 * 1024;
const selectedTokenIds = ref([]);
const showBatchDeleteDialog = ref(false);
const batchDeleteInProgress = ref(false);
const contextMenuOpen = ref(false);
const contextMenuToken = ref(null);
const contextMenuElement = ref(null);
const contextMenuRow = ref(null);
const contextMenuPosition = ref({ x: 0, y: 0 });
const CONTEXT_MENU_WIDTH = 220;
const CONTEXT_MENU_HEIGHT = 210;

const filteredTokens = computed(() => {
  return filterTokensByQuery(tokens.value, searchQuery.value);
});
const allFilteredSelected = computed(() => filteredTokens.value.length > 0 &&
  filteredTokens.value.every((token) => selectedTokenIds.value.includes(token._id)));
const someFilteredSelected = computed(() => !allFilteredSelected.value &&
  filteredTokens.value.some((token) => selectedTokenIds.value.includes(token._id)));

const toggleTokenSelection = (tokenId) => {
  selectedTokenIds.value = selectedTokenIds.value.includes(tokenId)
    ? selectedTokenIds.value.filter((id) => id !== tokenId)
    : [...selectedTokenIds.value, tokenId];
};
const toggleFilteredSelection = (selected) => {
  const visibleIds = new Set(filteredTokens.value.map((token) => token._id));
  selectedTokenIds.value = selected
    ? [...new Set([...selectedTokenIds.value, ...visibleIds])]
    : selectedTokenIds.value.filter((id) => !visibleIds.has(id));
};
const clearSelection = () => {
  selectedTokenIds.value = [];
};

const getContextMenuItems = () => {
  const root = contextMenuElement.value?.$el ?? contextMenuElement.value;
  return root?.querySelectorAll?.('[role=\"menuitem\"]') ?? [];
};

const openTokenContextMenu = async (event, token, keyboard = false) => {
  contextMenuToken.value = token;
  contextMenuRow.value = event.currentTarget;
  const rect = event.currentTarget.getBoundingClientRect();
  const requestedX = keyboard ? rect.left : event.clientX;
  const requestedY = keyboard ? rect.bottom : event.clientY;
  contextMenuPosition.value = {
    x: Math.max(8, Math.min(requestedX, window.innerWidth - CONTEXT_MENU_WIDTH - 8)),
    y: Math.max(8, Math.min(requestedY, window.innerHeight - CONTEXT_MENU_HEIGHT - 8))
  };
  contextMenuOpen.value = true;
  await nextTick();
  getContextMenuItems()[0]?.focus();
};

const closeTokenContextMenu = (restoreFocus = false) => {
  contextMenuOpen.value = false;
  contextMenuToken.value = null;
  if (restoreFocus) nextTick(() => contextMenuRow.value?.focus?.());
};

const runContextMenuAction = (action) => {
  const token = contextMenuToken.value;
  closeTokenContextMenu();
  if (token) action(token);
};

const handleTokenRowKeydown = (event, token) => {
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    event.preventDefault();
    openTokenContextMenu(event, token, true);
  }
};

const handleContextMenuKeydown = (event) => {
  const items = [...getContextMenuItems()];
  const currentIndex = items.indexOf(document.activeElement);
  if (event.key === 'Escape') {
    event.preventDefault();
    closeTokenContextMenu(true);
    return;
  }
  if (!items.length) return;
  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1 + items.length) % items.length;
  else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = items.length - 1;
  else return;
  event.preventDefault();
  items[nextIndex]?.focus();
};

const handleDocumentPointerDown = (event) => {
  if (!contextMenuOpen.value) return;
  const root = contextMenuElement.value?.$el ?? contextMenuElement.value;
  if (root && !root.contains(event.target)) closeTokenContextMenu();
};

const focusSearch = () => searchField.value?.focus?.();
const handleFocusSearchEvent = (event) => {
  if (event.detail === props.environmentType) focusSearch();
};
const environmentId = ref(null);
const showTokenDialog = ref(false);
const showDeleteDialog = ref(false);
const showTokenValue = ref(false);
const editingToken = ref(null);
const deletingToken = ref(null);
const snackbar = ref({ show: false, message: '', color: 'success' });

const tokenForm = ref({
  name: '',
  service: '',
  value: '',
  iconUrl: ''
});

const loadIconOverrides = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('ciphervault.serviceIconOverrides') || '{}');
    iconOverrides.value = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    iconOverrides.value = {};
  }
};

const getIconForToken = (token) => {
  const key = normalizeServiceKey(token?.service);
  const custom = key ? iconOverrides.value[key] : null;
  const url = typeof custom === 'string' ? custom : getServiceIconUrl(token?.service, token?.name);
  return url && !failedIconUrls.value.includes(url) ? url : null;
};

const previewIconUrl = computed(() => {
  const custom = String(tokenForm.value.iconUrl || '').trim();
  if (custom) return previewIconFailed.value ? null : validateCustomIconUrl(custom);
  return getServiceIconUrl(tokenForm.value.service, tokenForm.value.name);
});

const resetPreviewIconError = () => {
  previewIconFailed.value = false;
};

const handlePreviewIconError = () => {
  previewIconFailed.value = true;
};

const handleIconError = (event, token) => {
  const url = event?.target?.src;
  if (url && !failedIconUrls.value.includes(url)) failedIconUrls.value = [...failedIconUrls.value, url];
};

const handleIconFile = async (fileValue) => {
  const file = Array.isArray(fileValue) ? fileValue[0] : fileValue;
  if (!file) return;
  if (!String(file.type || '').startsWith('image/')) {
    showSnackbar('Choose a valid image file.', 'error');
    return;
  }
  if (file.size > MAX_CUSTOM_ICON_BYTES) {
    showSnackbar('Icon files must be 512 KB or smaller.', 'error');
    return;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read icon file'));
      reader.readAsDataURL(file);
    });
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image data');
    }
    tokenForm.value.iconUrl = dataUrl;
    previewIconFailed.value = false;
  } catch {
    showSnackbar('Unable to load that icon file.', 'error');
  }
};

const validateCustomIconUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('data:image/')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
};

const saveServiceIconOverride = (service, rawUrl) => {
  const key = normalizeServiceKey(service);
  if (!key) return;
  const validatedUrl = validateCustomIconUrl(rawUrl);
  if (rawUrl && !validatedUrl) {
    throw new Error('Use a valid HTTPS image URL or upload a local image.');
  }

  const next = { ...iconOverrides.value };
  if (validatedUrl) next[key] = validatedUrl;
  else delete next[key];

  try {
    localStorage.setItem('ciphervault.serviceIconOverrides', JSON.stringify(next));
    iconOverrides.value = next;
    failedIconUrls.value = [];
  } catch {
    throw new Error('Unable to save the icon preference. Try a smaller image.');
  }
};

const isTokenFormValid = computed(() => {
  return tokenForm.value.name.trim() && 
         tokenForm.value.service.trim() && 
         tokenForm.value.value.trim();
});

const loadEnvironment = async () => {
  try {
    const env = await window.electronAPI.getOrCreateEnvironment(
      props.projectId,
      props.environmentType
    );
    if (env) {
      clearSelection();
      environmentId.value = env;
      await loadTokens();
    } else {
      showSnackbar('Failed to load environment', 'error');
    }
  } catch (error) {
    showSnackbar('Unable to load environment.', 'error');
  }
};

const loadTokens = async () => {
  if (!environmentId.value || !environmentId.value._id) return;
  
  try {
    const loadedTokens = await window.electronAPI.getTokens(environmentId.value._id);
    tokens.value = loadedTokens.map(token => ({ ...token, showValue: false, value: undefined }));
    const availableIds = new Set(tokens.value.map((token) => token._id));
    selectedTokenIds.value = selectedTokenIds.value.filter((id) => availableIds.has(id));
  } catch (error) {
    showSnackbar('Error loading tokens', 'error');
  }
};

const toggleTokenVisibility = async (token) => {
  if (token.showValue) {
    token.showValue = false;
    token.value = undefined;
    return;
  }

  try {
    const result = await window.electronAPI.getTokenValue(token._id);
    if (!result || typeof result.value !== 'string') throw new Error('Token not found');
    token.value = result.value;
    token.showValue = true;
  } catch {
    showSnackbar('Unable to reveal token. Check keyring access.', 'error');
  }
};

const copyToken = async (token) => {
  try {
    const copied = await window.electronAPI.copyToken(token._id);
    if (!copied) throw new Error('Token not found');
    showSnackbar('Token copied. Clipboard will clear after 30 seconds.', 'success');
  } catch {
    showSnackbar('Unable to copy token. Check keyring and clipboard permissions.', 'error');
  }
};

const openCreateDialog = () => {
  if (!environmentId.value || !environmentId.value._id) {
    loadEnvironment().then(() => {
      editingToken.value = null;
      tokenForm.value = {
        name: '',
        service: '',
        value: '',
        iconUrl: ''
      };
      showTokenValue.value = false;
      showTokenDialog.value = true;
    });
  } else {
    editingToken.value = null;
    tokenForm.value = {
      name: '',
      service: '',
      value: '',
      iconUrl: ''
    };
    showTokenValue.value = false;
    showTokenDialog.value = true;
  }
};

const editToken = async (token) => {
  try {
    const result = await window.electronAPI.getTokenValue(token._id);
    if (!result || typeof result.value !== 'string') throw new Error('Token not found');
    editingToken.value = token;
    const key = normalizeServiceKey(token.service);
    tokenForm.value = {
      name: token.name,
      service: token.service,
      value: result.value,
      iconUrl: (key && iconOverrides.value[key]) || ''
    };
    previewIconFailed.value = false;
    showTokenValue.value = false;
    showTokenDialog.value = true;
  } catch {
    showSnackbar('Unable to load token for editing. Check keyring access.', 'error');
  }
};

const closeTokenDialog = () => {
  showTokenDialog.value = false;
  editingToken.value = null;
  tokenForm.value = {
    name: '',
    service: '',
    value: '',
    iconUrl: ''
  };
  previewIconFailed.value = false;
  showTokenValue.value = false;
};

const saveToken = async () => {
  if (String(tokenForm.value.iconUrl || '').trim() && !validateCustomIconUrl(tokenForm.value.iconUrl)) {
    showSnackbar('Use a valid HTTPS image URL or upload a local image.', 'error');
    return;
  }

  if (!isTokenFormValid.value) {
    showSnackbar('Please fill in all fields', 'error');
    return;
  }

  if (!environmentId.value || !environmentId.value._id) {
    showSnackbar('Environment not ready. Please wait...', 'error');
    return;
  }

  try {
    const tokenData = {
      name: tokenForm.value.name.trim(),
      service: tokenForm.value.service.trim(),
      value: tokenForm.value.value
    };

    if (editingToken.value) {
      await window.electronAPI.updateToken(editingToken.value._id, tokenData);
      showSnackbar('Token updated successfully', 'success');
    } else {
      await window.electronAPI.createToken(environmentId.value._id, tokenData);
      showSnackbar('Token created successfully', 'success');
    }

    try {
      saveServiceIconOverride(tokenData.service, tokenForm.value.iconUrl);
    } catch (iconError) {
      showSnackbar(iconError.message || 'Token saved, but its icon could not be saved.', 'error');
    }
    await loadTokens();
    emit('tokens-updated');
    closeTokenDialog();
  } catch (error) {
    showSnackbar('Unable to save token. Please check the fields and try again.', 'error');
  }
};

const confirmDelete = (token) => {
  deletingToken.value = token;
  showDeleteDialog.value = true;
};

const deleteToken = async () => {
  if (!deletingToken.value) return;

  try {
    await window.electronAPI.deleteToken(deletingToken.value._id);
    showSnackbar('Token deleted successfully', 'success');
    await loadTokens();
    emit('tokens-updated');
    showDeleteDialog.value = false;
    deletingToken.value = null;
  } catch (error) {
    showSnackbar('Error deleting token', 'error');
  }
};

const deleteSelectedTokens = async () => {
  if (batchDeleteInProgress.value || selectedTokenIds.value.length === 0) return;
  if (!environmentId.value?._id) {
    showSnackbar('Environment not ready. Please try again.', 'error');
    return;
  }

  batchDeleteInProgress.value = true;
  const idsToDelete = [...selectedTokenIds.value];
  try {
    const deletedCount = await window.electronAPI.deleteTokens(
      environmentId.value._id,
      idsToDelete
    );
    if (deletedCount !== idsToDelete.length) {
      throw new Error('Batch deletion count mismatch');
    }

    clearSelection();
    showBatchDeleteDialog.value = false;
    await loadTokens();
    emit('tokens-updated');
    showSnackbar(`Successfully deleted ${deletedCount} token(s).`, 'success');
  } catch {
    // Refresh to reflect the authoritative database state, without exposing IPC details.
    await loadTokens();
    showSnackbar('Unable to delete all selected tokens. Refresh the list and try again.', 'error');
  } finally {
    batchDeleteInProgress.value = false;
  }
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color };
};

watch(() => props.projectId, () => {
  loadEnvironment();
});

watch(() => props.environmentType, () => {
  loadEnvironment();
});

onMounted(() => {
  loadIconOverrides();
  loadEnvironment();
  window.addEventListener('ciphervault:focus-token-search', handleFocusSearchEvent);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('ciphervault:focus-token-search', handleFocusSearchEvent);
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
</script>

<style scoped>
.token-manager {
  min-height: 400px;
}

.token-value {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  word-break: break-all;
}

/* A textarea does not support type="password"; mask its text visually instead. */
.token-value-hidden :deep(textarea) {
  -webkit-text-security: disc;
}

.token-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 220px;
  max-width: calc(100vw - 16px);
  box-shadow: 0 6px 24px rgb(0 0 0 / 24%);
}

.token-context-menu :deep([role="menuitem"]:focus-visible) {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}

.selection-column {
  width: 52px;
  white-space: nowrap;
}

.cv-service-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.cv-service-icon {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(167, 150, 219, .14);
  border-radius: 10px;
  background: rgba(128, 107, 190, .12);
  color: #b8a0ff;
}

.cv-service-icon img,
.cv-icon-preview img {
  display: block;
  width: 100%;
  height: 100%;
  padding: 6px;
  object-fit: contain;
}

.cv-icon-customizer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(167, 150, 219, .18);
  border-radius: 12px;
  background: rgba(128, 107, 190, .06);
}

.cv-icon-preview {
  display: grid;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(128, 107, 190, .14);
  color: #b8a0ff;
}

.cv-icon-fields {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 10px;
}

@media (max-width: 760px) {
  .cv-icon-customizer { align-items: flex-start; }
}
</style>

