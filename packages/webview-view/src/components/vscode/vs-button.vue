<template>
  <vscode-button
    class="vs-button"
    :appearance="appearance"
    :disabled="disabled"
    :type="type"
    :name="name"
    :value="value"
    :autofocus="autofocus"
    :form="form"
  >
    <slot> </slot>
  </vscode-button>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { ref, watch } from "vue";

const props = defineProps({
  appearance: {
    type: String as PropType<"primary" | "secondary" | "icon">,
  },
  name: {
    type: String,
  },
  type: {
    type: String,
    default: "button",
  },
  disabled: {
    type: Boolean,
  },
  value: {
    type: String,
  },
  autofocus: {
    type: Boolean,
  },
  form: {
    type: String,
  },
});
</script>

<style lang="scss" scoped></style>
