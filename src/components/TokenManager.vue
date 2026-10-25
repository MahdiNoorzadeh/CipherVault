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

    <v-alert
      v-if="tokens.length === 0"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      No tokens in this environment. Click "Add Token" to create one.
    </v-alert>

    <v-table v-else>
      <thead>
        <tr>
          <th>Name</th>
          <th>Service</th>
          <th>Token</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="token in tokens" :key="token._id">
          <td>{{ token.name }}</td>
          <td>
            <v-chip size="small" color="primary" variant="flat">
              {{ token.service }}
            </v-chip>
          </td>
          <td>
            <div class="d-flex align-center">
              <span v-if="!token.showValue" class="text-medium-emphasis">
                •••••••••••••••••
              </span>
              <span v-else class="token-value">{{ token.value }}</span>
              <v-btn
                :icon="token.showValue ? 'mdi-eye-off' : 'mdi-eye'"
                size="x-small"
                variant="text"
                class="ml-2"
                @click="toggleTokenVisibility(token)"
              ></v-btn>
              <v-btn
                icon="mdi-content-copy"
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
              size="x-small"
              variant="text"
              @click="editToken(token)"
            ></v-btn>
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              @click="confirmDelete(token)"
            ></v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

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
            label="Service (e.g., GitHub, AWS, etc.)"
            variant="outlined"
            class="mb-3"
            required
          ></v-text-field>
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

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

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
  value: ''
});

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
        value: ''
      };
      showTokenValue.value = false;
      showTokenDialog.value = true;
    });
  } else {
    editingToken.value = null;
    tokenForm.value = {
      name: '',
      service: '',
      value: ''
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
    tokenForm.value = { name: token.name, service: token.service, value: result.value };
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
    value: ''
  };
  showTokenValue.value = false;
};

const saveToken = async () => {
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
  loadEnvironment();
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
</style>

