import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the real TS module with isolated platform boundaries, without a bundler.
function load(path, mocks, globals = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_API_URL', '"https://api.example.test"')
    .replace(/import\.meta\.env\.\w+/g, '"test-only"')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, require: name => {
      if (name === '../utils/pushPayload') return load('src/utils/pushPayload.ts', {})
      assert.ok(name in mocks, `Unexpected dependency: ${name}`)
      return mocks[name]
    }, File, Blob, FormData, AbortController, URL, console, ...globals,
  }, { filename: path })
  return exports
}

function camera(native, plugin, fetch, sheet = {}) {
  return load('src/composables/useNativeCamera.ts', {
    '@capacitor/action-sheet': { ActionSheet: sheet, ActionSheetButtonStyle: { Cancel: 'CANCEL' } },
    '@capacitor/camera': { Camera: plugin, CameraResultType: { Uri: 'uri' }, CameraSource: { Camera: 'camera', Photos: 'photos' } },
    '../utils/native': { isNativeApp: () => native },
  }, { fetch })
}

test('web camera path does not invoke native plugin', async () => {
  assert.equal(await camera(false, {}, () => assert.fail()).takeNativePhoto(), null)
})

test('camera requests permission and converts URI into uploadable image File', async () => {
  const api = camera(true, {
    checkPermissions: async () => ({ camera: 'prompt' }),
    requestPermissions: async options => {
      assert.deepEqual(Array.from(options.permissions), ['camera'])
      return { camera: 'granted' }
    },
    getPhoto: async options => {
      assert.equal(options.source, 'camera')
      assert.equal(options.resultType, 'uri')
      return { webPath: 'capacitor://photo', format: 'jpeg' }
    },
  }, async path => {
    assert.equal(path, 'capacitor://photo')
    return { ok: true, blob: async () => new Blob(['photo bytes']) }
  })
  const file = await api.takeNativePhoto()
  assert.ok(file instanceof File)
  assert.equal(file.type, 'image/jpeg')
  assert.equal(await file.text(), 'photo bytes')
})

test('camera denial rejects without capture; cancellation returns null', async () => {
  await assert.rejects(camera(true, {
    checkPermissions: async () => ({ camera: 'denied' }),
    getPhoto: () => assert.fail('Denied camera must not open'),
  }).takeNativePhoto(), /камере/)
  assert.equal(await camera(true, {
    checkPermissions: async () => ({ camera: 'granted' }),
    getPhoto: async () => { throw new Error('User cancelled photos app') },
  }).takeNativePhoto(), null)
})

test('unreadable camera image rejects rather than emitting an empty attachment', async () => {
  await assert.rejects(camera(true, {
    checkPermissions: async () => ({ camera: 'granted' }),
    getPhoto: async () => ({ webPath: 'capacitor://missing', format: 'jpeg' }),
  }, async () => ({ ok: false })).takeNativePhoto(), /фотографию/)
})

for (const outcome of ['success', 'http-error', 'network-error']) {
  test(`upload handles ${outcome} and reports progress`, async () => {
    const progress = []
    class XHR {
      upload = {}
      status = outcome === 'http-error' ? 500 : 201
      responseText = '{"data":{"uuid":"media-1","url":"https://media.example.test/photo.jpeg"}}'
      open() {}
      setRequestHeader() {}
      send() {
        this.upload.onprogress({ lengthComputable: true, loaded: 1, total: 2 })
        queueMicrotask(() => outcome === 'network-error' ? this.onerror() : this.onload())
      }
    }
    const api = load('src/api/main.ts', {
      './index': { api: {} }, './tokens': { getAccessToken: () => 'fake-token' },
    }, { XMLHttpRequest: XHR })
    const pending = api.uploadFileWithProgress(new File(['x'], 'photo.jpeg'), value => progress.push(value))
    if (outcome === 'success') assert.equal((await pending).data.uuid, 'media-1')
    else await assert.rejects(pending, /Upload failed/)
    assert.deepEqual(progress, [50])
  })
}

