import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createRouter, createMemoryHistory } from 'vue-router'

// Execute the actual view setup and success handler; no PIN entry or PIN storage.
function harness({ redirect, saved, idle = true, location = { origin: 'https://localhost' } } = {}) {
  const storage = new Map(saved === undefined ? [] : [['redirectAfterPin', saved]])
  const pushes = []
  const events = []
  let finishNavigation
  const navigation = new Promise(resolve => { finishNavigation = resolve })
  const idleKey = Symbol('idle-timeout')
  const mocks = {
    vue: {
      computed: get => ({ get value() { return get() } }),
      inject: key => {
        assert.equal(key, idleKey)
        return idle ? { restartTimer: () => events.push('restart') } : undefined
      },
    },
    'vue-router': {
      useRoute: () => ({ query: { redirect } }),
      useRouter: () => ({ push: destination => {
        pushes.push(destination)
        events.push('push')
        return navigation
      } }),
    },
    '../components/PinCode.vue': {},
    '../composables/useIdleTimeout': { IDLE_TIMEOUT_KEY: idleKey },
  }
  const sfc = readFileSync(new URL('../src/views/PinCodeView.vue', import.meta.url), 'utf8')
  assert.match(sfc, /@success="handleSuccess"/)
  const script = sfc.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const exports = {}
  vm.runInNewContext(ts.transpileModule(script + '\nexports.success = handleSuccess;', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL,
    require: name => {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`)
      return mocks[name]
    },
    window: { location },
    sessionStorage: {
      getItem: key => { assert.equal(key, 'redirectAfterPin'); return storage.get(key) ?? null },
      removeItem: key => { assert.equal(key, 'redirectAfterPin'); storage.delete(key) },
    },
  })
  return { success: exports.success, pushes, events, storage,
    finish: async () => { finishNavigation(); await navigation; await Promise.resolve() } }
}

test('new push destination wins over stale home and clears saved idle redirect', async () => {
  const h = harness({ redirect: '/dialog/chat-new?from=push#latest', saved: '/' })
  h.success()
  assert.deepEqual(h.pushes, ['/dialog/chat-new?from=push#latest'])
  assert.equal(h.storage.size, 0)
  assert.deepEqual(h.events, ['push'], 'Timer must wait until navigation finishes')
  await h.finish()
  assert.deepEqual(h.events, ['push', 'restart'])
})

test('missing new push restores full old idle destination', async () => {
  const h = harness({ saved: '/dialogs?filter=unread#position' })
  h.success()
  assert.deepEqual(h.pushes, ['/dialogs?filter=unread#position'])
  assert.equal(h.storage.size, 0)
  await h.finish()
  assert.deepEqual(h.events, ['push', 'restart'])
})

const invalid = [undefined, null, '', ['/', '/dialog/chat-new'], 42,
  'https://external.test/dialog/1', 'https://localhost/dialog/1',
  '//external.test/dialog/1', '/\\external.test/dialog/1',
  'javascript:alert(1)', 'data:text/html,test', 'dialog/1',
  '/pin', '/pin?redirect=/dialog/1#x', '/auth', '/auth?redirect=/dialog/1',
  '/dialog/../pin', '/%2e%2e/auth']

for (const redirect of invalid) {
  test(`invalid push redirect ${JSON.stringify(redirect)} falls back to saved idle route`, async () => {
    const h = harness({ redirect, saved: '/dialogs?old=idle' })
    h.success()
    assert.deepEqual(h.pushes, ['/dialogs?old=idle'])
    assert.equal(h.storage.size, 0)
    await h.finish()
    assert.deepEqual(h.events, ['push', 'restart'])
  })
  test(`invalid saved redirect ${JSON.stringify(redirect)} falls back home`, async () => {
    const h = harness({ redirect: '/pin', saved: redirect })
    h.success()
    assert.deepEqual(h.pushes, ['/'])
    assert.equal(h.storage.size, 0)
    await h.finish()
  })
}

test('same-origin protocol-relative URL is normalized to an internal route', async () => {
  const h = harness({ redirect: '//localhost/dialog/chat-new?from=push#latest', saved: '/' })
  h.success()
  assert.deepEqual(h.pushes, ['/dialog/chat-new?from=push#latest'])
  await h.finish()
})

test('successful navigation also works without idle provider', async () => {
  const h = harness({ redirect: '/dialog/chat-new', idle: false })
  h.success()
  await h.finish()
  assert.deepEqual(h.events, ['push'])
})

test('Capacitor opaque origin preserves internal push and rejects a different host', async () => {
  const base = new URL('capacitor://localhost/pin?mode=enter')
  assert.equal(base.origin, 'null')
  const location = { href: base.href, origin: base.origin }
  for (const [redirect, expected] of [
    ['/dialog/chat-new?from=push#latest', '/dialog/chat-new?from=push#latest'],
    ['//localhost/dialog/chat-new', '/dialog/chat-new'],
    ['//evil/dialog/chat-new', '/dialogs?old=idle'],
    ['/PIN/', '/dialogs?old=idle'],
  ]) {
    const h = harness({ redirect, saved: '/dialogs?old=idle', location })
    h.success()
    assert.deepEqual(h.pushes, [expected], `Redirect: ${redirect}`)
    assert.equal(h.storage.size, 0)
    assert.deepEqual(h.events, ['push'])
    await h.finish()
    assert.deepEqual(h.events, ['push', 'restart'])
  }
})

// Vue Router defaults match case-insensitively and permit trailing slashes.
// Check against its matcher rather than assuming URL.pathname equality is enough.
const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: '/', component: {} },
  { path: '/pin', name: 'PinCode', component: {} },
  { path: '/auth', name: 'Auth', component: {} },
] })
for (const redirect of ['/pin/', '/PIN', '/auth/', '/AUTH?next=/']) {
  test(`router-equivalent lock route ${redirect} must not loop after success`, async () => {
    assert.ok(['PinCode', 'Auth'].includes(router.resolve(redirect).name))
    const h = harness({ redirect, saved: '/' })
    h.success()
    assert.deepEqual(h.pushes, ['/'])
    await h.finish()
  })
}
