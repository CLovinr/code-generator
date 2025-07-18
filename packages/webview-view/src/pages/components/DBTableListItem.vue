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
      <div v-if="!!selectedCount" class="selected-count">
        <div>已选数: {{ selectedCount }} / {{ totalCount }}</div>
        <div title="定位当前勾选项" @click="focusCurrent">
          <i class="codicon codicon-record"></i>
        </div>
        <div title="定位下一个勾选项" @click="focusNextChosenItem">
          <i class="codicon codicon-debug-step-into"></i>
        </div>
      </div>
    </div>
    <vscode-data-grid
      class="table-header"
      aria-label="Basic"
      grid-template-columns="30px 5fr 6fr"
    >
      <vscode-data-grid-row>
        <vscode-data-grid-cell grid-column="1">
          <VsCheckbox
            v-model="allChecked"
            :disabled="!!searchText || globalLoading"
          />
        </vscode-data-grid-cell>
        <vscode-data-grid-cell grid-column="2">
          模块/表名称
        </vscode-data-grid-cell>
        <vscode-data-grid-cell grid-column="3"> 描述 </vscode-data-grid-cell>
      </vscode-data-grid-row>
    </vscode-data-grid>
    <div ref="refDataGrid" class="table-grid">
      <vscode-data-grid aria-label="Basic" grid-template-columns="30px 5fr 6fr">
        <template v-for="(item, index) in customerItems" :key="item.id">
          <vscode-data-grid-row
            v-if="isMatch(item)"
            :id="`customer-row-${item.id}`"
            :class="{
              checked: item.checked,
            }"
          >
            <vscode-data-grid-cell grid-column="1">
              <VsCheckbox
                v-model="item.checked"
                :disabled="!item.name || globalLoading"
              />
            </vscode-data-grid-cell>
            <vscode-data-grid-cell
              :id="`customer-row-${item.id}__name`"
              grid-column="2"
            >
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
          <vscode-data-grid-row
            v-if="isMatch(item)"
            :id="`table-row-${item.name}`"
            :class="{
              checked: allTableNamesToChecked[item.name],
            }"
          >
            <vscode-data-grid-cell grid-column="1">
              <VsCheckbox
                v-model="allTableNamesToChecked[item.name]"
                :disabled="globalLoading"
              />
            </vscode-data-grid-cell>
            <vscode-data-grid-cell
              grid-column="2"
              :id="`table-row-${item.name}__name`"
            >
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

// 已勾选的数据表：key包含所有数据表名，value为true表示已勾选
const allTableNamesToChecked = ref<any>({});
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
const tableNamesModelValue = defineModel<string[] | undefined>("modelValue");
const customerItemsValue = defineModel<CustomerItem[] | undefined>(
  "customerItems"
);

