<template>
  <div class="ui-params">
    <div class="params-container">
      <div class="form-item">
        <label class="no-label"></label>
        <div class="field">
          <VsButton
            :disabled="globalLoading"
            appearance="secondary"
            @click="emit('resetValues')"
          >
            重置参数
          </VsButton>
        </div>
      </div>
      <template v-if="isReady">
        <template v-for="(item, index) in enabledUIParams" :key="item.var">
          <VsDivider v-if="index > 0" style="width: 50%" />
          <div class="form-item" :title="item.title">
            <label
              :class="{
                [`w${uiProps.labelWidth || 6}`]: true,
                'no-label': item.label === '' || _.isNil(item.label),
              }"
              >{{ item.label }}
            </label>
            <div class="field">
              <template v-if="item.type === 'checkbox'">
                <VsCheckbox
                  v-model="allCheckboxes[item.var]"
                  :disabled="globalLoading"
                  :title="allCheckboxes[item.var] ? '全取消' : '全选'"
                  @click="
                    () => {
                      checkboxesStates.clicked = true;
                      nextTick(() => {
                        checkCheckboxes(item.var);
                      });
                    }
                  "
                  @change="
                    () => {
                      checkboxesStates.changed = true;
                      nextTick(() => {
                        checkCheckboxes(item.var);
                      });
                      sleep(500).then(() => {
                        checkboxesStates.clicked = false;
                        checkboxesStates.changed = false;
                      });
                    }
                  "
                />
                <VsCheckbox
                  v-for="o in item.options"
                  v-model="uiValues[item.var][o.value]"
                  :value="o.value"
                  :key="o.value"
                  :disabled="globalLoading"
                  :title="o.title"
                >
                  {{ o.text }}
                </VsCheckbox>
              </template>
              <template v-else-if="item.type === 'dropdown'">
                <VsDropdown
                  v-model="uiValues[item.var]"
                  :title="item.title"
                  :disabled="globalLoading"
                >
                  <VsOption
                    v-for="o in item.options"
                    :value="o.value"
                    :key="o.value"
                    :disabled="globalLoading"
                    :title="o.title"
                  >
                    {{ o.text }}
                  </VsOption>
                </VsDropdown>
              </template>
              <template v-else-if="item.type === 'textfield'">
                <VsTextField
                  v-model="uiValues[item.var]"
                  :disabled="globalLoading"
                  :maxlength="item.maxlength"
                />
              </template>
              <template v-else-if="item.type === 'textarea'">
                <VsTextArea
                  v-model="uiValues[item.var]"
                  :disabled="globalLoading"
                  :maxlength="item.maxlength"
                />
              </template>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import _ from "lodash";
import { sleep } from "@/utils/base";

import {
  VsTextField,
  VsTextArea,
  VsButton,
  VsDropdown,
  VsOption,
  VsCheckbox,
  VsDivider,
} from "@/components/vscode";

import { useVsCodeApiStore } from "@/stores/vscode";

const props = defineProps({
  uiProps: {
    type: Object,
    default: () => ({}),
  },
  uiParams: {
    type: Array<any>,
  },
  templateName: {
    type: String,
  },
});

const vscodeApiStore = useVsCodeApiStore();

const { globalLoading } = storeToRefs(vscodeApiStore);

const emit = defineEmits(["resetValues"]);

const modelValue = defineModel<any>("modelValue");
const uiValues = ref<any>({});
const allCheckboxes = ref<any>({});
const isReady = computed(() => {
  return Object.keys(uiValues.value).length > 0;
});

function getSubValue(values: any, varName: string) {
  const subVars = varName.split(".");
  let v = undefined;
  let value = values;
  for (const subVar of subVars) {
    value = value?.[subVar];
  }

  return value;
}

const isVarMatch = (forVars: any[], values: any) => {
  try {
    for (const varItem of forVars) {
      const v = getSubValue(values, varItem.var);
      switch (varItem.op) {
        case "==":
          return v === varItem.value;
        case "!=":
          return v !== varItem.value;
        case ">":
          return v > varItem.value;
        case ">=":
          return v >= varItem.value;
        case "<":
          return v < varItem.value;
        case "<=":
          return v <= varItem.value;
        case "in":
          return varItem.value?.includes(v);
        case "nin":
          return !varItem.value?.includes(v);
        case "contains":
          return v?.includes(varItem.value);
        case "not-contains":
          return !v?.includes(varItem.value);
      }
    }
  } catch (e) {
    console.error(e);
    return false;
  }
};

