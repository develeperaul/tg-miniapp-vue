import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'
import * as pinia from 'pinia'

// Real store + Vue refs + Pinia; only the API transport is deferred.
function harness(getChats = async () => ({ data: [] })) {
  const requests = []
  const mocks = {
    vue, pinia,
    '../api/chats': {
      getChats,
      getMessgs: chat => new Promise((resolve, reject) => {
        requests.push({ chat, resolve: data => resolve({ data }), reject })
      }),
    },
  }
  const exports = {}
  const source = readFileSync(new URL('../src/stores/chats.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`)
      return mocks[name]
    },
  })
  const store = exports.useChatsStore(pinia.createPinia())
  return { store, requests, ids: () => Array.from(store.messages, message => message.uuid) }
}
const rows = id => [{ uuid: id, text: id }]

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

// Execute the entire real DialogView setup, with lifecycle and transport controlled.
function dialogHarness({ messageId, delayedTick = false } = {}) {
  let mounted
  const beforeUnmount = []
  const unmounted = []
  const loads = []
  const streams = []
  const events = []
  const ticks = []
  const sending = deferred()
  const available = fn => Object.assign(fn, { isAvailable: () => true })
  const mocks = {
    vue: { ...vue,
      onMounted: fn => { mounted = fn },
      onBeforeUnmount: fn => beforeUnmount.push(fn),
      onUnmounted: fn => unmounted.push(fn),
      nextTick: () => {
        if (!delayedTick) return Promise.resolve()
        const tick = deferred(); ticks.push(tick); return tick.promise
      },
    },
    'vue-router': {
      useRoute: () => ({ params: { uuid: 'A' }, query: { messageId } }),
      useRouter: () => ({ back() {} }),
    },
    '../stores/dialogs': { useDialogsStore: () => ({}) },
    '../components/FileTile.vue': {},
    pinia: { storeToRefs: () => ({ profile: vue.ref({ uuid: 'review-account' }) }) },
    '@telegram-apps/sdk': { backButton: {
      mount: available(() => events.push('mountBack')),
      show: available(() => events.push('showBack')),
      hide: available(() => events.push('hideBack')),
      onClick: available(() => { events.push('attachBack'); return () => events.push('detachBack') }),
    } },
    '../api/chats': { sendMess: () => sending.promise },
    '../stores/main': { useMainStore: () => ({ load: false }) },
    '../stores/chats': { useChatsStore: () => ({ setMessgs: chat => {
      const pending = deferred(); loads.push({ chat, ...pending }); return pending.promise
    } }) },
    '../api/main': {},
    '../composables/useAttachmentPreview': { useAttachmentPreview: () => ({ clear() {}, release() {} }) },
    dayjs: {}, '../utils/date': {},
  }
  const sfc = readFileSync(new URL('../src/views/DialogView.vue', import.meta.url), 'utf8')
  const script = sfc.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    .replace(/import\.meta\.env\.VITE_API_URL!?/g, '"https://review.invalid"')
  const exports = {}
  vm.runInNewContext(ts.transpileModule(script + '\nexports.send = send;', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => { assert.ok(Object.hasOwn(mocks, name), name); return mocks[name] },
    defineProps: () => ({ uuid: 'A' }),
    console: { log() {}, error() {} },
    document: { querySelectorAll: () => { events.push('queryDOM'); return [] } },
    EventSource: class {
      constructor() { streams.push(this) }
      addEventListener() {}
      close() { events.push('closeSSE') }
    },
  })
  return { loads, streams, events, ticks, send: exports.send, finishSend: sending.resolve,
    mount: () => mounted(),
    unmount: () => { beforeUnmount.forEach(fn => fn()); unmounted.forEach(fn => fn()) },
  }
}

test('DialogView pending mount cannot attach SSE or back handler after unmount', async () => {
  const h = dialogHarness()
  const mount = h.mount()
  h.unmount()
  h.loads[0].resolve()
  await mount
  assert.equal(h.streams.length, 0)
  assert.deepEqual(h.events, ['hideBack'])
})

for (const messageId of [undefined, 'target-message']) {
  test(`DialogView nextTick continuation is inert after unmount (messageId=${messageId})`, async () => {
    const h = dialogHarness({ messageId, delayedTick: true })
    const mount = h.mount()
    h.loads[0].resolve()
    await new Promise(setImmediate)
    assert.equal(h.ticks.length, 1)
    h.unmount()
    h.ticks[0].resolve()
    await mount
    assert.equal(h.streams.length, 0)
    assert.deepEqual(h.events, ['hideBack'])
  })
}

test('DialogView cleans mounted resources and ignores queued SSE after unmount', async () => {
  const h = dialogHarness()
  const mount = h.mount()
  h.loads[0].resolve()
  await mount
  assert.equal(h.streams.length, 1)
  const callback = h.streams[0].onmessage
  h.unmount()
  await callback({ data: 'changed' })
  assert.equal(h.loads.length, 1)
  assert.ok(h.events.includes('detachBack'))
  assert.ok(h.events.includes('closeSSE'))
})

