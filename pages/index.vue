<template>
  <main class="container">
    <!-- Header -->
    <header class="header">
      <div>
        <h1>Crew Console · Equipment</h1>
        <p class="subtitle">Search and browse equipment via your server-side proxy</p>
      </div>
      <span v-if="meta" class="pill">
        Page {{ meta.current_page ?? 1 }} / {{ meta.last_page ?? 1 }}
      </span>
    </header>

    <!-- Controls -->
    <form class="panel controls" @submit.prevent="run">
      <label class="field">
        <span>Query</span>
        <input v-model="query" placeholder="Search term (optional)" />
      </label>

      <label class="field sm">
        <span>Page</span>
        <input v-model.number="page" type="number" min="1" />
      </label>

      <label class="field sm">
        <span>Per page</span>
        <input v-model.number="perPage" type="number" min="1" />
      </label>

      <div class="actions">
        <button class="btn primary" :disabled="pending">Search</button>
        <button class="btn ghost" type="button" @click="reset" :disabled="pending">Reset</button>

        <div class="spacer" />

        <label class="switch">
          <input type="checkbox" v-model="asCards" />
          <span>Cards view</span>
        </label>
      </div>
    </form>

    <!-- Status -->
    <div class="status">
      <span v-if="pending" class="muted">Loading…</span>
      <span v-else-if="error" class="error">Error: {{ error }}</span>
      <span v-else class="muted">
        <strong>{{ items.length }}</strong> item(s)
        <span v-if="meta?.total"> • total {{ meta.total }}</span>
      </span>
    </div>

    <!-- Results -->
    <section v-if="!error" class="results">
      <!-- Cards -->
      <div v-if="asCards" class="card-grid" v-show="items.length">
        <article class="card" v-for="(it, i) in items" :key="i">
          <h3 class="card-title">
            {{ it.name ?? it.title ?? it.code ?? it.id ?? `Item #${i+1}` }}
          </h3>
          <dl class="kv">
            <template v-for="k in columns" :key="k">
              <dt>{{ k }}</dt>
              <dd>{{ formatValue(it[k]) }}</dd>
            </template>
          </dl>
        </article>
      </div>

      <!-- Table -->
      <div v-else>
        <div v-if="items.length" class="panel table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th v-for="c in columns" :key="c">{{ c }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, r) in items" :key="r">
                <td v-for="c in columns" :key="c">{{ formatValue(row[c]) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted pad">No equipment found (try a different query).</p>
      </div>
    </section>

    <!-- Pagination -->
    <nav v-if="meta?.current_page && meta?.last_page" class="pager">
      <button class="btn" :disabled="pending || meta.current_page <= 1" @click="go(meta.current_page - 1)">
        ← Prev
      </button>
      <button class="btn" :disabled="pending || meta.current_page >= meta.last_page" @click="go(meta.current_page + 1)">
        Next →
      </button>
    </nav>

    <!-- Raw -->
    <details class="panel raw">
      <summary>Raw response</summary>
      <pre>{{ prettyJson }}</pre>
    </details>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const query   = ref('')
const page    = ref(1)
const perPage = ref(10)
const asCards = ref(true)

const pending = ref(false)
const error   = ref<string | null>(null)
const resp    = ref<any>(null)

const items = computed<any[]>(() => resp.value?.data ?? [])
const meta  = computed<any>(() => resp.value?.meta ?? null)
const prettyJson = computed(() => JSON.stringify(resp.value ?? {}, null, 2))

const columns = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) {
    if (it && typeof it === 'object') Object.keys(it).forEach(k => set.add(k))
  }
  const all = Array.from(set)
  const priority = ['id','name','code','status','type','serial','serialNumber','category']
  all.sort((a,b) => {
    const ia = priority.indexOf(a); const ib = priority.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b)
  })
  return all
})

function formatValue(v: any) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

async function run () {
  pending.value = true
  error.value = null
  try {
    resp.value = await $fetch('/api/crew/equipment', {
      method: 'POST',
      query: { page: page.value, per_page: perPage.value },
      body:  { query: query.value }
    })
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Request failed'
    resp.value = null
  } finally {
    pending.value = false
  }
}

