<template>
  <div class="ui-params">
    <div class="params-container">
      <template v-for="(item, index) in enabledUIParams" :key="item.var">
        <VsDivider v-if="index > 0" style="width: 50%" />
        <div class="form-item" :title="item.title">
          <label
            :class="{
              [`w${uiProps.labelWidth || 6}`]: true,
              'no-label': item.label === '' || _.isNil(item.label),
            }"
            >{{ item.label }}</label
          >
          <div class="field">
            <template v-if="item.type === 'checkbox'">
              <VsCheckbox
                v-for="o in item.options"
                v-model="uiValues[item.var][o.value]"
                :value="o.value"
                :key="o.value"
                :disabled="globalLoading"
                :title="o.title"
                >{{ o.text }}</VsCheckbox
              >
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
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import _ from "lodash";

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

const modelValue = defineModel<any>("modelValue");
const uiValues = ref<any>({});

const enabledUIParams = computed(() => {
  const params: any = [];
  if (props.uiParams) {
    for (const p of props.uiParams) {
      if (
        p.enable !== false &&
        (!props.templateName ||
          !p.forTemplates ||
          p.forTemplates.includes(props.templateName))
      ) {
        params.push(p);
      }
    }
  }

  return params;
});

const updateUiValues = () => {
  const values = modelValue.value ? _.cloneDeep(modelValue.value) : {};
  for (const p of enabledUIParams.value) {
    // 简单判断已存储的值类型不符合时，删除值
    if (p.type === "checkbox" && typeof values[p.var] !== "object") {
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
  }

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
