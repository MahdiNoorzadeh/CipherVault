<template>
  <v-app :theme="theme">
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>
        <v-icon icon="mdi-lock" class="mr-2"></v-icon>
        CipherVault
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-cog-outline"
        variant="text"
        aria-label="Keyboard shortcut settings"
        title="Keyboard shortcut settings"
        @click="openShortcutSettings"
      ></v-btn>
      <v-btn
        :icon="theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
        variant="text"
      ></v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <!-- Sidebar -->
          <v-col cols="3" class="sidebar">
            <ProjectSidebar
              :projects="projects"
              :selected-project="selectedProject"
              @select-project="selectProject"
              @create-project="handleCreateProject"
              @update-project="handleUpdateProject"
              @delete-project="handleDeleteProject"
            />
          </v-col>

          <!-- Main Content -->
          <v-col cols="9" class="main-content">
            <div v-if="!selectedProject" class="d-flex align-center justify-center fill-height">
              <v-card class="pa-8 text-center" variant="outlined">
                <v-icon icon="mdi-folder-open-outline" size="64" class="mb-4"></v-icon>
                <h2 class="text-h5 mb-2">No Project Selected</h2>
                <p class="text-body-2 text-medium-emphasis">
                  Select a project from the sidebar or create a new one to get started
                </p>
              </v-card>
            </div>

            <div v-else>
              <v-card class="ma-4" elevation="2">
                <v-card-title class="d-flex align-center">
                  <v-icon icon="mdi-folder" class="mr-2"></v-icon>
                  {{ selectedProject.name }}
                </v-card-title>
                <v-card-text>
                  <v-tabs v-model="activeTab" bg-color="primary">
                    <v-tab value="production">
                      <v-icon icon="mdi-server" class="mr-2"></v-icon>
                      Production
                    </v-tab>
                    <v-tab value="development">
                      <v-icon icon="mdi-code-tags" class="mr-2"></v-icon>
                      Development
                    </v-tab>
                  </v-tabs>

                  <v-window v-model="activeTab">
                    <v-window-item value="production">
                      <TokenManager
                        :project-id="selectedProject._id"
                        environment-type="Production"
                        @tokens-updated="loadTokens"
                      />
                    </v-window-item>
                    <v-window-item value="development">
                      <TokenManager
                        :project-id="selectedProject._id"
                        environment-type="Development"
                        @tokens-updated="loadTokens"
                      />
                    </v-window-item>
                  </v-window>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-dialog v-model="showShortcutSettings" max-width="640">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-keyboard-outline" class="mr-2"></v-icon>
          Keyboard Shortcuts
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Customize shortcuts. Each action must have a unique combination with at least one modifier key.
            Click a shortcut, then press the desired combination.
          </p>
          <v-alert v-if="shortcutError" type="error" variant="tonal" class="mb-4">
            {{ shortcutError }}
          </v-alert>
          <div v-for="action in shortcutActions" :key="action.id" class="d-flex align-center justify-space-between py-3 shortcut-row">
            <div>
              <div class="text-body-1">{{ action.label }}</div>
              <div class="text-caption text-medium-emphasis">{{ action.description }}</div>
            </div>
            <v-btn
              :color="recordingAction === action.id ? 'primary' : 'default'"
              variant="outlined"
              min-width="150"
              @click="startShortcutRecording(action.id)"
            >
              {{ recordingAction === action.id ? 'Press keys…' : draftShortcuts[action.id] }}
            </v-btn>
          </div>
          <div v-if="hasShortcutConflict" class="text-error text-body-2 mt-2">
            Each action must use a different shortcut.
          </div>
          <p class="text-caption text-medium-emphasis mt-3">
            Press Escape while recording to cancel. Shortcuts are ignored while typing in text fields.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelShortcutChanges">Cancel</v-btn>
          <v-btn color="primary" :disabled="hasShortcutConflict || Boolean(recordingAction)" :loading="savingShortcuts" @click="saveShortcuts">
            Save Shortcuts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue';
import { DEFAULT_SHORTCUTS, normalizeShortcut, shortcutFromKeyboardEvent, validateShortcuts } from './main/keyboard-shortcuts.js';

// Lazy load components for better memory usage
const ProjectSidebar = defineAsyncComponent(() => import('./components/ProjectSidebar.vue'));
const TokenManager = defineAsyncComponent(() => import('./components/TokenManager.vue'));

