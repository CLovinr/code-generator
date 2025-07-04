<template>
  <div class="db-table-list">
    <div class="top-tool">
      <VsTextField
        v-model="searchText"
        maxlength="128"
        placeholder="搜索"
        style="width: 260px"
      />
      <div v-if="!existsDBTables">无数据表</div>
      <vscode-button
        appearance="icon"
        :disabled="globalLoading"
        @click="loadTables"
        title="刷新"
      >
        <i class="codicon codicon-sync"></i>
      </vscode-button>
      <div v-if="infoData?.dbType" style="color: gray; font-weight: bold">
        {{ infoData.dbType }}({{ infoData.dbKey }})
      </div>
      <div v-if="!!selectedCount">已选数: {{ selectedCount }}</div>
    </div>
    <div ref="refDataGrid" class="table-grid">
      <vscode-data-grid aria-label="Basic" grid-template-columns="30px 5fr 6fr">
        <vscode-data-grid-row row-type="header">
          <vscode-data-grid-cell cell-type="columnheader" grid-column="1">
            <VsCheckbox
              v-model="allChecked"
              :disabled="!!searchText || globalLoading"
            />
          </vscode-data-grid-cell>
          <vscode-data-grid-cell cell-type="columnheader" grid-column="2">
            表名称
          </vscode-data-grid-cell>
          <vscode-data-grid-cell cell-type="columnheader" grid-column="3">
            描述
          </vscode-data-grid-cell>
        </vscode-data-grid-row>
        <template v-for="(item, index) in customerItems" :key="item.id">
          <vscode-data-grid-row v-if="isMatch(item)">
            <vscode-data-grid-cell grid-column="1">
              <VsCheckbox
                v-model="item.checked"
                :disabled="!item.name || globalLoading"
              />
            </vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="2">
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 3px;
                  width: 100%;
                "
              >
                <VsTextField
                  v-model="item.name"
                  maxlength="128"
                  :disabled="globalLoading"
                  style="flex: 1"
                >
                  <i slot="start" class="codicon codicon-symbol-field" />
                </VsTextField>
                <vscode-button
                  appearance="icon"
                  :disabled="globalLoading || !!searchText || index === 0"
                  @click="moveUp(item)"
                  title="往上移"
                  style="padding: 0"
                >
                  <i class="codicon codicon-arrow-small-up"></i>
                </vscode-button>
                <vscode-button
                  appearance="icon"
                  :disabled="
                    globalLoading ||
                    !!searchText ||
                    index === customerItems.length - 1
                  "
                  @click="moveDown(item)"
                  title="往下移"
                  style="padding: 0"
                >
                  <i class="codicon codicon-arrow-small-down"></i>
                </vscode-button>
                <vscode-button
                  appearance="icon"
                  :disabled="globalLoading"
                  @click="removeCustomerItem(item)"
                  title="移除"
                >
                  <i class="codicon codicon-trash"></i>
                </vscode-button>
              </div>
            </vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="3">
              <VsTextField
                v-model="item.comment"
                maxlength="512"
                :disabled="globalLoading"
                style="width: 100%"
              >
                <i slot="start" class="codicon codicon-output" />
              </VsTextField>
            </vscode-data-grid-cell>
          </vscode-data-grid-row>
        </template>
        <template v-for="item in tableData" :key="item.name">
          <vscode-data-grid-row v-if="isMatch(item)">
            <vscode-data-grid-cell grid-column="1">
              <VsCheckbox
                v-model="checkedTables[item.name]"
                :disabled="globalLoading"
              />
            </vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="2">
              <i class="codicon codicon-table" style="margin-right: 5px" />
              {{ item.name }}
            </vscode-data-grid-cell>
            <vscode-data-grid-cell grid-column="3">
              <i class="codicon codicon-output" style="margin-right: 5px" />
              {{ item.comment }}
            </vscode-data-grid-cell>
          </vscode-data-grid-row>
        </template>
      </vscode-data-grid>
    </div>
  </div>
</template>
<script setup lang="ts">
import { watch, ref, nextTick, computed } from "vue";
import { storeToRefs } from "pinia";
import _ from "lodash";
import { useVsCodeApiStore } from "@/stores/vscode";
import { VsCheckbox, VsTextField } from "@/components/vscode";

const props = defineProps({
  configDir: {
    type: String,
    required: true,
  },
  infoData: {
    type: Object,
  },
});

