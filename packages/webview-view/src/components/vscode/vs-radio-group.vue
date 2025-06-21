<template>
  <vscode-radio-group
    class="vs-radio-group"
    :appearance="orientation"
    :disabled="disabled"
    :name="name"
    :readonly="readonly"
  >
    <slot> </slot>
  </vscode-radio-group>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { ref, watch, provide } from "vue";

const props = defineProps({
  orientation: {
    type: String as PropType<"horizontal" | "vertical">,
    default: "vertical",
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
});

const modelValue = defineModel<string | undefined>("modelValue");
const radios: any[] = [];

watch(modelValue, (val: string | undefined) => {
  for (const func of radios) {
    func(val);
  }
});

provide("onRadioCheckedChange", (value: string | undefined) => {
  if (value !== modelValue.value) {
    modelValue.value = value;
  }
});

provide("onSetRadioValue", (setFuncs: any) => {
  if (radios.indexOf(setFuncs) === -1) {
    radios.push(setFuncs);
  }
});

provide("onRadioUnmount", (setFuncs: any) => {
  const index = radios.indexOf(setFuncs);
  if (index >= 0) {
    radios.splice(index, 1);
  }
});
</script>

<style lang="scss" scoped></style>