const enabledUIParams = computed(() => {
  const params: any = [];
  if (props.uiParams) {
    for (const p of props.uiParams) {
      if (
        p.enable !== false &&
        (!props.templateName ||
          !p.forTemplates ||
          p.forTemplates.includes(props.templateName)) &&
        (!p.forVars || isVarMatch(p.forVars, modelValue.value))
      ) {
        params.push(p);
      }
    }
  }

  return params;
});

const updateUiValues = () => {
  const values = modelValue.value ? _.cloneDeep(modelValue.value) : {};
  const _allCheckboxes: any = {};

  for (const p of enabledUIParams.value) {
    // 简单判断已存储的值类型不符合时，删除值
    if (
      p.type === "checkbox" &&
      (typeof values[p.var] !== "object" || values[p.var] instanceof Array)
    ) {
      delete values[p.var];
    } else if (p.type !== "checkbox" && typeof values[p.var] === "object") {
      delete values[p.var];
    }

    if (!(p.var in values)) {
      if (p.type === "checkbox") {
        values[p.var] =
          typeof p.default === "object"
            ? {
                ...p.default,
              }
            : {};

        for (const o of p.options) {
          if (!(o.value in values[p.var])) {
            values[p.var][o.value] = false;
          }
        }
      } else {
        values[p.var] = (p.default || "").trim();
      }
    }

    if (p.type === "checkbox") {
      _allCheckboxes[p.var] = false;
      if (
        p.options?.length &&
        values[p.var] &&
        !Object.values(values[p.var]).includes(false)
      ) {
        _allCheckboxes[p.var] = true;
      }
    }
  }

  allCheckboxes.value = _allCheckboxes;
  uiValues.value = values;
};

watch(modelValue, updateUiValues, {
  deep: true,
  immediate: true,
});

watch(enabledUIParams, updateUiValues, {
  deep: true,
});

watch(
  uiValues,
  () => {
    const values = _.cloneDeep(uiValues.value);
    for (const key in values) {
      if (typeof values[key] === "string") {
        values[key] = values[key].trim();
      }
    }

    // console.log(`ui values: `, values);

    if (!_.isEqual(modelValue.value, values)) {
      modelValue.value = values;
    }
  },
  {
    deep: true,
  }
);

const checkboxesStates = ref({
  clicked: false,
  changed: false,
});
const couldCheckCheckboxes = computed(() => {
  return checkboxesStates.value.clicked && checkboxesStates.value.changed;
});

const checkCheckboxes = (key: string) => {
  if (!couldCheckCheckboxes.value) {
    return;
  } else {
    checkboxesStates.value.clicked = false;
    checkboxesStates.value.changed = false;
  }

  const values = _.cloneDeep(uiValues.value);

  //for (const key in allCheckboxes.value) {
  const checked = allCheckboxes.value[key];

  if (values[key]) {
    const boxValues = Object.values(values[key]);
    const expectedValues = Array(boxValues.length).fill(checked);
    if (!_.isEqual(boxValues, expectedValues)) {
      for (const k in values[key]) {
        values[key][k] = checked;
      }
    }
  }
  //}

  if (!_.isEqual(values, modelValue.value)) {
    modelValue.value = values;
  }
};

const checkItems = async () => {
  for (const item of enabledUIParams.value) {
    if (item.required) {
      let isOk = false;
      if (item.type === "checkbox") {
        isOk = Object.values(uiValues.value[item.var]).includes(true);
      } else {
        const v = uiValues.value[item.var];
        if (typeof v === "string") {
          isOk = !!v.trim();
        } else {
          isOk = !_.isNil(v);
        }
      }

      if (!isOk) {
        const errmsg = `【${item.label}】为必填参数`;
        await vscodeApiStore.request("showWarningMessage", errmsg);
        throw new Error(errmsg);
      }
    }
  }
};

defineExpose({
  checkItems,
});
</script>

<style lang="scss" scoped>
.ui-params {
  width: 100%;
  overflow: auto;

  .params-container {
    display: flex;
    flex-direction: column;

    .field {
      min-width: 300px;
      max-width: 600px;
      .vs-text-field,
      .vs-text-area,
      .vs-dropdown {
        width: 100%;
      }
    }
  }
}
</style>
