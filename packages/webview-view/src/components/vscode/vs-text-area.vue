<template>
  <vscode-text-area
    class="vs-text-area"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :disabled="disabled"
    :readonly="readonly"
    :rows="rows"
    :cols="cols"
    :value="value"
    :type="type"
    :resize="resize"
    :name="name"
    :autofocus="autofocus"
    :form="form"
    @input="onInput"
  >
    <slot> </slot>
  </vscode-text-area>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps({
  type: {
    type: String,
  },
  placeholder: {
    type: String,
  },
  maxlength: {
    type: [String, Number],
  },
  disabled: {
    type: Boolean,
  },
  readonly: {
    type: Boolean,
  },
  rows: {
    type: [String, Number],
  },
  cols: {
    type: [String, Number],
  },
  resize: {
    type: String,
  },
  name: {
    type: String,
  },
  autofocus: {
    type: Boolean,
  },
  form: {
    type: String,
  },
});

const modelValue = defineModel<string | undefined>("modelValue");
const value = ref(modelValue.value);

watch(modelValue, (val: any) => {
  if (val !== value.value) {
    value.value = val;
  }
});

const onInput = (e: any) => {
  modelValue.value = e.target.value;
};
</script>

<style lang="scss" scoped></style>
