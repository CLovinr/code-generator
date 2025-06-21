<template>
  <vscode-text-field
    class="vs-text-field"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :disabled="disabled"
    :readonly="readonly"
    :value="value"
    :type="type"
    :name="name"
    :autofocus="autofocus"
    @input="onInput"
  >
    <slot> </slot>
  </vscode-text-field>
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
  name: {
    type: String,
  },
  autofocus: {
    type: Boolean,
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
