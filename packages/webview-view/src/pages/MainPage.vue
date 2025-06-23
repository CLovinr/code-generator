<template>
  <div class="container">
    <div class="form-item">
      <label class="w6">选择项目</label>
      <div class="field">
        <VsDropdown
          v-model="projectBaseDir"
          :title="projectBaseDir"
          style="width: 150px"
          :disabled="noProject || globalLoading"
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
        <VsButton v-else-if="noProject"> 未打开项目 </VsButton>
      </div>
    </div>
    <div class="form-item">
      <label class="w6">选择模板</label>
      <div class="field">
        <VsDropdown
          v-model="tplName"
          :title="tplName"
          style="width: 150px"
          :disabled="noProject || globalLoading"
        >
          <VsOption v-for="name in allTemplateNames" :value="name" :key="name">
            {{ name }}
          </VsOption>
        </VsDropdown>
      </div>
    </div>
    <div class="form-item no-margin">
      <label class="w6">保存位置</label>
      <div class="field" style="flex: 1; display: flex; gap: 5px">
        <VsTextField
          v-model="baseOutDir"
          maxlength="1000"
          readonly
          style="flex: 1"
        />
        <VsButton
          appearance="secondary"
          :disabled="globalLoading || !isInitCodeGenConfig"
          @click="selectSaveDir"
        >
          选择位置
        </VsButton>
      </div>
    </div>
    <template v-if="isInitCodeGenConfig">
      <VsDivider />
      <div class="form-item">
        <DBTableListItem
          ref="refTableListItem"
          v-model:customerItems="customerItems"
          v-model="tableNames"
          :configDir="codeGenConfigDir"
          @onLoadTable="loadTemplates"
        />
      </div>

      <VsDivider />
      <div class="form-item right no-margin">
        <div style="display: flex; align-items: center; gap: 5px">
          <VsButton
            :disabled="globalLoading || isGenerating"
            @click="addCustomerItem"
          >
            <span style="display: flex; align-items: center; width: 3.5em">
              <i class="codicon codicon-add"></i>添加
            </span>
          </VsButton>
          <VsButton
            :disabled="!existsGenItems || (globalLoading && !isGenerating)"
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
        <label class="left">执行日志</label>
        <div ref="refLogContainer" class="log-container">
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
const allTemplateNames = ref<string[]>([]);
const tplName = ref("");
const baseOutDir = ref("");

const codeGenConfigDir = ref("");
const isInitCodeGenConfig = ref(false);
const noProject = computed(() => workspaceFolders.value.length === 0);
const customerItems = ref<any[]>([]);
const tableNames = ref<string[]>([]);
const refTableListItem = ref();

const existsGenItems = computed(
  () =>
    !!(
      tableNames.value?.length ||
      customerItems.value?.filter((o) => o.checked).length
    )
);

const logMessages = ref<any[]>([]);
const isGenerating = ref(false);
const generatingPercent = ref("");
const generateResultInfo = ref("");
const refLogContainer = ref();

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
    loadTemplates();
    globalLoading.value = false;
  }
};

const loadTemplates = async () => {
  const result: any = await vscodeApiStore.request(
    "getTemplateNames",
    codeGenConfigDir.value
  );
  allTemplateNames.value = result.tplNames as string[];
  tplName.value = result.current;
  baseOutDir.value = result.baseOutDir;

  if (tplName.value && !allTemplateNames.value.includes(tplName.value)) {
    tplName.value = "";
  }

  if (!tplName.value) {
    tplName.value = allTemplateNames.value?.[0];
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

  if (
    projectBaseDir.value &&
    !workspaceFolders.value.includes(projectBaseDir.value)
  ) {
    projectBaseDir.value = "";
  }

  if (!projectBaseDir.value) {
    projectBaseDir.value = workspaceFolders.value?.[0];
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

const selectSaveDir = async () => {
  const dir = await vscodeApiStore.request(
    "selectSaveDir",
    codeGenConfigDir.value
  );
  baseOutDir.value = dir;
};

const startGenCode = async () => {
  if (isGenerating.value) {
    await vscodeApiStore.request("stopGenCode");
    return;
  } else if (!tplName.value) {
    await vscodeApiStore.request("showWarningMessage", "未选择模板！");
    return;
  } else if (!baseOutDir.value) {
    await vscodeApiStore.request("showWarningMessage", "未设置保存位置！");
    return;
  }

  try {
    globalLoading.value = true;
    isGenerating.value = true;
    generateResultInfo.value = "";

    const theCustomerItems: any[] = [];
    if (customerItems.value) {
      for (const item of customerItems.value) {
        theCustomerItems.push({
          ...item,
        });
      }
    }

    const result = await vscodeApiStore.request("startGenCode", {
      configDir: codeGenConfigDir.value,
      tables: [...tableNames.value],
      customerItems: theCustomerItems,
      tplName: tplName.value,
      baseOutDir: baseOutDir.value,
    });

    logMessages.value = result.log;

    updateGenerateResultInfo(result.state);
  } finally {
    isGenerating.value = false;
    globalLoading.value = false;
    generatingPercent.value = "";
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
    refLogContainer.value.scrollTop = refLogContainer.value.scrollHeight;
  });
});

const addCustomerItem = () => {
  refTableListItem.value.addCustomerItem();
};
</script>

<style scoped lang="scss">
.container {
  padding: 5px 10px;
  width: 100%;
  min-width: 450px;
}
.vs-text-area {
  width: 100%;
  resize: vertical;
  margin: 20px auto;
}

.log-container {
  height: calc(100vh - 580px);
  width: 100%;
  overflow: auto;

  .log-item {
    min-width: 500px;
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
