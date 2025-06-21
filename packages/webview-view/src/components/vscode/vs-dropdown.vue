<template>
  <vscode-dropdown
    class="vs-dropdown"
    :disabled="disabled"
    :open="open"
    :position="position"
    @change="onChange"
    :value="value"
  >
    <vscode-option
      v-if="value === undefined || value === ''"
      value=""
    ></vscode-option>
    <slot> </slot>
  </vscode-dropdown>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
  },
  disabled: {
    type: Boolean,
  },
  position: {
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

const onChange = (e: any) => {
  modelValue.value = e.target.value;
};
</script>

<style lang="scss" scoped></style>
