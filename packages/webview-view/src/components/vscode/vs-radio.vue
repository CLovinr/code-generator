<template>
  <vscode-radio
    class="vs-radio"
    :checked="checked"
    :disabled="disabled"
    :readonly="readonly"
    :value="value"
    @change="onChange"
  >
    <slot> </slot>
  </vscode-radio>
</template>

<script setup lang="ts">
import { inject, ref, watch, onBeforeMount } from "vue";

const props = defineProps({
  disabled: {
    type: Boolean,
  },
  readonly: {
    type: Boolean,
  },
  value: {
    type: String,
  },
});

const modelValue = defineModel<boolean | undefined>("modelValue");
const checked = ref(modelValue.value);
const onRadioCheckedChange: any = inject("onRadioCheckedChange");
const onSetRadioValue: any = inject("onSetRadioValue");
const onRadioUnmount: any = inject("onRadioUnmount");

const setRadioValue = (value: string | undefined) => {
  const c = value === props.value;
  if (c !== modelValue.value) {
    modelValue.value = c;
  }
};

onSetRadioValue?.(setRadioValue);
onBeforeMount(() => {
  onRadioUnmount?.(setRadioValue);
});

watch(modelValue, (c: any) => {
  if (c !== checked.value) {
    checked.value = c;
  }

  onRadioCheckedChange?.(c ? props.value : undefined);
});

const onChange = (e: any) => {
  modelValue.value = e.target.checked;
};
</script>

<style lang="scss" scoped></style>
