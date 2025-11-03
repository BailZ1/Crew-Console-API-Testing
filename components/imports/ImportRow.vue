<template>
  <article class="row">
    <h3 class="label" @mouseenter="$emit('show', item.key)" @mouseleave="$emit('hideDelayed', item.key)">
      <span class="tooltip-wrap" style="font-family: sans-serif" tabindex="0">
        {{ item.name }}
        <span
          class="tooltip-bubble"
          :class="{ visible: visibleTooltip === item.key }"
          role="tooltip"
          @mouseenter="$emit('cancelHide')"
          @mouseleave="$emit('hide')"
        >
          <template v-for="(line, i) in item.desc" :key="i">
            <span>{{ line }}</span
            ><br />
          </template>
          <a href="#" target="_blank" rel="noreferrer"> Watch here on how to fill out the .csv file. </a>
        </span>
      </span>
    </h3>

    <!-- Download template -->
    <button
      class="icon-btn"
      :class="{ disabled: !item.template }"
      aria-label="Download CSV template"
      @click="item.template && $emit('download', item)"
    >
      <svg viewBox="0 0 56 56" width="40" height="40" aria-hidden="true">
        <rect x="10" y="12" width="36" height="44" rx="4" fill="#E7EEF7" stroke="#9CB3D2" stroke-width="2" />
        <path d="M38 12v12h12" fill="#E7EEF7" stroke="#9CB3D2" stroke-width="2" />
        <rect x="16" y="42" width="28" height="14" rx="6" :fill="item.template ? '#22C55E' : '#A3A3A3'" />
        <text
          x="30"
          y="52"
          text-anchor="middle"
          font-size="11"
          fill="white"
          font-weight="700"
          font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        >
          CSV
        </text>
      </svg>
    </button>

    <!-- Upload CSV -->
    <button
      class="icon-btn upload"
      :aria-label="`Upload CSV for ${item.name}`"
      @click="$emit('request-upload', item.key)"
      :disabled="disabled"
    >
      <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
        <path
          d="M22 30l10-12 10 12"
          fill="none"
          stroke="currentColor"
          stroke-width="4.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M32 18v26" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" />
        <path
          d="M14 44v6a6 6 0 006 6h24a6 6 0 006-6v-6"
          fill="none"
          stroke="currentColor"
          stroke-width="4.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </article>
</template>

<script setup lang="ts">
import type { ImportRow as Row } from "~/data/importRows"

const props = defineProps<{
  item: Row
  disabled?: boolean
  visibleTooltip: string | null
}>()

defineEmits<{
  (e: "show", key: Row["key"]): void
  (e: "hideDelayed", key: Row["key"]): void
  (e: "cancelHide"): void
  (e: "hide"): void
  (e: "download", row: Row): void
  (e: "request-upload", key: Row["key"]): void
}>()
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 1fr 220px 200px;
  align-items: center;
  gap: 10px;
  padding: 18px 14px;
  margin: 10px 6px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  transition: 0.15s;
}
.row:hover {
  border-color: #d7dbe3;
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.08);
}
.label {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  color: #243042;
  font-weight: 800;
}
.icon-btn {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #0b1526;
  cursor: pointer;
}
.icon-btn:hover {
  background: #f3f6fb;
}
.icon-btn.upload {
  font-size: 0;
}
.icon-btn.disabled {
  opacity: 0.45;
  pointer-events: none;
}

/* Tooltip */
.tooltip-wrap {
  position: relative;
  display: inline-block;
}
.tooltip-bubble {
  position: absolute;
  left: -20px;
  top: 42px;
  width: 600px;
  max-width: 70vw;
  background: #000;
  color: #fff;
  padding: 18px 20px;
  border-radius: 24px;
  font-size: 18px;
  line-height: 1.45;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 30;
  pointer-events: none;
}
.tooltip-bubble.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.tooltip-bubble::after {
  content: "";
  position: absolute;
  top: -18px;
  right: 160px;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-bottom: 18px solid #000;
}
.tooltip-bubble a {
  color: #60a5fa;
  text-decoration: underline;
}
@media (max-width: 820px) {
  .row {
    grid-template-columns: 1fr auto auto;
  }
  .tooltip-bubble {
    width: min(90vw, 600px);
    left: -6px;
  }
}
</style>
