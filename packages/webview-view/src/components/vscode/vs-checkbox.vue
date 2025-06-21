<template>
  <vscode-checkbox
    class="vs-checkbox"
    :checked="checked"
    :disabled="disabled"
    :readonly="readonly"
    :required="required"
    :value="value"
    :autofocus="autofocus"
    @change="onChange"
  >
    <slot> </slot>
  </vscode-checkbox>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps({
  disabled: {
    type: Boolean,
  },
  readonly: {
    type: Boolean,
  },
  required: {
    type: Boolean,
  },
  autofocus: {
    type: Boolean,
  },
  value: {
    type: String,
  },
});

const modelValue = defineModel<boolean | undefined>("modelValue");
const checked = ref(modelValue.value);

watch(modelValue, (val: any) => {
  if (val !== checked.value) {
    checked.value = val;
  }
});

const onChange = (e: any) => {
  modelValue.value = e.target.checked;
};
</script>

<style lang="scss" scoped></style>
