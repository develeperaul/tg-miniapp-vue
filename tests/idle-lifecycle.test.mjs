import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// This executes the real composable with virtual timers; it is not device proof.
test('PIN success restarts idle locking for a second unattended interval', () => {
  let timer
  let mounted
  let locks = 0
  const route = { path: '/dialogs', fullPath: '/dialogs' }
  const exports = {}
  const mocks = {
    vue: {
      ref: value => ({ value }),
      onMounted: fn => { mounted = fn },
      onUnmounted() {},
    },
    'vue-router': { useRouter: () => ({
      currentRoute: { value: route },
      push: () => { locks++; route.path = '/pin' },
    }) },
    './usePinCode': { usePinCode: () => ({ setSessionAuthenticated() {} }) },
  }
  const source = readFileSync(new URL('../src/composables/useIdleTimeout.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => { assert.ok(name in mocks); return mocks[name] },
    window: new EventTarget(),
    sessionStorage: { setItem() {} },
    console: { log() {} },
    setTimeout: fn => { timer = fn; return 1 },
    clearTimeout: () => { timer = undefined },
  })
  const idle = exports.useIdleTimeout(100)
  mounted()
  timer()
  assert.equal(locks, 1)
  // PinCodeView invokes restartTimer after navigation resolves. PIN-page input
  // is ignored by handleActivity, so there need not be another activity event.
  route.path = '/dialogs'
  idle.restartTimer()
  timer()
  assert.equal(locks, 2)
})

function recoveryHarness(storage = new Map()) {
  let restored
  let registrations = 0
  let now = 1000
  const exports = {}
  const mocks = {
    '@capacitor/app': { App: { addListener: async (name, callback) => {
      assert.equal(name, 'appRestoredResult')
      registrations++
      restored = callback
      return { remove() {} }
    } } },
    vue: { shallowRef: value => ({ value }) },
    '../utils/native': { isNativeApp: () => true },
  }
  const source = readFileSync(new URL('../src/composables/nativeCameraRecovery.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, require: name => { assert.ok(name in mocks); return mocks[name] },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    crypto: { randomUUID: () => 'capture-id' },
    Date: { now: () => now },
  })
  exports.setupCameraRecovery()
  return { api: exports, storage, deliver: result => restored(result),
    advance: ms => { now += ms }, registrations: () => registrations }
}
const captureContext = { route: '/dialog/chat-a?mode=edit', slot: 'dialog-attachments:chat-a', account: 'account-a' }
const restoredPhoto = { pluginId: 'Camera', methodName: 'getPhoto', success: true,
  data: { webPath: 'http://localhost/_capacitor_file_/photo.jpg', format: 'jpeg' } }

test('camera capture survives process recreation; recovery is explicit, contextual and one-shot', () => {
  const before = recoveryHarness()
  before.api.beginCapture(captureContext)
  assert.throws(() => before.api.beginCapture(captureContext), /предыдущий/)
  const after = recoveryHarness(before.storage)
  after.api.setupCameraRecovery()
  assert.equal(after.registrations(), 1)
  after.deliver({ ...restoredPhoto, pluginId: 'Other' })
  assert.equal(after.api.pendingCameraCapture.value.status, 'pending')
  after.deliver(restoredPhoto)
  assert.equal(after.api.pendingCameraCapture.value.status, 'ready')
  for (const mismatch of [{ route: '/dialog/chat-b' }, { slot: 'payment-attachments' }, { account: 'account-b' }]) {
    assert.equal(after.api.claimRecoveredPhoto({ ...captureContext, ...mismatch }), null)
  }
  assert.ok(after.api.pendingCameraCapture.value)
  assert.equal(after.api.claimRecoveredPhoto(captureContext).webPath, restoredPhoto.data.webPath)
  assert.equal(after.api.claimRecoveredPhoto(captureContext), null)
  after.deliver(restoredPhoto)
  assert.equal(after.api.pendingCameraCapture.value, null)
  assert.equal(after.storage.size, 0)
})

for (const result of [
  { ...restoredPhoto, success: false, error: { message: 'Cancelled' } },
  { ...restoredPhoto, data: {} },
]) test('camera restoration error requires dismissal and never yields an attachment', () => {
  const before = recoveryHarness()
  const id = before.api.beginCapture(captureContext)
  const harness = recoveryHarness(before.storage)
  harness.deliver(result)
  assert.equal(harness.api.pendingCameraCapture.value.status, 'error')
  assert.equal(harness.api.claimRecoveredPhoto(captureContext), null)
  harness.api.discardCapture(id)
  assert.equal(harness.api.pendingCameraCapture.value, null)
})

test('expired and orphaned camera results cannot attach to a new form', () => {
  const harness = recoveryHarness()
  harness.deliver(restoredPhoto)
  assert.equal(harness.api.pendingCameraCapture.value, null)
  harness.api.beginCapture(captureContext)
  const after = recoveryHarness(harness.storage)
  after.advance(30 * 60 * 1000)
  after.deliver(restoredPhoto)
  assert.equal(after.api.claimRecoveredPhoto(captureContext), null)
  assert.equal(after.api.pendingCameraCapture.value, null)
})


test('restored replay cannot resolve a capture launched in the current process', () => {
  const harness = recoveryHarness()
  harness.api.beginCapture(captureContext)
  harness.deliver(restoredPhoto)
  assert.equal(harness.api.pendingCameraCapture.value.status, 'pending')
})

test('restored camera URI conversion reads local photos and rejects remote URLs without fetching', async () => {
  const exports = {}
  let reads = 0
  const source = readFileSync(new URL('../src/composables/useNativeCamera.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => {
      if (name === '@capacitor/camera' || name === '@capacitor/action-sheet') return {}
      if (name === '../utils/native') return { isNativeApp: () => true }
      assert.fail(`Unexpected dependency: ${name}`)
    },
    URL, File, Blob,
    window: { location: { href: 'https://localhost/dialog/chat-a', origin: 'https://localhost' } },
    fetch: async () => { reads++; return { ok: true, blob: async () => new Blob(['recovered']) } },
  })
  const file = await exports.photoToFile({ webPath: 'https://localhost/_capacitor_file_/photo.jpg', format: 'jpeg' }, true)
  assert.equal(await file.text(), 'recovered')
  assert.equal(reads, 1)
  for (const webPath of ['https://external.test/photo.jpg', 'https://localhost/api/upload', 'file:///photo.jpg']) {
    await assert.rejects(exports.photoToFile({ webPath, format: 'jpeg' }, true), /фотографию/)
  }
  assert.equal(reads, 1)
})

test('recovery reserves without deleting URI, releases for retry, and prevents concurrent claims', () => {
  const h = recoveryHarness()
  const id = h.api.beginCapture(captureContext)
  h.api.retainCapturePhoto(id, restoredPhoto.data)
  assert.ok(h.api.claimRecoveredPhoto(captureContext, false))
  assert.equal(h.api.claimRecoveredPhoto(captureContext, false), null)
  assert.equal(h.api.pendingCameraCapture.value.status, 'ready')
  assert.equal(h.storage.size, 1)
  h.api.releaseRecoveredPhoto(id)
  assert.ok(h.api.claimRecoveredPhoto(captureContext, false))
  h.api.discardCapture(id)
  assert.equal(h.api.claimRecoveredPhoto(captureContext), null)
  assert.equal(h.storage.size, 0)
})