for (const response of ['not-json', '{}', '{"data":{"uuid":42}}']) {
  test(`upload rejects invalid HTTP 200 response: ${response}`, async () => {
    class XHR {
      upload = {}
      status = 200
      responseText = response
      open(method, url) { assert.equal(method, 'POST'); assert.equal(url, 'https://api.example.test/api/temp-media') }
      setRequestHeader(name, value) { assert.equal(name, 'Authorization'); assert.equal(value, 'Bearer fake-token') }
      send(body) { assert.equal(body.get('media').name, 'photo.jpeg'); queueMicrotask(() => this.onload()) }
    }
    const api = load('src/api/main.ts', {
      './index': { api: {} }, './tokens': { getAccessToken: () => 'fake-token' },
    }, { XMLHttpRequest: XHR })
    await assert.rejects(api.uploadFileWithProgress(new File(['x'], 'photo.jpeg')), /Invalid upload response/)
  })
}

for (const platform of ['ios', 'android']) {
  test(`${platform} registers Firebase FCM token, deduplicates and removes listeners`, async () => {
    const listeners = new Map()
    const registrations = []
    let channels = 0
    let removed = 0
    let account = 'account-a'
    let deletes = 0
    let deliveredClears = 0
    let failDelete = false
    const destinations = []
    const window = new EventTarget()
    const document = new EventTarget()
    document.visibilityState = 'visible'
    const api = load('src/composables/useNativeMessaging.ts', {
      '@capacitor/core': { Capacitor: { getPlatform: () => platform } },
      '@capacitor-firebase/messaging': { FirebaseMessaging: {
        addListener: async (name, fn) => { listeners.set(name, fn); return { remove: async () => { removed++ } } },
        createChannel: async () => { channels++ },
        checkPermissions: async () => ({ receive: 'granted' }),
        getToken: async () => ({ token: 'firebase-fcm-token' }),
        deleteToken: async () => { deletes++; if (failDelete) throw new Error('offline') },
        removeAllDeliveredNotifications: async () => { deliveredClears++ },
      } },
      vue: { ref: value => ({ value }) },
      '../api/tokens': { getAccessToken: () => account },
      '../api/main': { setFRB: async (token, options) => { registrations.push({ token, options }) } },
      '../stores/notifications': { useNotifyStore: () => ({ add() {} }) },
      './useFirebaseMessaging': { getNotificationPath: () => '/dialogs/chat-1?messageId=message-2' },
      '../utils/notification': { escapeHtml: value => value },
      '../utils/native': { isNativeApp: () => true },
    }, { window, document })
    const dispose = api.setupNativeMessaging({ push: async path => { destinations.push(path) } })
    assert.equal(await api.requestNativeNotificationPermission(), true)
    assert.equal(registrations.length, 1)
    assert.equal(registrations[0].token, 'firebase-fcm-token')
    assert.equal(registrations[0].options.headers.Authorization, 'Bearer account-a')
    assert.equal(channels, platform === 'android' ? 1 : 0)
    listeners.get('tokenReceived')({ token: 'apns-token-must-not-be-used' })
    await api.requestNativeNotificationPermission()
    assert.equal(registrations.length, 1)
    account = 'account-b'
    failDelete = true
    window.dispatchEvent(new Event('auth-token-changed'))
    assert.equal(await api.requestNativeNotificationPermission(), false)
    assert.equal(registrations.length, 1, 'Cleanup failure must block binding the old token to another account')
    failDelete = false
    assert.equal(await api.requestNativeNotificationPermission(), true)
    assert.equal(registrations.length, 2)
    assert.equal(registrations[1].options.headers.Authorization, 'Bearer account-b')
    assert.equal(deliveredClears, 1)
    account = null
    window.dispatchEvent(new Event('auth-token-changed'))
    assert.equal(await api.requestNativeNotificationPermission(), false)
    assert.equal(deliveredClears, 2)
    assert.ok(deletes >= 3)
    listeners.get('notificationActionPerformed')({ notification: { data: { chat_id: 'chat-1', message_id: 'message-2' } } })
    assert.equal(destinations.at(-1), '/dialogs/chat-1?messageId=message-2',
      'Logged-out notification click must reach router auth guard to preserve its destination')
    dispose()
    assert.equal(removed, 3)
    assert.equal(await api.requestNativeNotificationPermission(), false)
  })
}

