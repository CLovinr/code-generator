<template>
  <div class="db-table-list">
    <div class="right-tool">
      <VsTextField v-model="searchText" maxlength="128" placeholder="搜索" />

      <vscode-button appearance="icon" @click="loadTables" title="刷新">
        <i class="codicon codicon-sync"></i>
      </vscode-button>
    </div>
    <div class="table-grid">
      <vscode-data-grid aria-label="Basic" grid-template-columns="1fr 2fr 60px">
        <vscode-data-grid-row row-type="header">
          <vscode-data-grid-cell cell-type="columnheader" grid-column="1">
            表名称
          </vscode-data-grid-cell>
          <vscode-data-grid-cell cell-type="columnheader" grid-column="2">
            描述
          </vscode-data-grid-cell>
          <vscode-data-grid-cell cell-type="columnheader" grid-column="3">
            <VsCheckbox v-model="allChecked" :disabled="!!searchText" />
          </vscode-data-grid-cell>
        </vscode-data-grid-row>
        <template v-for="item in tableData" :key="item.name">
          <vscode-data-grid-row v-if="isMatch(item)">
            <vscode-data-grid-cell grid-column="1">
              {{ item.name }}
            </vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="2">
              {{ item.comment }}
            </vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="3">
              <VsCheckbox v-model="checkedTables[item.name]" />
            </vscode-data-grid-cell>
          </vscode-data-grid-row>
        </template>
      </vscode-data-grid>
    </div>
  </div>
</template>
<script setup lang="ts">
import { watch, ref, nextTick } from "vue";
import _ from "lodash";
import { useVsCodeApiStore } from "@/stores/vscode";
import { VsCheckbox, VsTextField } from "@/components/vscode";

const props = defineProps({
  configDir: {
    type: String,
    required: true,
  },
});

const searchText = ref("");
const tableData = ref<any[]>([]);
const checkedTables = ref<any>({});
const allChecked = ref(false);
const isAllCheck = ref(true);

const vscodeApiStore = useVsCodeApiStore();
const modelValue = defineModel<string[] | undefined>("modelValue");

if (modelValue.value) {
  const obj: any = {};
  for (const name of modelValue.value) {
    obj[name] = true;
  }

  checkedTables.value = obj;
}

const isMatch = (item: any) => {
  if (searchText.value === "" || _.isNil(searchText.value)) {
    return true;
  } else {
    return (
      item.name.indexOf(searchText.value) >= 0 ||
      item.comment?.indexOf(searchText.value) >= 0
    );
  }
};

const loadTables = async () => {
  const tables = await vscodeApiStore.request("loadDBTables", props.configDir);
  tableData.value = tables;

  const checked: any = {};
  tables.forEach((o: any) => {
    checked[o.name] = checkedTables.value[o.name] || false;
  });
  checkedTables.value = checked;
};

watch(() => props.configDir, loadTables, {
  immediate: true,
});

watch(allChecked, (check) => {
  if (!isAllCheck.value) {
    return;
  }

  let checkedCount = 0;
  Object.values(checkedTables.value).forEach((o) => {
    if (o) {
      checkedCount++;
    }
  });

  if (
    (checkedCount === 0 && !check) ||
    (checkedCount === Object.keys(checkedTables.value).length && check)
  ) {
    return;
  }

  const newChecked: any = {};
  Object.keys(checkedTables.value).forEach((key: string) => {
    newChecked[key] = check;
  });

  checkedTables.value = newChecked;
});

watch(
  checkedTables,
  () => {
    let checkedCount = 0;
    const checkedItems: string[] = [];
    for (const name in checkedTables.value) {
      if (checkedTables.value[name]) {
        checkedCount++;
        checkedItems.push(name);
      }
    }

    const N = Object.keys(checkedTables.value).length;

    try {
      isAllCheck.value = false;
      if (checkedCount !== N) {
        if (allChecked.value) {
          allChecked.value = false;
        }
      } else {
        if (!allChecked.value) {
          allChecked.value = true;
        }
      }

      if (!modelValue.value || !_.isEqual(modelValue.value, checkedItems)) {
        modelValue.value = checkedItems;
      }
    } finally {
      nextTick(() => {
        isAllCheck.value = true;
      });
    }
  },
  {
    deep: true,
    immediate: true,
  }
);
</script>
<style lang="scss" scoped>
.db-table-list {
  width: 100%;
  max-width: 700px;
  max-height: 350px;
  display: flex;
  flex-direction: column;
}

.right-tool {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: right;
  gap: 5px;
}

.table-grid {
  flex: 1;
  overflow: auto;

  vscode-data-grid-cell {
    padding: 2px 4px;
    display: flex;
    align-items: center;
  }

  .vs-checkbox {
    margin: 0;
  }
}
</style>
