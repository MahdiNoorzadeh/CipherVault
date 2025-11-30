<template>
  <v-card class="fill-height" elevation="0" rounded="0">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Projects</span>
      <v-btn
        icon="mdi-plus"
        size="small"
        variant="text"
        @click="showCreateDialog = true"
      ></v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        v-for="project in projects"
        :key="project._id"
        :active="selectedProject && selectedProject._id === project._id"
        @click="$emit('select-project', project)"
        class="project-item"
      >
        <template v-slot:prepend>
          <v-icon icon="mdi-folder"></v-icon>
        </template>

        <v-list-item-title>{{ project.name }}</v-list-item-title>

        <template v-slot:append>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                icon="mdi-dots-vertical"
                size="x-small"
                variant="text"
                v-bind="props"
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
            v-model="editingProject.name"
            label="Project Name"
            variant="outlined"
            autofocus
            @keyup.enter="updateProject"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="updateProject">Save</v-btn>
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
import { ref } from 'vue';

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
const newProjectName = ref('');
const editingProject = ref(null);
const deletingProject = ref(null);

const createProject = () => {
  if (newProjectName.value.trim()) {
    emit('create-project', newProjectName.value.trim());
    newProjectName.value = '';
    showCreateDialog.value = false;
  }
};

const editProject = (project) => {
  editingProject.value = { ...project };
  showEditDialog.value = true;
};

const updateProject = () => {
  if (editingProject.value && editingProject.value.name.trim()) {
    emit('update-project', editingProject.value._id, editingProject.value.name.trim());
    showEditDialog.value = false;
    editingProject.value = null;
  }
};

const confirmDelete = (project) => {
  deletingProject.value = project;
  showDeleteDialog.value = true;
};

const deleteProject = () => {
  if (deletingProject.value) {
    emit('delete-project', deletingProject.value._id);
    showDeleteDialog.value = false;
    deletingProject.value = null;
  }
};
</script>

<style scoped>
.project-item {
  cursor: pointer;
}
</style>