const projects = ref([]);
const selectedProject = ref(null);
const activeTab = ref('production');
const theme = ref('dark');
const showShortcutSettings = ref(false);
const shortcutSettings = ref({ ...DEFAULT_SHORTCUTS });
const draftShortcuts = ref({ ...DEFAULT_SHORTCUTS });
const recordingAction = ref(null);
const shortcutError = ref('');
const savingShortcuts = ref(false);
const shortcutActions = [
  { id: 'search', label: 'Focus token search', description: 'Focus search in the active environment' },
  { id: 'settings', label: 'Open shortcut settings', description: 'Open this settings dialog' }
];
const hasShortcutConflict = computed(() => {
  const values = Object.values(draftShortcuts.value).map(normalizeShortcut);
  return values.some((value) => !value) || new Set(values).size !== values.length;
});

const openShortcutSettings = () => {
  draftShortcuts.value = { ...shortcutSettings.value };
  shortcutError.value = '';
  recordingAction.value = null;
  showShortcutSettings.value = true;
};

const startShortcutRecording = (action) => {
  recordingAction.value = action;
  shortcutError.value = '';
};

const cancelShortcutChanges = () => {
  recordingAction.value = null;
  shortcutError.value = '';
  showShortcutSettings.value = false;
  draftShortcuts.value = { ...shortcutSettings.value };
};

const saveShortcuts = async () => {
  if (hasShortcutConflict.value || recordingAction.value) {
    shortcutError.value = 'Choose a valid, unique shortcut for each action.';
    return;
  }
  savingShortcuts.value = true;
  shortcutError.value = '';
  try {
    const validated = validateShortcuts(draftShortcuts.value);
    const saved = await window.electronAPI.saveKeyboardShortcuts(validated);
    shortcutSettings.value = { ...saved };
    draftShortcuts.value = { ...saved };
    showShortcutSettings.value = false;
  } catch {
    shortcutError.value = 'Unable to save shortcuts. Check the combinations and try again.';
  } finally {
    savingShortcuts.value = false;
  }
};

const isEditableTarget = (target) => Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));

const handleGlobalKeydown = (event) => {
  if (recordingAction.value) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      recordingAction.value = null;
      shortcutError.value = '';
      return;
    }
    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) {
      if (!['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(event.key)) {
        shortcutError.value = 'Use a supported key together with Ctrl, Alt, Shift, or Meta.';
      }
      return;
    }
    draftShortcuts.value = { ...draftShortcuts.value, [recordingAction.value]: shortcut };
    recordingAction.value = null;
    shortcutError.value = '';
    return;
  }

  if (showShortcutSettings.value || isEditableTarget(event.target)) return;
  const shortcut = shortcutFromKeyboardEvent(event);
  if (!shortcut) return;
  const action = Object.keys(shortcutSettings.value).find((key) => shortcutSettings.value[key] === shortcut);
  if (!action) return;
  event.preventDefault();
  if (action === 'search') {
    window.dispatchEvent(new CustomEvent('ciphervault:focus-token-search', {
      detail: activeTab.value === 'production' ? 'Production' : 'Development'
    }));
  } else if (action === 'settings') {
    openShortcutSettings();
  }
};

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
};

const loadProjects = async () => {
  try {
    projects.value = await window.electronAPI.getProjects();
  } catch (error) {
    console.error('Error loading projects:', error);
  }
};

const selectProject = (project) => {
  selectedProject.value = project;
  activeTab.value = 'production';
};

const handleCreateProject = async (name) => {
  try {
    await window.electronAPI.createProject(name);
    await loadProjects();
  } catch (error) {
    console.error('Error creating project:', error);
  }
};

const handleUpdateProject = async (id, name) => {
  try {
    await window.electronAPI.updateProject(id, name);
    await loadProjects();
    if (selectedProject.value && selectedProject.value._id === id) {
      selectedProject.value.name = name;
    }
  } catch (error) {
    console.error('Error updating project:', error);
  }
};

const handleDeleteProject = async (id) => {
  try {
    await window.electronAPI.deleteProject(id);
    await loadProjects();
    if (selectedProject.value && selectedProject.value._id === id) {
      selectedProject.value = null;
    }
  } catch (error) {
    console.error('Error deleting project:', error);
  }
};

const loadTokens = () => {
  // TokenManager component handles its own loading
};

onMounted(async () => {
  loadProjects();
  window.addEventListener('keydown', handleGlobalKeydown, true);
  try {
    const saved = await window.electronAPI.getKeyboardShortcuts();
    shortcutSettings.value = validateShortcuts(saved);
    draftShortcuts.value = { ...shortcutSettings.value };
  } catch {
    shortcutSettings.value = { ...DEFAULT_SHORTCUTS };
    draftShortcuts.value = { ...DEFAULT_SHORTCUTS };
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true);
});
</script>

<style scoped>
.sidebar {
  border-right: 1px solid rgba(var(--v-border-opacity), var(--v-border-opacity));
  background-color: rgba(var(--v-theme-surface));
}

.main-content {
  background-color: rgba(var(--v-theme-background));
}

.shortcut-row + .shortcut-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>

