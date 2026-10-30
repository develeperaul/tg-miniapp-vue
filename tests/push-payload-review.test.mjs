import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createRouter, createMemoryHistory } from 'vue-router'

// Execute production modules, replacing only platform/service boundaries.
function load(path, mocks = {}, globals = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/import\.meta\.env\.\w+/g, '"review-only"')
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, AbortController, console: { log() {}, error() {}, warn() {} },
    require(name) {
      if (name === '../utils/pushPayload') return normalizer
      if (name === '../utils/notification') return escaping
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency ${name}`)
      return mocks[name]
    }, ...globals,
  }, { filename: path, timeout: 1500 })
  return exports
}
const normalizer = load('src/utils/pushPayload.ts')
const escaping = load('src/utils/notification.ts')
const normalize = normalizer.normalizePushPayload
const web = load('src/composables/useFirebaseMessaging.ts', {
  '../utils/native': { isNativeApp: () => true },
  '../stores/notifications': {}, 'firebase/app': {}, 'firebase/messaging': {}, '../api/main': {},
}, { window: { location: { origin: 'https://app.example.test' } } })
const path = web.getNotificationPath
const uuid = '019cb94e-73c1-710f-9208-cfef55ef91e8'
const screenshot = { data: { message: 'test2', chat_id: uuid } }

for (const [label, payload] of [
  ['exact screenshot object', screenshot],
  ['exact screenshot body JSON', { body: JSON.stringify(screenshot) }],
  ['JSON string data', { data: JSON.stringify(screenshot.data) }],
  ['nested JSON string data', { data: JSON.stringify(screenshot) }],
  ['whole JSON envelope', JSON.stringify(screenshot)],
  ['notification wrapper', { notification: { body: JSON.stringify(screenshot) } }],
]) {
  test(`normalizer and route: ${label}`, () => {
    assert.equal(normalize(payload).message, 'test2')
    assert.equal(path(payload), `/dialogs/${uuid}`)
  })
}

test('explicit data wins over conflicting notification body, including aliases', () => {
  const payload = { data: { chat_id: 'explicit', message_id: 0, message: 'actual' },
    body: JSON.stringify({ chatId: 'fallback', messageId: 'wrong', message: 'old' }) }
  assert.equal(path(payload), '/dialogs/explicit?messageId=0')
  assert.equal(normalize(payload).message, 'actual')
})

test('native canonical click extra wins over stale serialized nested data', () => {
  const payload = { data: {
    chat_id: 'canonical',
    data: JSON.stringify({ chat_id: 'legacy' }),
  } }
  assert.equal(normalize(payload).chatId, 'canonical')
  assert.equal(path(payload), '/dialogs/canonical')
})

test('identifiers are encoded once and remain a single path/query component', () => {
  assert.equal(path({ chat_id: 'a/b?c#d%20', message_id: 'x&y=+?#%' }),
    '/dialogs/a%2Fb%3Fc%23d%2520?messageId=x%26y%3D%2B%3F%23%25')
  assert.equal(path({ chat_id: 0, message_id: 0 }), '/dialogs/0?messageId=0')
})

test('malformed JSON, invalid identifiers and primitive payloads are harmless', () => {
  for (const payload of [undefined, null, false, 42, [], '{', '{"data":', 'null',
    { data: '{oops' }, { chat_id: {} }, { chat_id: [] }, { chat_id: NaN },
    { chat_id: Infinity }, { chat_id: '  ' }, '{' + 'x'.repeat(100_001)]) {
    assert.equal(path(payload), null)
  }
  assert.equal(normalize({ body: 'ordinary message' }).message, 'ordinary message')
  assert.equal(normalize({ body: '{malformed' }).message, '{malformed')
})

test('cycles and excessive nesting terminate without mutating the input', () => {
  const cycle = { chat_id: uuid, message: 'safe' }
  cycle.data = cycle
  cycle.body = cycle
  assert.equal(path(cycle), `/dialogs/${uuid}`)
  assert.equal(normalize(cycle).message, 'safe')
  assert.equal(cycle.data, cycle)
  let deep = { chat_id: uuid }
  for (let i = 0; i < 30; i++) deep = { data: deep }
  assert.equal(path(deep), null)
  assert.equal(path(Object.freeze({ data: Object.freeze({ chat_id: uuid }) })), `/dialogs/${uuid}`)
})

test('URL fallback permits same-origin routes and rejects external schemes/origins', () => {
  for (const url of ['https://evil.test/a', '//evil.test/a', 'javascript:alert(1)', 'data:text/plain,x']) {
    assert.equal(path({ data: { url } }), null)
  }
  assert.equal(path({ url: '/dialogs/one?messageId=two#anchor' }), '/dialogs/one?messageId=two#anchor')
  assert.equal(path({ chat_id: uuid, url: '/other' }), `/dialogs/${uuid}`)
})

async function harness({ authenticated = false, pinAuthenticated = false } = {}) {
  const listeners = new Map()
  const notices = []
  const window = new EventTarget()
  const document = new EventTarget()
  document.visibilityState = 'visible'
  const auth = { getAccessToken: () => authenticated ? 'review-session' : null }
  // Load the actual route table and auth guard; use the real Vue Router in memory.
  const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  const viewMocks = Object.fromEntries([...source.matchAll(/from '([^']+\.vue)'/g)].map(([, name]) => [name, {}]))
  const routerModule = load('src/router/index.ts', {
    ...viewMocks,
    '#q-app': { defineRouter: factory => factory },
    'vue-router': { createRouter, createWebHistory: createMemoryHistory },
    '../api/tokens': auth,
    '../composables/usePinCode': { usePinCode: () => ({
      isSessionAuthenticated: () => pinAuthenticated, hasPin: () => true,
      shouldForcePinSet: () => false, setForcePinSet() {},
    }) },
    '../stores/chats': { useChatsStore: () => ({ setChats: async () => {} }) },
    '../stores/main': { useMainStore: () => ({}) },
    '../composables/useFirebaseMessaging': web,
  })
  const router = routerModule.default()
  const pending = []
  const native = load('src/composables/useNativeMessaging.ts', {
    '@capacitor/core': { Capacitor: { getPlatform: () => 'android' } },
    '@capacitor-firebase/messaging': { FirebaseMessaging: {
      addListener: async (name, callback) => { listeners.set(name, callback); return { remove: async () => listeners.delete(name) } },
      createChannel: async () => {}, checkPermissions: async () => ({ receive: 'denied' }),
    } },
    vue: { ref: value => ({ value }) }, '../api/tokens': auth, '../api/main': {},
    '../stores/notifications': { useNotifyStore: () => ({ add: (...args) => notices.push(args) }) },
    './useFirebaseMessaging': web, '../utils/native': { isNativeApp: () => true },
  }, { window, document })
  const dispose = native.setupNativeMessaging({ push: destination => {
    const result = router.push(destination)
    pending.push(result)
    return result
  } })
  await new Promise(resolve => setImmediate(resolve))
  return { listeners, notices, router, dispose, document, async tap(notification) {
    listeners.get('notificationActionPerformed')({ notification })
    await Promise.all(pending)
  } }
}

for (const notification of [{ body: JSON.stringify(screenshot) }, { data: JSON.stringify(screenshot.data) }]) {
  test(`real native tap preserves auth destination: ${Object.keys(notification)[0]}`, async t => {
    const h = await harness()
    t.after(h.dispose)
    await h.tap(notification)
    assert.equal(h.router.currentRoute.value.name, 'Auth')
    assert.equal(h.router.currentRoute.value.query.redirect, `/dialogs/${uuid}`)
  })
}

test('real native tap preserves encoded destination through PIN guard', async t => {
  const h = await harness({ authenticated: true })
  t.after(h.dispose)
  await h.tap({ data: { chat_id: 'a/b', message_id: 'x&y' } })
  assert.equal(h.router.currentRoute.value.name, 'PinCode')
  assert.equal(h.router.currentRoute.value.query.redirect, '/dialogs/a%2Fb?messageId=x%26y')
})

test('native foreground renders parsed screenshot text, escapes HTML and ignores hidden callbacks', async t => {
  const h = await harness({ authenticated: true })
  t.after(h.dispose)
  const receive = notification => h.listeners.get('notificationReceived')({ notification })
  receive({ title: 'Title', body: JSON.stringify(screenshot) })
  assert.equal(h.notices[0][0], 'Title<br>test2')
  receive({ title: '<title>', data: JSON.stringify({ message: '<img onerror="x">' }) })
  assert.equal(h.notices[1][0], '&lt;title&gt;<br>&lt;img onerror=&quot;x&quot;&gt;')
  h.document.visibilityState = 'hidden'
  receive({ body: 'hidden' })
  assert.equal(h.notices.length, 2)
})

// Regression coverage for routing precedence and malformed Unicode identifiers.
test('explicit root routing must beat JSON nested under data.body', () => {
  assert.equal(path({ chat_id: 'explicit', data: { body: JSON.stringify({ chat_id: 'fallback' }) } }), '/dialogs/explicit')
})
test('malformed Unicode identifiers must not throw from notification callback', () => {
  assert.equal(path({ chat_id: '\ud800' }), null)
  assert.equal(path({ chat_id: uuid, message_id: '\udfff' }), null)
})