const selectedCount = computed(() => {
  let count = 0;
  if (tableNamesModelValue.value) {
    count += tableNamesModelValue.value.length;
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

const totalCount = computed(() => {
  let n = 0;

  for (const item of customerItems.value) {
    if (item.name) {
      n++;
    }
  }

  if (tableData.value) {
    n += tableData.value.length;
  }

  return n;
});

watch(
  tableNamesModelValue,
  () => {
    const obj: any = {};
    if (tableNamesModelValue.value) {
      for (const name of tableNamesModelValue.value) {
        if (
          name in allTableNamesToChecked.value ||
          tableData.value.length === 0
        ) {
          obj[name] = true;
        }
      }
    }

    allTableNamesToChecked.value = {
      ...allTableNamesToChecked.value,
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
      allTableNamesToChecked.value = [];
    } else {
      tableData.value = tables;

      const checked: any = {};
      tables.forEach((o: any) => {
        checked[o.name] = allTableNamesToChecked.value[o.name] || false;
      });
      allTableNamesToChecked.value = checked;
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

  if (check && selectedCount.value === totalCount.value) {
    // 已经全部选中
    return;
  } else if (!check && selectedCount.value === 0) {
    // 已经全部取消
    return;
  }

  const newChecked: any = {};
  Object.keys(allTableNamesToChecked.value).forEach((key: string) => {
    newChecked[key] = check;
  });

  allTableNamesToChecked.value = newChecked;

  if (customerItems.value) {
    for (const item of customerItems.value) {
      if (item.name) {
        item.checked = check;
      } else {
        if (!check) {
          item.checked = false;
        }
      }
    }
  }
});

const processAllCheckState = () => {
  if (isAllCheckProcessing.value) {
    return;
  }

  const N = totalCount.value;
  const checkedCount = selectedCount.value;
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

    const checkedTableNames: string[] = [];
    for (const name in allTableNamesToChecked.value) {
      if (allTableNamesToChecked.value[name]) {
        checkedTableNames.push(name);
      }
    }
    if (
      !tableNamesModelValue.value ||
      !_.isEqual(tableNamesModelValue.value, checkedTableNames)
    ) {
      tableNamesModelValue.value = checkedTableNames;
    }
  } finally {
    nextTick(() => {
      isAllCheckProcessing.value = false;
    });
  }
};

watch(
  allTableNamesToChecked,
  () => {
    nextTick(processAllCheckState);
  },
  {
    deep: true,
  }
);

watch(
  customerItems,
  () => {
    customerItemsValue.value = customerItems.value;
    nextTick(processAllCheckState);
  },
  {
    deep: true,
  }
);

watch(() => props.configDir, loadTables, {
  immediate: true,
});

const allItemIds = computed(() => {
  const ids: string[] = [];
  if (customerItems.value) {
    for (const item of customerItems.value) {
      ids.push(`customer-row-${item.id}`);
    }
  }

  Object.keys(allTableNamesToChecked.value).forEach((name: string) => {
    ids.push(`table-row-${name}`);
  });

  return ids;
});

const currentFocusId = ref("");
const focusCurrent = () => {
  let currentIndex = -1;
  if (currentFocusId.value) {
    currentIndex = allItemIds.value.indexOf(currentFocusId.value);
  }

  if (currentIndex >= 0) {
    const id = allItemIds.value[currentIndex];
    const ele = document.getElementById(id);
    if (!ele) {
      focusNextChosenItem();
    } else {
      focusRowElement(ele);
    }
  } else {
    focusNextChosenItem();
  }
};
const focusNextChosenItem = () => {
  let currentIndex = -1;
  if (currentFocusId.value) {
    currentIndex = allItemIds.value.indexOf(currentFocusId.value);
  }

  let nextIndex = currentIndex + 1;
  if (nextIndex >= allItemIds.value.length) {
    nextIndex = 0;
  }

  function findNextCheckedItem(fromIndex: number) {
    let focusElement: HTMLElement | null = null;
    for (let i = fromIndex; i < allItemIds.value.length; i++) {
      const id = allItemIds.value[i];
      const ele = document.getElementById(id);
      if (ele?.classList?.contains("checked")) {
        focusElement = ele;
        break;
      }
    }
    return focusElement;
  }

  let focusElement: HTMLElement | null = findNextCheckedItem(nextIndex);
  if (!focusElement && nextIndex > 0) {
    focusElement = findNextCheckedItem(0);
  }

  if (focusElement) {
    currentFocusId.value = focusElement.id;
    focusRowElement(focusElement);
  } else {
    currentFocusId.value = "";
  }
};

const focusRowElement = (ele: HTMLElement) => {
  ele.scrollIntoView({
    behavior: "smooth", // 平滑滚动
    block: "center", // 垂直居中显示
  });

  setTimeout(() => {
    const inputElement = document.getElementById(ele.id + "__name");
    inputElement?.focus();
  }, 300);
};

const itemIdBase = `customer-${new Date().getTime()}`;
let itemId = 0;
const addCustomerItem = () => {
  const items = [...customerItems.value];
  const item = {
    id: `${itemIdBase}:${itemId++}`,
    checked: false,
    name: "",
    comment: "",
  };
  items.push(item);

  customerItems.value = items;

  currentFocusId.value = "";
  setTimeout(() => {
    const eleId = `customer-row-${item.id}`;
    const ele = document.getElementById(eleId);
    if (ele) {
      focusRowElement(ele);
    }
  }, 300);
};

const removeCustomerItem = async (item: any) => {
  if (item.name !== "" && !_.isNil(item.name)) {
    await vscodeApiStore.request("confirm", {
      message: `是否移元素【${item.name}】？`,
    });
  }

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

  .selected-count {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 6px;

    > div {
      display: flex;
      align-items: center;
    }
  }
}

.table-grid {
  flex: 1;
  overflow: auto;
}

.table-grid,
.table-header {
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
