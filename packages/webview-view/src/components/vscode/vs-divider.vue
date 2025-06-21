<template>
  <vscode-divider class="vs-divider" :role="role">
    <slot> </slot>
  </vscode-divider>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { ref, watch } from "vue";

const props = defineProps({
  role: {
    type: String as PropType<"separator" | "presentation">,
    default: "separator",
  },
});
</script>

<style lang="scss" scoped></style>