function reset() {
  query.value = ''
  page.value = 1
  perPage.value = 10
  run()
}
function go(p: number) { page.value = p; run() }
run()
</script>

<style scoped>
/* --- Theme (light + dark) --- */
:root {
  color-scheme: light dark;
  --bg: #f7f8fb;
  --text: #0f172a;
  --muted: #5b657a;
  --panel: #ffffff;
  --line: #e7e9f2;
  --brand: #3b82f6;
  --brand-600: #2563eb;
  --danger: #ef4444;
  --code: #0f172a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1020;
    --text: #e8ecf1;
    --muted: #a8b0bd;
    --panel: #11172c;
    --line: #223056;
    --brand: #60a5fa;
    --brand-600: #3b82f6;
    --danger: #ff6b6b;
    --code: #e8ecf1;
  }
}

/* --- Layout --- */
.container {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 22px 60px;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

.header {
  display: flex; align-items: flex-end; gap: 16px; justify-content: space-between;
  margin-bottom: 18px;
}
.header h1 { font-size: 28px; line-height: 1.1; margin: 0; }
.subtitle { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
.pill {
  background: var(--panel); border: 1px solid var(--line); color: var(--muted);
  padding: 6px 12px; border-radius: 999px; font-size: 13px; white-space: nowrap;
}

/* --- Panels --- */
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.06);
}

/* --- Controls --- */
.controls {
  display: grid;
  grid-template-columns: 1fr repeat(2, 140px) 1fr;
  gap: 14px;
  padding: 16px;
  align-items: end;
}
.field { display: grid; gap: 8px; }
.field span { font-size: 12px; color: var(--muted); }
.field input {
  height: 40px; border-radius: 10px; border: 1px solid var(--line);
  background: transparent; color: var(--text); padding: 0 12px; outline: none;
}
.field input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand) 25%, transparent); }
.field.sm { width: 140px; }
.actions { display: flex; align-items: center; gap: 10px; }
.spacer { flex: 1; }
.switch { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; }
.switch input { transform: scale(1.05); }

/* --- Buttons --- */
.btn {
  height: 40px; padding: 0 16px; border-radius: 10px; font-weight: 600;
  border: 1px solid var(--line); background: var(--panel); color: var(--text);
  cursor: pointer; transition: transform .02s ease, background .2s ease, border-color .2s ease;
}
.btn:hover { border-color: color-mix(in oklab, var(--brand) 40%, var(--line)); }
.btn:active { transform: translateY(1px); }
.btn.primary { background: var(--brand); border-color: var(--brand-600); color: white; }
.btn.primary:hover { background: var(--brand-600); }
.btn.ghost { background: transparent; }

/* --- Status --- */
.status { margin: 14px 4px; }
.muted { color: var(--muted); }
.error { color: var(--danger); }
.pad { padding: 8px 2px; }

/* --- Results --- */
.results { margin-top: 8px; }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card { padding: 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); box-shadow: 0 2px 10px rgba(0,0,0,.05); }
.card-title { margin: 0 0 10px; font-size: 16px; }
.kv { display: grid; grid-template-columns: 1fr 2fr; gap: 6px 10px; font-size: 13px; }
.kv dt { color: var(--muted); }
.kv dd { margin: 0; white-space: pre-wrap; }

/* Table */
.table-wrap { padding: 0; overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
.table thead { background: color-mix(in oklab, var(--brand) 6%, transparent); }
.table th, .table td { padding: 12px 14px; border-bottom: 1px solid var(--line); font-size: 14px; text-align: left; vertical-align: top; }
.table tbody tr:nth-child(odd) { background: color-mix(in oklab, var(--panel) 80%, var(--bg)); }

/* Pager */
.pager { display: flex; gap: 12px; justify-content: center; margin: 18px 0; }

/* Raw */
.raw { margin-top: 16px; }
.raw summary { cursor: pointer; color: var(--muted); padding: 10px 12px; }
.raw pre {
  margin: 0; padding: 14px; border-top: 1px solid var(--line);
  background: #0b1328; color: #e8ecf1; border-radius: 0 0 14px 14px;
  white-space: pre; overflow: auto;
}
@media (prefers-color-scheme: light) {
  .raw pre { background: #0e1222; color: #eef3ff; }
}
</style>