const vscodeApiStore = useVsCodeApiStore();
const { globalLoading } = storeToRefs(vscodeApiStore);

const searchText = ref("");
const tableData = ref<any[]>([]);
const existsDBTables = ref(false);

const checkedTables = ref<any>({});
const allChecked = ref(false);
const isAllCheckProcessing = ref(false);

interface CustomerItem {
  id: any;
  name?: string;
  comment?: string;
  checked: boolean;
}

const customerItems = ref<CustomerItem[]>([]);

const refDataGrid = ref();

const emit = defineEmits(["onLoadTable"]);
const modelValue = defineModel<string[] | undefined>("modelValue");
const customerItemsValue = defineModel<CustomerItem[] | undefined>(
  "customerItems"
);

const selectedCount = computed(() => {
  let count = 0;
  if (modelValue.value) {
    count += modelValue.value.length;
  }

  if (customerItems.value) {
    for (const item of customerItems.value) {
      if (item.checked && item.name) {
        count++;
      }
    }
  }

  return count;
});

watch(
  modelValue,
  () => {
    const obj: any = {};
    if (modelValue.value) {
      for (const name of modelValue.value) {
        obj[name] = true;
      }
    }

    checkedTables.value = {
      ...checkedTables.value,
      ...obj,
    };
  },
  {
    immediate: true,
    deep: true,
  }
);

watch(
  customerItemsValue,
  () => {
    const items: CustomerItem[] = [];
    if (customerItemsValue.value) {
      for (const item of customerItemsValue.value) {
        items.push({
          ...item,
        });
      }
    }

    if (!_.isEqual(items, customerItems.value)) {
      customerItems.value = items;
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

const isMatch = (item: any) => {
  if (searchText.value === "" || _.isNil(searchText.value)) {
    return true;
  } else {
    return (
      item.name?.toLowerCase().indexOf(searchText.value.toLowerCase()) >= 0 ||
      item.comment?.toLowerCase().indexOf(searchText.value.toLowerCase()) >= 0
    );
  }
};

const loadTables = async () => {
  try {
    globalLoading.value = true;
    const { tables } = await vscodeApiStore.request(
      "loadDBTables",
      props.configDir
    );

    if (_.isNil(tables)) {
      tableData.value = [];
      checkedTables.value = [];
    } else {
      tableData.value = tables;

      const checked: any = {};
      tables.forEach((o: any) => {
        checked[o.name] = checkedTables.value[o.name] || false;
      });
      checkedTables.value = checked;
    }

    existsDBTables.value = !!tables;
  } finally {
    globalLoading.value = false;
    emit("onLoadTable");
  }
};

watch(allChecked, (check) => {
  if (isAllCheckProcessing.value) {
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
      isAllCheckProcessing.value = true;
      if (checkedCount !== N) {
        // 没有全部选中
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
        isAllCheckProcessing.value = false;
      });
    }
  },
  {
    deep: true,
  }
);

watch(
  customerItems,
  () => {
    customerItemsValue.value = customerItems.value;
  },
  {
    deep: true,
  }
);

watch(() => props.configDir, loadTables, {
  immediate: true,
});

const itemIdBase = `customer-${new Date().getTime()}`;
let itemId = 0;
const addCustomerItem = () => {
  refDataGrid.value.scrollTop = 0; // refDataGrid.value.scrollHeight;
  const items = [...customerItems.value];
  items.push({
    id: `${itemIdBase}:${itemId++}`,
    checked: false,
    name: "",
    comment: "",
  });

  customerItems.value = items;
};

const removeCustomerItem = async (item: any) => {
  await vscodeApiStore.request("confirm", {
    message: `是否移元素【${item.name || ""}】？`,
  });
  customerItems.value = customerItems.value.filter((o) => o.id !== item.id);
};

const moveUp = (item: any) => {
  const index = customerItems.value.findIndex((o) => o.id === item.id);
  if (index > 0) {
    const items = [...customerItems.value];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    customerItems.value = items;
  }
};

const moveDown = (item: any) => {
  const index = customerItems.value.findIndex((o) => o.id === item.id);
  if (index < customerItems.value.length - 1) {
    const items = [...customerItems.value];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    customerItems.value = items;
  }
};

defineExpose({
  addCustomerItem,
});
</script>
<style lang="scss" scoped>
.db-table-list {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.top-tool {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: left;
  gap: 6px;
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