test('notification paths encode identifiers and reject external links; native skips browser Firebase', async () => {
  const api = load('src/composables/useFirebaseMessaging.ts', {
    '../utils/native': { isNativeApp: () => true },
    '../utils/notification': { escapeHtml: value => value },
    '../stores/notifications': { useNotifyStore: () => assert.fail() },
    'firebase/app': { initializeApp: () => assert.fail('Native must not initialize browser Firebase') },
    'firebase/messaging': {}, '../api/main': {},
  }, { window: { location: { origin: 'https://app.example.test' } } })
  assert.equal(api.getNotificationPath({ chat_id: 'a/b', message_id: 'x&y' }), '/dialogs/a%2Fb?messageId=x%26y')
  assert.equal(api.getNotificationPath({ url: 'https://evil.example/dialogs/1' }), null)
  assert.equal(api.getNotificationPath({ url: '//evil.example/dialogs/1' }), null)
  assert.equal(api.getNotificationPath({ url: '/dialogs/1?messageId=2' }), '/dialogs/1?messageId=2')
  assert.equal(await api.setupFirebaseMessaging(), false)
  api.setupMessageListener()
})

test('late 401 from previous account does not redirect the current account', async () => {
  let options
  let redirects = 0
  load('src/api/index.ts', {
    ky: { __esModule: true, default: { create: value => { options = value; return {} } } },
    './tokens': { getAccessToken: () => 'account-b', cleanTokensData: () => assert.fail('Must not clear new session') },
    '../stores/notifications': { useNotifyStore: () => ({ add() {} }) },
    '../router': { __esModule: true, appRouter: { push: () => { redirects++ } }, default: { push: () => { redirects++ } } },
  })
  await options.hooks.afterResponse[0](
    new Request('https://api.example.test', { headers: { Authorization: 'Bearer account-a' } }), {},
    new Response('{}', { status: 401 }),
  )
  assert.equal(redirects, 0, 'An old account response must not interrupt the current account')
})

function messagingHarness({ account: initialAccount = null, permission: initialPermission = 'prompt', answer = 'granted', check } = {}) {
  let account = initialAccount
  let permission = initialPermission
  let requests = 0
  const registrations = []
  const window = new EventTarget()
  const document = new EventTarget()
  document.visibilityState = 'visible'
  const api = load('src/composables/useNativeMessaging.ts', {
    '@capacitor/core': { Capacitor: { getPlatform: () => 'android' } },
    '@capacitor-firebase/messaging': { FirebaseMessaging: {
      addListener: async () => ({ remove: async () => {} }),
      createChannel: async () => {},
      checkPermissions: async () => { if (check) await check(); return { receive: permission } },
      requestPermissions: async () => { requests++; permission = answer; return { receive: permission } },
      getToken: async () => ({ token: 'new-user-fcm' }),
      deleteToken: async () => {},
      removeAllDeliveredNotifications: async () => {},
    } },
    vue: { ref: value => ({ value }) },
    '../api/tokens': { getAccessToken: () => account },
    '../api/main': { setFRB: async (token, options) => { registrations.push({ token, options }) } },
    '../stores/notifications': { useNotifyStore: () => ({ add() {} }) },
    './useFirebaseMessaging': { getNotificationPath: () => null },
    '../utils/notification': { escapeHtml: value => value },
    '../utils/native': { isNativeApp: () => true },
  }, { window, document })
  return {
    api, registrations, get requests() { return requests },
    start: () => api.setupNativeMessaging({ push: async () => {} }),
    login(value) { account = value; window.dispatchEvent(new Event('auth-token-changed')) },
    resume() {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('online'))
    },
  }
}

// Drain the real module's microtask queue without invoking the explicit permission API.
const settleMessaging = () => new Promise(resolve => setImmediate(resolve))

