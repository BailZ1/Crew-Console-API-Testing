<!-- components/common/HelpTooltip.vue -->
<template>
  <span
    class="relative inline-flex items-center"
    @mouseenter="onTriggerEnter"
    @mouseleave="onTriggerLeave"
    @focusin="onTriggerEnter"
    @focusout="onTriggerLeave"
  >
    <!-- Trigger (label text) -->
    <span
      class="inline-flex cursor-help items-center focus:outline-none"
      tabindex="0"
    >
      <slot />
    </span>

    <!-- Bubble -->
    <span
      class="absolute left-0 top-full mt-2 w-[600px] max-w-[70vw]
             rounded-2xl bg-slate-900 px-5 py-4 text-base leading-relaxed text-white
             shadow-xl z-30
             opacity-0 translate-y-1 pointer-events-none
             transition-opacity transition-transform duration-150 ease-out"
      :class="open ? 'opacity-100 translate-y-0 pointer-events-auto' : ''"
      role="tooltip"
      @mouseenter="onBubbleEnter"
      @mouseleave="onBubbleLeave"
    >
      <!-- Default content (concise lines + link) -->
      <slot name="content">
        <template
          v-for="(line, i) in lines"
          :key="i"
        >
          <span class="block">{{ line }}</span>
        </template>

        <a
          v-if="linkHref"
          :href="linkHref"
          target="_blank"
          rel="noreferrer"
          class="mt-2 inline-block text-sm text-sky-400 underline"
        >
          {{ linkText }}
        </a>
      </slot>

      <!-- Arrow -->
      <span
        class="pointer-events-none absolute -top-3 left-6 h-0 w-0
               border-l-[10px] border-l-transparent
               border-r-[10px] border-r-transparent
               border-b-[10px] border-b-slate-900"
      />
    </span>
  </span>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    lines?: string[]
    linkHref?: string | null
    linkText?: string
    closeDelay?: number
  }>(),
  {
    lines: () => [],
    linkHref: '#',
    linkText: 'Watch here on how to fill out the .csv file.',
    closeDelay: 120,
  }
)

const open = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const clearHideTimer = () => {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

const scheduleHide = () => {
  clearHideTimer()
  hideTimer = setTimeout(() => {
    open.value = false
    hideTimer = null
  }, props.closeDelay)
}

const onTriggerEnter = () => {
  clearHideTimer()
  open.value = true
}

const onTriggerLeave = () => {
  scheduleHide()
}

const onBubbleEnter = () => {
  clearHideTimer()
}

const onBubbleLeave = () => {
  scheduleHide()
}

onBeforeUnmount(clearHideTimer)
</script>
