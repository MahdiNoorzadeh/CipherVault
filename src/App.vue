<template>
  <v-app :theme="theme">
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>
        <v-icon icon="mdi-lock" class="mr-2"></v-icon>
        CipherVault
      </v-app-bar-title>
      <v-spacer></v-spacer>
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
  </v-app>
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue';

// Lazy load components for better memory usage
const ProjectSidebar = defineAsyncComponent(() => import('./components/ProjectSidebar.vue'));
const TokenManager = defineAsyncComponent(() => import('./components/TokenManager.vue'));

const projects = ref([]);
const selectedProject = ref(null);
const activeTab = ref('production');
const theme = ref('dark');

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

onMounted(() => {
  loadProjects();
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
</style>