test('DialogView in-flight SSE cannot schedule scrolling after unmount', async () => {
  const h = dialogHarness()
  const mount = h.mount()
  h.loads[0].resolve()
  await mount
  const update = h.streams[0].onmessage({ data: 'changed' })
  assert.equal(h.loads.length, 2)
  h.unmount()
  h.loads[1].resolve()
  await update
  assert.equal(h.streams.length, 1)
  assert.equal(h.events.filter(event => event === 'closeSSE').length, 1)
})

test('DialogView completed send after unmount must not request old chat again', async () => {
  const h = dialogHarness()
  const send = h.send()
  h.unmount()
  h.finishSend()
  await send
  assert.equal(h.loads.length, 0, 'Old A owner must not supersede the new B request')
})

test('switching A to push B clears A immediately and ignores A resolving before B', async () => {
  const h = harness()
  const initial = h.store.setMessgs('A')
  h.requests[0].resolve(rows('A-visible'))
  await initial
  const refreshA = h.store.setMessgs('A')
  assert.deepEqual(h.ids(), ['A-visible'], 'Same-chat refresh retains current messages')
  const openB = h.store.setMessgs('B')
  assert.deepEqual(h.ids(), [], 'Never show A messages while B is pending')
  assert.deepEqual(h.requests.map(request => request.chat), ['A', 'A', 'B'])
  h.requests[1].resolve(rows('A-late'))
  await refreshA
  assert.deepEqual(h.ids(), [])
  h.requests[2].resolve(rows('B-current'))
  await openB
  assert.deepEqual(h.ids(), ['B-current'])
})

test('late A cannot overwrite already displayed B', async () => {
  const h = harness()
  const a = h.store.setMessgs('A')
  const b = h.store.setMessgs('B')
  h.requests[1].resolve(rows('B-current'))
  await b
  h.requests[0].resolve(rows('A-late'))
  await a
  assert.deepEqual(h.ids(), ['B-current'])
})

test('overlapping refreshes of the same chat keep the newest result', async () => {
  const h = harness()
  const older = h.store.setMessgs('B')
  const newer = h.store.setMessgs('B')
  h.requests[1].resolve(rows('B-new'))
  await newer
  h.requests[0].resolve(rows('B-old'))
  await older
  assert.deepEqual(h.ids(), ['B-new'])
})

test('A to B to A ignores both superseded generations, including matching chat ID', async () => {
  const h = harness()
  const oldA = h.store.setMessgs('A')
  const b = h.store.setMessgs('B')
  const newA = h.store.setMessgs('A')
  h.requests[2].resolve(rows('A-new'))
  await newA
  h.requests[0].resolve(rows('A-old'))
  h.requests[1].resolve(rows('B-late'))
  await Promise.all([oldA, b])
  assert.deepEqual(h.ids(), ['A-new'])
})

test('failed B leaves old A cleared and a later retry can populate B', async () => {
  const h = harness()
  const a = h.store.setMessgs('A')
  h.requests[0].resolve(rows('A-visible'))
  await a
  const b = h.store.setMessgs('B')
  const error = new Error('review transport failure')
  const rejected = assert.rejects(b, value => value === error)
  h.requests[1].reject(error)
  await rejected
  assert.deepEqual(h.ids(), [])
  const retry = h.store.setMessgs('B')
  h.requests[2].resolve(rows('B-retry'))
  await retry
  assert.deepEqual(h.ids(), ['B-retry'])
})

test('failure of obsolete A does not clear B or prevent subsequent refresh', async () => {
  const h = harness()
  const a = h.store.setMessgs('A')
  const rejected = assert.rejects(a, /obsolete A failed/)
  const b = h.store.setMessgs('B')
  h.requests[1].resolve(rows('B-current'))
  await b
  h.requests[0].reject(new Error('obsolete A failed'))
  await rejected
  assert.deepEqual(h.ids(), ['B-current'])
  const refresh = h.store.setMessgs('B')
  h.requests[2].resolve(rows('B-refreshed'))
  await refresh
  assert.deepEqual(h.ids(), ['B-refreshed'])
})

 test('chat list refresh keeps newest result when older request finishes last', async () => {
  const pending = []
  const { store } = harness(() => new Promise(resolve => pending.push(resolve)))
  const first = store.setChats()
  const second = store.setChats()
  assert.equal(store.chats.loading, true)
  pending[1]({ data: [{ uuid: 'new-chat' }] })
  await second
  pending[0]({ data: [] })
  await first
  assert.equal(store.chats.data[0].uuid, 'new-chat')
  assert.equal(store.chats.loading, false)
})

test('chat list refresh failure preserves loaded chats and releases loading', async () => {
  const { store } = harness(async () => { throw new Error('offline') })
  store.chats.data = [{ uuid: 'cached-chat' }]
  await assert.rejects(store.setChats(), /offline/)
  assert.equal(store.chats.data[0].uuid, 'cached-chat')
  assert.equal(store.chats.loading, false)
})
