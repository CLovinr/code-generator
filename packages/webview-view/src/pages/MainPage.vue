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
          v-if="codeGenConfigDir && !isInitCodeGenConfig && !globalLoading"
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
      <div class="form-item right no-margin">
        <div style="display: flex; align-items: center; gap: 5px">
          <VsButton
            :disabled="!tableNames?.length && !globalLoading && !isGenerating"
            @click="startGenCode"
            style="width: 150px"
          >
            {{ isGenerating ? generatingPercent || "生成中..." : "开始生成" }}
          </VsButton>
          <VsButton
            :disabled="!logMessages.length"
            appearance="secondary"
            @click="logMessages = []"
          >
            清除
          </VsButton>
        </div>
      </div>

      <VsDivider />
      <div class="form-item vertical no-margin">
        <label>执行日志</label>
        <div ref="refLoginContainer" class="log-container">
          <div
            v-for="(item, index) in logMessages"
            :key="item.id"
            :style="{
              color: getLogColor(item),
            }"
            class="log-item"
          >
            <label>
              {{ index + 1 }}
            </label>
            <div>
              {{ item.message }}
            </div>
          </div>
        </div>
      </div>
      <VsDivider />
      <div class="form-item right">
        <div>
          {{ generateResultInfo }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

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

const { globalLoading } = storeToRefs(vscodeApiStore);
globalLoading.value = true;

const workspaceFolders = ref<string[]>([]);
const projectBaseDir = ref("");
const codeGenConfigDir = ref("");
const isInitCodeGenConfig = ref(false);
const noProject = computed(() => workspaceFolders.value.length === 0);
const tableNames = ref<string[]>([]);

const logMessages = ref<any[]>([]);
const isGenerating = ref(false);
const generatingPercent = ref("");
const generateResultInfo = ref("");
const refLoginContainer = ref();

const checkIsInit = async () => {
  try {
    globalLoading.value = true;
    console.log("projectBaseDir: ", projectBaseDir.value);
    if (projectBaseDir.value) {
      const configDir = path.join(projectBaseDir.value, CONFIG_DIR_BASE_NAME);
      const init = await vscodeApiStore.request(
        "isInitCodeGenConfig",
        configDir
      );
      isInitCodeGenConfig.value = init;
      codeGenConfigDir.value = configDir;
    } else {
      codeGenConfigDir.value = "";
      isInitCodeGenConfig.value = false;
    }
  } finally {
    globalLoading.value = false;
  }
};

watch(projectBaseDir, checkIsInit);

onMounted(() => {
  vscodeApiStore.initReady();
  vscodeApiStore.sendMessage("listWorkspaceFolders");
});

vscodeApiStore.onMessage("vscodeInitReady", (data) => {
  globalLoading.value = false;
});

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
    try {
      globalLoading.value = true;
      await vscodeApiStore.request("initCodeGenConfig", codeGenConfigDir.value);
      isInitCodeGenConfig.value = true;
    } finally {
      globalLoading.value = false;
    }
  }
};

const updateGenerateResultInfo = (state: any) => {
  let total = state.tasks.length;
  let success = 0;
  let partialSuccess = 0;
  let failed = 0;
  for (let i = 0; i < state.tasks.length; i++) {
    const task = state.tasks[i];
    if (task.success === 0 && task.failed === 0) {
      continue;
    }

    if (task.success === task.total) {
      success++;
    } else if (task.success === 0) {
      failed++;
    } else {
      partialSuccess++;
    }
  }

  generateResultInfo.value = `总数:${total} | 成功数:${success} | 部分成功数:${partialSuccess} | 失败数:${failed}`;
};

const startGenCode = async () => {
  try {
    globalLoading.value = true;
    isGenerating.value = true;
    generateResultInfo.value = "";

    const result = await vscodeApiStore.request("startGenCode", {
      configDir: codeGenConfigDir.value,
      tables: [...tableNames.value],
    });

    logMessages.value = result.log;

    updateGenerateResultInfo(result.state);
  } finally {
    isGenerating.value = false;
    globalLoading.value = false;
  }
};

vscodeApiStore.onMessage(
  "generating.progress",
  (data: {
    state: {
      finish: boolean;
      tasks: Array<{
        name: string;
        total: number;
        success: number;
        failed: number;
      }>;
    };
    log: any[];
  }) => {
    const state = data.state;

    const eachMax = 1 / state.tasks.length;
    let percent = 0;
    for (let i = 0; i < state.tasks.length; i++) {
      const task = state.tasks[i];
      const p =
        eachMax * Math.min((task.success + task.failed) / task.total, 1);
      percent += p;
    }

    generatingPercent.value = (percent * 100).toFixed(2) + " %";
    logMessages.value = data.log;
    updateGenerateResultInfo(state);
  }
);

const getLogColor = (item: any) => {
  if (item.type === "warn") {
    return "yellow";
  } else if (item.type === "error") {
    return "red";
  } else if (item.type === "success") {
    return "green";
  }
};

watch(logMessages, () => {
  nextTick(() => {
    refLoginContainer.value.scrollTop = refLoginContainer.value.scrollHeight;
  });
});
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

.log-container {
  max-height: 350px;
  width: 100%;
  overflow: auto;

  .log-item {
    min-width: 450px;
    display: flex;
    vertical-align: top;

    > label {
      width: 3em;
      text-align: right;
      color: gainsboro;
    }
  }
}
</style>
