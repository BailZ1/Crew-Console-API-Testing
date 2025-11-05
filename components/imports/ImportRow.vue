<template>
  <article
    class="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_220px_200px] items-center gap-2.5
           px-3.5 py-4 mx-1.5 my-2.5 rounded-2xl border border-slate-200 bg-white transition
           hover:border-slate-300 hover:shadow-[0_4px_18px_rgba(15,23,42,0.16)]"
  >
    <!-- Name + tooltip -->
    <h3 class="m-0 text-[22px] leading-tight font-extrabold text-slate-800">
      <HelpTooltip :lines="item.desc">
        {{ item.name }}
      </HelpTooltip>
    </h3>

    <!-- Download template (Material Symbols CSV icon) -->
    <button
      type="button"
      class="justify-self-center inline-flex items-center justify-center w-[72px] h-14
             rounded-xl border border-slate-200 bg-slate-50 text-slate-900 cursor-pointer
             hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed"
      aria-label="Download CSV template"
      :disabled="!item.template"
      :aria-disabled="!item.template"
      @click="item.template && $emit('download', item)"
    >
      <!-- Material Symbols 'csv' icon -->
      <span
        class="material-symbols-outlined text-[32px] leading-none"
        :class="item.template ? 'text-emerald-500' : 'text-neutral-400'"
        aria-hidden="true"
      >
        csv
      </span>
    </button>

    <!-- Upload CSV -->
    <button
      type="button"
      class="justify-self-center inline-flex items-center justify-center w-[72px] h-14
             rounded-xl border border-slate-200 bg-slate-50 text-slate-900 cursor-pointer
             hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed"
      :aria-label="`Upload CSV for ${item.name}`"
      @click="$emit('request-upload', item.key)"
      :disabled="disabled"
    >
      <svg
        viewBox="0 0 64 64"
        width="48"
        height="48"
        aria-hidden="true"
        class="shrink-0"
      >
        <path
          d="M22 30l10-12 10 12"
          fill="none"
          stroke="currentColor"
          stroke-width="4.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M32 18v26"
          fill="none"
          stroke="currentColor"
          stroke-width="4.5"
          stroke-linecap="round"
        />
        <path
          d="M14 44v6a6 6 0 0 0 6 6h24a6 6 0 0 0 6-6v-6"
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
import HelpTooltip from '~/components/common/HelpTooltip.vue'
import type { ImportRow as Row } from '~/data/importRows'

defineProps<{
  item: Row
  disabled?: boolean
}>()

defineEmits<{
  (e: 'download', row: Row): void
  (e: 'request-upload', key: Row['key']): void
}>()
</script>
