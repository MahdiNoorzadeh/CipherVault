<template>
  <v-app :theme="theme">
    <div
      class="cv-shell"
      :class="[`ambient-pattern-${ambientPattern}`, `theme-${theme}`]"
      :style="{
        '--pointer-x': `${pointerPosition.x}%`,
        '--pointer-y': `${pointerPosition.y}%`
      }"
      @pointermove="handlePointerMove"
    >
      <div class="cv-ambient" aria-hidden="true"></div>
      <div class="cv-ambient-frame" aria-hidden="true"></div>

      <aside class="cv-sidebar">
        <div class="cv-brand">
          <div class="cv-brand-mark" aria-hidden="true">
            <v-icon icon="mdi-shield-lock" size="34"></v-icon>
          </div>
          <div class="cv-brand-copy">
            <div class="cv-brand-name">CipherVault</div>
            <div class="cv-brand-subtitle">Secure Token Management</div>
          </div>
        </div>

        <div class="cv-projects-region">
          <ProjectSidebar
            :projects="projects"
            :selected-project="selectedProject"
            @select-project="selectProject"
            @create-project="handleCreateProject"
            @update-project="handleUpdateProject"
            @delete-project="handleDeleteProject"
          />
        </div>

        <div class="cv-sidebar-footer">
          <button class="cv-footer-action" type="button" @click="openShortcutSettings">
            <v-icon icon="mdi-keyboard-outline" size="21"></v-icon>
            <span>Keyboard Shortcuts</span>
            <span class="cv-footer-shortcut">Ctrl+,</span>
          </button>
          <button class="cv-footer-action" type="button" @click="toggleTheme">
            <v-icon :icon="theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'" size="21"></v-icon>
            <span>{{ theme === 'dark' ? 'Light appearance' : 'Dark appearance' }}</span>
          </button>
        </div>
      </aside>

      <main class="cv-main">
        <section v-if="!selectedProject" class="cv-empty-state">
          <div class="cv-empty-card">
            <div class="cv-empty-icon"><v-icon icon="mdi-folder-open-outline" size="42"></v-icon></div>
            <h1>No project selected</h1>
            <p>Select a project from the sidebar or create a new one to get started.</p>
          </div>
        </section>

        <section v-else class="cv-workspace">
          <header class="cv-workspace-header">
            <div class="cv-workspace-heading">
              <div class="cv-project-icon"><v-icon icon="mdi-folder" size="28"></v-icon></div>
              <div>
                <h1>{{ selectedProject.name }}</h1>
                <p>Manage tokens for your project environments</p>
              </div>
            </div>
            <div class="cv-header-actions">
              <v-btn
                variant="text"
                icon="mdi-cog-outline"
                aria-label="Keyboard shortcut settings"
                title="Keyboard shortcut settings"
                @click="openShortcutSettings"
              ></v-btn>
            </div>
          </header>

          <div class="cv-environment-bar">
            <v-tabs v-model="activeTab" class="cv-environment-tabs" color="primary" hide-slider>
              <v-tab value="production">
                <v-icon icon="mdi-server" class="mr-2"></v-icon>
                Production
              </v-tab>
              <v-tab value="development">
                <v-icon icon="mdi-code-tags" class="mr-2"></v-icon>
                Development
              </v-tab>
            </v-tabs>
            <div class="cv-environment-hint">
              <v-icon icon="mdi-shield-check-outline" size="16"></v-icon>
              Encrypted vault
            </div>
          </div>

          <div class="cv-token-workspace">
            <v-window v-model="activeTab" class="cv-token-window">
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
          </div>
        </section>
      </main>
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
    </div>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue';
import { DEFAULT_SHORTCUTS, normalizeShortcut, shortcutFromKeyboardEvent, validateShortcuts } from './shared/keyboard-shortcuts.js';

// Lazy load components for better memory usage
const ProjectSidebar = defineAsyncComponent(() => import('./components/ProjectSidebar.vue'));
const TokenManager = defineAsyncComponent(() => import('./components/TokenManager.vue'));

const projects = ref([]);
const selectedProject = ref(null);
const activeTab = ref('production');
const theme = ref('dark');
const ambientPattern = ref(1);
const pointerPosition = ref({ x: 50, y: 35 });
let pointerFrame = 0;
let pendingPointerPosition = null;

