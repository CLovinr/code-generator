<template>
  <vscode-option
    class="vs-option"
    :disabled="disabled"
    :selected="selected"
    :value="value"
  >
    <slot> </slot>
  </vscode-option>
</template>

<script setup lang="ts">
import { ref, watch, inject } from "vue";

const props = defineProps({
  selected: {
    type: Boolean,
  },
  disabled: {
    type: Boolean,
  },
  value: {
    type: String,
  },
});
</script>

<style lang="scss" scoped></style>