for (const permission of ['prompt', 'prompt-with-rationale']) {
  for (const authenticatedStartup of [false, true]) {
    test(`native first permission: ${permission}, authenticated startup=${authenticatedStartup}`, async t => {
      const h = messagingHarness({ account: authenticatedStartup ? 'account-a' : null, permission })
      t.after(h.start())
      await settleMessaging()
      if (!authenticatedStartup) {
        h.resume()
        await settleMessaging()
        assert.equal(h.requests, 0, 'No permission dialog before authentication, including resume')
        assert.equal(h.registrations.length, 0)
        h.login('account-a')
        await settleMessaging()
      }
      assert.equal(h.requests, 1)
      assert.equal(h.registrations.length, 1)
      assert.equal(h.registrations[0].options.headers.Authorization, 'Bearer account-a')
      h.resume()
      h.resume()
      await settleMessaging()
      assert.equal(h.requests, 1, 'Resume must not repeat the permission dialog')
      assert.equal(h.registrations.length, 1, 'Resume must deduplicate registration')
    })
  }
}

for (const initialPermission of ['prompt', 'denied']) {
  test(`native denial is not retried on resume or account change: ${initialPermission}`, async t => {
    const h = messagingHarness({ account: 'account-a', permission: initialPermission, answer: 'denied' })
    t.after(h.start())
    await settleMessaging()
    const expected = initialPermission === 'prompt' ? 1 : 0
    assert.equal(h.requests, expected)
    h.resume()
    h.login('account-b')
    h.resume()
    await settleMessaging()
    assert.equal(await h.api.requestNativeNotificationPermission(), false)
    assert.equal(h.requests, expected, 'Even explicit API must not request an already denied permission')
    assert.equal(h.registrations.length, 0)
  })
}

test('native automatic prompt is not repeated while permission remains prompt; explicit retry remains available', async t => {
  const h = messagingHarness({ account: 'account-a', answer: 'prompt' })
  t.after(h.start())
  await settleMessaging()
  h.resume()
  h.login('account-b')
  await settleMessaging()
  assert.equal(h.requests, 1)
  assert.equal(await h.api.requestNativeNotificationPermission(), false)
  assert.equal(h.requests, 2, 'Explicit request API can retry a requestable permission')
})

test('native logout during permission check blocks stale automatic prompt and registration', async t => {
  let release
  const pendingCheck = new Promise(resolve => { release = resolve })
  const h = messagingHarness({ account: 'account-a', check: () => pendingCheck })
  t.after(h.start())
  await settleMessaging()
  h.login(null)
  release()
  await settleMessaging()
  assert.equal(h.requests, 0)
  assert.equal(h.registrations.length, 0)
})

for (const [index, expected] of [[0, 'camera'], [1, 'gallery'], [2, 'files'], [3, null], [-1, null]]) {
  test(`attachment sheet maps selection/cancel ${index} with Russian labels`, async () => {
    const api = camera(true, {}, undefined, { showActions: async options => {
      assert.equal(options.title, 'Добавить вложение')
      assert.deepEqual(Array.from(options.options, o => o.title), ['Камера', 'Галерея', 'Файлы (загрузки)', 'Отмена'])
      assert.equal(options.options[3].style, 'CANCEL')
      return { index }
    } })
    assert.equal(await api.chooseAttachmentSource(), expected)
  })
}
test('explicit canceled result never opens a source even with a valid index', async () => {
  assert.equal(await camera(true, {}, undefined, { showActions: async () => ({ index: 0, canceled: true }) }).chooseAttachmentSource(), null)
})
test('gallery skips camera permissions and retains URI before conversion', async () => {
  const calls = []
  const api = camera(true, {
    checkPermissions: () => assert.fail('Gallery must not check camera permissions'),
    requestPermissions: () => assert.fail('Gallery must not request camera permissions'),
    getPhoto: async options => { assert.equal(options.source, 'photos'); return { webPath: 'local-photo', format: 'jpeg' } },
  }, async () => { calls.push('fetch'); return { ok: true, blob: async () => new Blob(['photo']) } })
  assert.ok(await api.takeNativePhoto('gallery', () => calls.push('retain')) instanceof File)
  assert.deepEqual(calls, ['retain', 'fetch'])
})
