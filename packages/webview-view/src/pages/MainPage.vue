<template>
  <div class="container">
    <div class="form-item no-margin">
      <label class="w6">选择子项目</label>
      <div class="field">
        <VsDropdown
          v-model="projectBaseDir"
          :title="projectBaseDir"
          style="width: 150px"
          :disabled="noProject"
        >
          <VsOption v-for="path in workspaceFolders" :value="path" :key="path">
            {{ basename(path) }}
          </VsOption>
        </VsDropdown>
        <VsButton
          v-if="codeGenConfigDir && !isInitCodeGenConfig"
          @click="initCodeGenConfig"
          style="margin-left: 20px"
        >
          初始化代码生成器
        </VsButton>
        <VsButton v-else-if="noProject" disabled>未打开项目</VsButton>
      </div>
    </div>
    <template v-if="isInitCodeGenConfig">
      <VsDivider />
      <div class="form-item">
        <DBTableListItem v-model="tableNames" :configDir="codeGenConfigDir" />
      </div>

      <VsDivider />
      <div class="form-item right">
        <div style="display: flex; align-items: center; gap: 5px">
          <VsButton
            :disabled="!logContent"
            appearance="secondary"
            @click="logContent = ''"
          >
            清除
          </VsButton>
          <VsButton :disabled="!tableNames?.length" @click="startGenCode">
            开始生成
          </VsButton>
        </div>
      </div>

      <VsDivider />
      <div
        class="form-item vertical"
        style="max-height: 350px; width: 100%; overflow: auto"
      >
        <label>执行日志</label>
        <pre>{{ logContent }}</pre>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import path from "path-browserify";
import { useVsCodeApiStore, CONFIG_DIR_BASE_NAME } from "@/stores/vscode";
import {
  VsTextField,
  VsTextArea,
  VsButton,
  VsDropdown,
  VsOption,
  VsCheckbox,
  VsDivider,
} from "@/components/vscode";
import DBTableListItem from "./components/DBTableListItem.vue";

const vscodeApiStore = useVsCodeApiStore();
const workspaceFolders = ref<string[]>([]);
const projectBaseDir = ref("");
const codeGenConfigDir = ref("");
const isInitCodeGenConfig = ref(false);
const noProject = computed(() => workspaceFolders.value.length === 0);
const tableNames = ref<string[]>([]);
const logContent = ref("");

const checkIsInit = async () => {
  console.log("projectBaseDir: ", projectBaseDir.value);
  if (projectBaseDir.value) {
    const configDir = path.join(projectBaseDir.value, CONFIG_DIR_BASE_NAME);
    const init = await vscodeApiStore.request("isInitCodeGenConfig", configDir);
    isInitCodeGenConfig.value = init;
    codeGenConfigDir.value = configDir;
  } else {
    codeGenConfigDir.value = "";
    isInitCodeGenConfig.value = false;
  }
};

watch(projectBaseDir, checkIsInit);

onMounted(() => {
  vscodeApiStore.initReady();
  vscodeApiStore.sendMessage("listWorkspaceFolders");
});

vscodeApiStore.onMessage(["vscodeInitReady", "echo"], (data) => {});

vscodeApiStore.onMessage(["folders.list", "folders.change"], (data) => {
  workspaceFolders.value = data.folders as string[];
  if (!projectBaseDir.value) {
    projectBaseDir.value = data.folders?.[0];
  } else {
    checkIsInit();
  }
});

const basename = (path: string) => {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.substring(index + 1);
};

const initCodeGenConfig = async () => {
  if (codeGenConfigDir.value) {
    await vscodeApiStore.request("initCodeGenConfig", codeGenConfigDir.value);
    isInitCodeGenConfig.value = true;
  }
};

const startGenCode = async () => {
  const result = await vscodeApiStore.request("startGenCode", {
    configDir: codeGenConfigDir.value,
    tables: [...tableNames.value],
  });

  logContent.value = result.log;
};
</script>

<style scoped lang="scss">
.container {
  padding: 10px;
  width: 100%;
  min-width: 450px;
}
.vs-text-area {
  width: 100%;
  resize: vertical;
  margin: 20px auto;
}
</style>
