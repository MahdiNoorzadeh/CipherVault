<template>
  <v-card class="fill-height" elevation="0" rounded="0">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Projects</span>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            icon="mdi-plus"
            size="small"
            variant="text"
            aria-label="Project actions"
            title="Create or search projects"
            v-bind="menuProps"
          ></v-btn>
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-folder-plus-outline" @click="showCreateDialog = true">
            <v-list-item-title>Create project</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-magnify" @click="toggleProjectSearch">
            <v-list-item-title>{{ showProjectSearch ? 'Hide project search' : 'Search projects' }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>

    <v-divider></v-divider>

    <div v-if="showProjectSearch" class="px-3 pt-3">
      <v-text-field
        v-model="projectSearchQuery"
        label="Search projects"
        placeholder="Enter project name"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        autofocus
        aria-label="Search projects by name"
        @click:clear="projectSearchQuery = ''"
      ></v-text-field>
    </div>

    <v-list density="compact" nav>
      <v-list-item
        v-for="project in filteredProjects"
        :key="project._id"
        :active="selectedProject && selectedProject._id === project._id"
        class="project-item"
        @click="$emit('select-project', project)"
      >
        <template #prepend>
          <v-icon icon="mdi-folder"></v-icon>
        </template>

        <v-list-item-title>{{ project.name }}</v-list-item-title>

        <template #append>
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn
                icon="mdi-dots-vertical"
                size="x-small"
                variant="text"
                aria-label="Project actions"
                v-bind="menuProps"
                @click.stop
              ></v-btn>
            </template>
            <v-list>
              <v-list-item @click="editProject(project)">
                <v-list-item-title>Edit</v-list-item-title>
              </v-list-item>
              <v-list-item @click="confirmDelete(project)">
                <v-list-item-title class="text-error">Delete</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-list-item>

      <v-list-item v-if="projects.length === 0" class="text-center text-medium-emphasis">
        <v-list-item-title>No projects yet</v-list-item-title>
      </v-list-item>
      <v-list-item
        v-else-if="filteredProjects.length === 0"
        class="text-center text-medium-emphasis"
      >
        <v-list-item-title>No matching projects</v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Create Project Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title>Create New Project</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newProjectName"
            label="Project Name"
            variant="outlined"
            autofocus
            @keyup.enter="createProject"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createProject">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Project Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Project</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editingProjectName"
            label="Project Name"
            variant="outlined"
            autofocus
            @keyup.enter="updateProject"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn color="primary" :disabled="!editingProjectName.trim()" @click="updateProject">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-error">Delete Project</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ deletingProject?.name }}"? This will also delete all associated environments and tokens.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteProject">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  projects: {
    type: Array,
    required: true
  },
  selectedProject: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['select-project', 'create-project', 'update-project', 'delete-project']);

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const showProjectSearch = ref(false);
const projectSearchQuery = ref('');
const newProjectName = ref('');
const editingProjectId = ref(null);
const editingProjectName = ref('');
const deletingProject = ref(null);

const filteredProjects = computed(() => {
  const query = String(projectSearchQuery.value ?? '').trim().toLocaleLowerCase();
  if (!query) return props.projects;

  return props.projects.filter((project) =>
    String(project.name ?? '').toLocaleLowerCase().includes(query)
  );
});

const toggleProjectSearch = () => {
  showProjectSearch.value = !showProjectSearch.value;
  if (!showProjectSearch.value) projectSearchQuery.value = '';
};

const createProject = () => {
  const name = newProjectName.value.trim();
  if (!name) return;

  emit('create-project', name);
  newProjectName.value = '';
  showCreateDialog.value = false;
};

const editProject = (project) => {
  editingProjectId.value = project._id;
  editingProjectName.value = project.name;
  showEditDialog.value = true;
};

const cancelEdit = () => {
  showEditDialog.value = false;
  // Keep the form's bound value valid while Vuetify finishes the close transition.
  // The next call to editProject overwrites both fields.
};

const updateProject = () => {
  const id = editingProjectId.value;
  const name = editingProjectName.value.trim();
  if (!id || !name) return;

  emit('update-project', id, name);
  showEditDialog.value = false;
  editingProjectId.value = null;
};

const confirmDelete = (project) => {
  deletingProject.value = project;
  showDeleteDialog.value = true;
};

const deleteProject = () => {
  if (!deletingProject.value) return;

  emit('delete-project', deletingProject.value._id);
  showDeleteDialog.value = false;
  deletingProject.value = null;
};
</script>

<style scoped>
.project-item {
  cursor: pointer;
}
</style>