const handlePointerMove = (event) => {
  const bounds = event.currentTarget.getBoundingClientRect();
  pendingPointerPosition = {
    x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
    y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))
  };
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    if (pendingPointerPosition) pointerPosition.value = pendingPointerPosition;
    pendingPointerPosition = null;
    pointerFrame = 0;
  });
};
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
  ambientPattern.value = Math.floor(Math.random() * 5) + 1;
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
  if (pointerFrame) cancelAnimationFrame(pointerFrame);
});
</script>

<style>
.cv-shell {
  position: relative;
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  background: #0d0f17;
  color: #f2f1fb;
}

.cv-ambient,
.cv-ambient-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cv-ambient {
  z-index: 0;
  overflow: hidden;
  background:
    radial-gradient(600px circle at var(--pointer-x, 50%) var(--pointer-y, 35%), rgba(130, 77, 255, .16), transparent 48%),
    radial-gradient(600px circle at 12% 8%, rgba(83, 58, 185, .12), transparent 55%),
    linear-gradient(135deg, #10121d 0%, #0c1018 55%, #11101c 100%);
}

.cv-ambient::before,
.cv-ambient::after {
  content: "";
  position: absolute;
  inset: -25%;
  opacity: .42;
  filter: blur(54px);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.cv-ambient::before {
  background: radial-gradient(ellipse at 35% 40%, rgba(115, 69, 255, .25), transparent 34%);
  animation: cv-drift-a 23s ease-in-out infinite alternate;
}

.cv-ambient::after {
  background: radial-gradient(ellipse at 70% 62%, rgba(77, 42, 180, .2), transparent 32%);
  animation: cv-drift-b 29s ease-in-out infinite alternate;
}

.ambient-pattern-2 .cv-ambient::before { background: radial-gradient(ellipse at 70% 24%, rgba(139, 82, 255, .28), transparent 36%); }
.ambient-pattern-2 .cv-ambient::after { background: radial-gradient(ellipse at 24% 75%, rgba(84, 48, 195, .22), transparent 35%); }
.ambient-pattern-3 .cv-ambient::before { background: radial-gradient(ellipse at 22% 70%, rgba(117, 73, 255, .26), transparent 34%); }
.ambient-pattern-3 .cv-ambient::after { background: radial-gradient(ellipse at 80% 25%, rgba(94, 59, 196, .2), transparent 33%); }
.ambient-pattern-4 .cv-ambient::before { background: radial-gradient(ellipse at 50% 15%, rgba(153, 90, 255, .23), transparent 36%); }
.ambient-pattern-4 .cv-ambient::after { background: radial-gradient(ellipse at 48% 90%, rgba(75, 51, 175, .22), transparent 34%); }
.ambient-pattern-5 .cv-ambient::before { background: radial-gradient(ellipse at 15% 28%, rgba(108, 70, 237, .26), transparent 35%); }
.ambient-pattern-5 .cv-ambient::after { background: radial-gradient(ellipse at 88% 72%, rgba(152, 81, 255, .19), transparent 33%); }

.cv-ambient-frame {
  z-index: 0;
  inset: 1px;
  border: 1px solid rgba(153, 111, 255, .3);
  border-radius: 11px;
  box-shadow:
    inset 0 0 22px rgba(129, 80, 255, .06),
    0 0 22px rgba(129, 80, 255, .12);
  opacity: .8;
  mask-image: radial-gradient(ellipse at var(--pointer-x, 50%) var(--pointer-y, 35%), #000 0%, rgba(0,0,0,.82) 30%, transparent 78%);
}

.cv-sidebar {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: rgba(16, 18, 29, .84);
  border-right: 1px solid rgba(153, 139, 201, .13);
  backdrop-filter: blur(14px);
  z-index: 1;
}

.cv-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 118px;
  padding: 20px 22px;
  border-bottom: 1px solid rgba(153, 139, 201, .13);
  background: linear-gradient(115deg, rgba(93, 63, 176, .12), transparent 75%);
}

.cv-brand-mark {
  display: grid;
  flex: 0 0 62px;
  width: 62px;
  height: 62px;
  place-items: center;
  color: #c2a8ff;
  border: 1px solid rgba(174, 136, 255, .78);
  border-radius: 19px;
  background: linear-gradient(145deg, rgba(113, 71, 255, .25), rgba(28, 24, 51, .7));
  box-shadow: 0 0 25px rgba(129, 80, 255, .18), inset 0 0 18px rgba(129, 80, 255, .12);
}

.cv-brand-name { font-size: 23px; font-weight: 700; letter-spacing: -.7px; }
.cv-brand-subtitle { margin-top: 2px; color: #aaa9c8; font-size: 12px; }

.cv-projects-region { flex: 1; min-height: 0; overflow: auto; }
.cv-projects-region > .v-card { background: transparent !important; color: inherit; }

.cv-sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(153, 139, 201, .13);
}

.cv-footer-action {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #d4d1e8;
  text-align: left;
  cursor: pointer;
}
.cv-footer-action:hover { background: rgba(144, 109, 255, .1); }
.cv-footer-action .v-icon { color: #b59aff; }
.cv-footer-shortcut { margin-left: auto; color: #8e8ba9; font-size: 11px; }

.cv-main {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px 18px;
}

.cv-workspace {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: hidden;
  border: 1px solid rgba(153, 139, 201, .14);
  border-radius: 18px;
  background: rgba(15, 18, 28, .76);
  box-shadow: 0 16px 44px rgba(0, 0, 0, .18), inset 0 1px rgba(255,255,255,.025);
  backdrop-filter: blur(16px);
}

.cv-workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px 16px;
}

.cv-workspace-heading { display: flex; align-items: center; gap: 14px; min-width: 0; }
.cv-project-icon {
  display: grid;
  flex: 0 0 50px;
  width: 50px;
  height: 50px;
  place-items: center;
  color: #d6c9ff;
  border-radius: 13px;
  background: rgba(133, 102, 221, .16);
}
.cv-workspace-heading h1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 21px; font-weight: 650; letter-spacing: -.4px; }
.cv-workspace-heading p { margin-top: 3px; color: #a6abc7; font-size: 13px; }
.cv-header-actions { display: flex; align-items: center; }

.cv-environment-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
}
.cv-environment-tabs { flex: 1; min-width: 0; }
.cv-environment-tabs .v-slide-group__container { overflow: visible; }
.cv-environment-tabs .v-tab {
  min-width: 170px;
  min-height: 48px;
  margin-right: 6px;
  border: 1px solid rgba(145, 134, 188, .13);
  border-radius: 11px 11px 0 0;
  color: #b9bdd7;
  background: rgba(40, 43, 62, .45);
}
.cv-environment-tabs .v-tab--selected {
  color: #fff;
  border-color: rgba(174, 136, 255, .3);
  background: linear-gradient(110deg, rgba(115, 75, 222, .62), rgba(81, 52, 157, .46));
  box-shadow: inset 0 -2px #b59aff;
}
.cv-environment-hint { display: flex; align-items: center; gap: 7px; color: #9a94b7; font-size: 12px; white-space: nowrap; }
.cv-environment-hint .v-icon { color: #9f87ed; }

.cv-token-workspace { flex: 1; min-height: 0; padding: 4px 10px 12px; }
.cv-token-window { height: 100%; }
.cv-token-workspace .v-window-item { min-height: 100%; }
.cv-token-workspace .token-manager { padding: 16px !important; }
.cv-token-workspace .token-manager > .d-flex:first-child h3 { display: none !important; }
.cv-token-workspace .token-manager > .d-flex:first-child { justify-content: flex-end !important; }

.cv-empty-state { display: grid; min-height: 100%; place-items: center; }
.cv-empty-card {
  max-width: 470px;
  padding: 36px 34px;
  border: 1px solid rgba(171, 143, 255, .25);
  border-radius: 18px;
  background: rgba(22, 23, 37, .74);
  text-align: center;
  box-shadow: 0 0 42px rgba(114, 76, 220, .1);
}
.cv-empty-icon { display: grid; width: 68px; height: 68px; margin: 0 auto 16px; place-items: center; color: #bba3ff; border-radius: 18px; background: rgba(126, 89, 232, .16); }
.cv-empty-card h1 { font-size: 21px; margin-bottom: 8px; }
.cv-empty-card p { color: #aaa9c8; }

.shortcut-row + .shortcut-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@keyframes cv-drift-a {
  from { transform: translate3d(-3%, -2%, 0) scale(1); }
  to { transform: translate3d(4%, 3%, 0) scale(1.06); }
}
@keyframes cv-drift-b {
  from { transform: translate3d(3%, 2%, 0) scale(1.02); }
  to { transform: translate3d(-4%, -3%, 0) scale(1.08); }
}

@media (max-width: 1000px) {
  .cv-shell { grid-template-columns: 245px minmax(0, 1fr); }
  .cv-brand { padding: 16px; gap: 10px; }
  .cv-brand-mark { width: 52px; height: 52px; flex-basis: 52px; }
  .cv-brand-name { font-size: 20px; }
  .cv-main { padding: 10px; }
  .cv-environment-bar { padding: 0 16px; }
  .cv-workspace-header { padding: 18px 16px 14px; }
  .cv-environment-hint { display: none; }
}

@media (max-width: 720px) {
  .cv-shell { grid-template-columns: 205px minmax(0, 1fr); }
  .cv-brand { min-height: 92px; }
  .cv-brand-mark { width: 42px; height: 42px; flex-basis: 42px; border-radius: 13px; }
  .cv-brand-name { font-size: 17px; }
  .cv-brand-subtitle { font-size: 10px; }
  .cv-workspace-heading h1 { font-size: 17px; }
  .cv-workspace-heading p { display: none; }
  .cv-environment-tabs .v-tab { min-width: 125px; }
}

@media (prefers-reduced-motion: reduce) {
  .cv-ambient::before, .cv-ambient::after { animation: none !important; }
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
}

/* Light appearance overrides */
.cv-shell.theme-light {
  background: #f4f3fa;
  color: #242137;
}

.theme-light .cv-ambient {
  background:
    radial-gradient(
      600px circle at var(--pointer-x, 50%) var(--pointer-y, 35%),
      rgba(130, 77, 255, 0.10),
      transparent 48%
    ),
    radial-gradient(
      600px circle at 12% 8%,
      rgba(83, 58, 185, 0.07),
      transparent 55%
    ),
    linear-gradient(135deg, #fbfaff 0%, #f3f1fa 55%, #f8f5ff 100%);
}

.theme-light .cv-sidebar {
  background: rgba(250, 249, 255, 0.92);
  border-right-color: rgba(95, 79, 140, 0.16);
}

.theme-light .cv-brand {
  border-bottom-color: rgba(95, 79, 140, 0.14);
  background: linear-gradient(
    115deg,
    rgba(125, 91, 220, 0.09),
    transparent 75%
  );
}

.theme-light .cv-brand-subtitle {
  color: #6f6b85;
}

.theme-light .cv-sidebar-footer {
  border-top-color: rgba(95, 79, 140, 0.14);
}

.theme-light .cv-footer-action {
  color: #37324d;
}

.theme-light .cv-footer-shortcut {
  color: #77718f;
}

.theme-light .cv-main {
  color: #242137;
}

.theme-light .cv-workspace {
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(95, 79, 140, 0.17);
  box-shadow:
    0 16px 44px rgba(48, 36, 84, 0.08),
    inset 0 1px rgba(255, 255, 255, 0.8);
}

.theme-light .cv-project-icon {
  color: #6741c6;
  background: rgba(133, 102, 221, 0.12);
}

.theme-light .cv-workspace-heading p {
  color: #716c87;
}

.theme-light .cv-environment-tabs .v-tab {
  color: #5e5877;
  border-color: rgba(95, 79, 140, 0.14);
  background: rgba(239, 236, 249, 0.8);
}

.theme-light .cv-environment-tabs .v-tab--selected {
  color: #fff;
  border-color: rgba(112, 75, 204, 0.35);
  background: linear-gradient(
    110deg,
    #8057d9,
    #6741b8
  );
  box-shadow: inset 0 -2px #c6b3ff;
}

.theme-light .cv-environment-hint {
  color: #716b89;
}

.theme-light .cv-empty-card {
  color: #29243e;
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(125, 91, 220, 0.22);
  box-shadow: 0 0 42px rgba(114, 76, 220, 0.07);
}

.theme-light .cv-empty-card p {
  color: #716b85;
}

/* Keep project cards readable if their contents use Vuetify surfaces */
.theme-light .cv-projects-region > .v-card {
  color: #29243e;
}

/* Improve contrast for the selected environment tab in light mode */
.theme-light .cv-environment-tabs .v-tab--selected {
  color: #ffffff !important;
}

/* Keep the selected tab's icon readable too */
.theme-light .cv-environment-tabs .v-tab--selected .v-icon {
  color: #ffffff !important;
}
</style>

