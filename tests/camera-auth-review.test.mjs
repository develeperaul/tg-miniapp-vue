import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Run the actual FileTile setup with route/profile deliberately unchanged.
function fileTileHarness(props = {}, selectedSource = 'camera', native = true) {
  let token = 'test-session'
  let resolvePhoto
  let cleanup
  let reads = 0
  let captures = 0
  let claims = 0
  const emitted = []
  const warnings = []
  const filePicks = []
  let fileStarted
  const startedFile = new Promise(resolve => { fileStarted = resolve })
  let resolveFile
  const pendingFile = new Promise(resolve => { resolveFile = resolve })
  const discarded = []
  let clicked = 0
  let resolveSheet
  const sheet = new Promise(resolve => { resolveSheet = resolve })
  const route = { fullPath: '/dialogs/chat-a' }
  const profile = { uuid: 'account-a' }
  const capture = { value: null }
  const window = new EventTarget()
  const pending = new Promise(resolve => { resolvePhoto = resolve })
  const vue = {
    ref: value => ({ value }),
    computed: get => ({ get value() { return get() } }),
    watch() {},
    onBeforeUnmount: callback => { cleanup = callback },
  }
  const mocks = {
    vue,
    '../api/tokens': { getAccessToken: () => token },
    'vue-router': { useRoute: () => route },
    '../stores/main': { useMainStore: () => ({ profile }) },
    '../composables/nativeCameraRecovery': {
      beginCapture: () => { captures++; return 'capture-1' },
      pendingCameraCapture: capture, matchesCapture: () => true,
      claimRecoveredPhoto: () => { claims++; return { webPath: 'local-photo' } },
      releaseRecoveredPhoto() {},
      retainCapturePhoto: (id, photo) => { capture.value = { id, photo, status: 'ready' } },
      discardCapture: id => { discarded.push(id); capture.value = null },
    },
    '../utils/native': { isNativeApp: () => native },
    '../composables/useNativeCamera': {
      chooseAttachmentSource: () => selectedSource === 'deferred' ? sheet : Promise.resolve(selectedSource),
      takeNativePhoto: (_source, retain) => { reads++; return pending.then(file => { if (file) retain({ webPath: 'local-photo' }); return file }) },
      photoToFile: () => { reads++; return pending },
    },
    '../composables/useNativeFiles': { pickNativeFile: (pdfOnly, isCurrent) => { filePicks.push({ pdfOnly, isCurrent }); fileStarted(); return pendingFile } },
    '../stores/notifications': { useNotifyStore: () => ({ add: (...args) => warnings.push(args) }) },
    'vee-validate': {}, './CircularProgress.vue': {},
  }
  const sfc = readFileSync(new URL('../src/components/FileTile.vue', import.meta.url), 'utf8')
  const source = sfc.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    + '\nexports.capturePhoto = capturePhoto; exports.recoverPhoto = recoverPhoto; exports.addFile = addFile; exports.loadFile = loadFile; exports.setInput = input => { fileInput.value = input };'
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => { assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name] },
    defineProps: () => ({ captureSlot: 'dialog-attachments:chat-a', ...props }),
    withDefaults: (values, defaults) => ({ ...defaults, ...values }),
    defineEmits: () => (...args) => emitted.push(args), window,
  })
  exports.setInput({ click: () => { clicked++ } })
  return {
    api: exports, emitted, discarded, capture, route, profile, warnings, filePicks, startedFile,
    finishFile: (file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })) => resolveFile(file),
    clicked: () => clicked,
    choose: value => resolveSheet(value),
    cancelPhoto: () => resolvePhoto(null),
    setToken: value => { token = value },
    authChange: () => window.dispatchEvent(new Event('auth-token-changed')),
    finish: () => resolvePhoto(new File(['photo'], 'photo.jpeg', { type: 'image/jpeg' })),
    unmount: () => cleanup(),
    calls: () => ({ reads, captures, claims }),
  }
}

for (const method of ['capturePhoto', 'recoverPhoto']) {
  test(`${method}: auth event invalidates pending result even if a live session returns before route/profile changes`, async () => {
    const harness = fileTileHarness()
    const operation = harness.api[method]()
    harness.setToken(null)
    harness.authChange()
    harness.setToken('new-test-session')
    harness.authChange()
    harness.finish()
    await operation
    assert.equal(harness.emitted.length, 0)
  })

  test(`${method}: live auth clear without an event drops pending result`, async () => {
    const harness = fileTileHarness()
    const operation = harness.api[method]()
    harness.setToken(null)
    harness.finish()
    await operation
    assert.equal(harness.emitted.length, 0)
  })

  test(`${method}: missing live auth prevents starting or claiming a photo`, async () => {
    const harness = fileTileHarness()
    harness.setToken(null)
    await harness.api[method]()
    assert.deepEqual(harness.calls(), { reads: 0, captures: 0, claims: 0 })
  })

  test(`${method}: PDF-only tile prevents camera and recovery actions`, async () => {
    const harness = fileTileHarness({ cameraEnabled: false })
    await harness.api[method]()
    assert.deepEqual(harness.calls(), { reads: 0, captures: 0, claims: 0 })
  })

  test(`${method}: authenticated unchanged context retains attachment behavior`, async () => {
    const harness = fileTileHarness()
    const operation = harness.api[method]()
    harness.finish()
    await operation
    assert.equal(harness.emitted.length, 1)
    assert.equal(harness.emitted[0][0], 'fileLoad')
  })

  test(`${method}: unmount drops pending result`, async () => {
    const harness = fileTileHarness()
    const operation = harness.api[method]()
    harness.unmount()
    harness.authChange()
    harness.finish()
    await operation
    assert.equal(harness.emitted.length, 0)
  })
}

test('PDF-only pages disable camera, and all camera recovery controls honor the prop', () => {
  for (const page of ['FNS', 'Podpis']) {
    const source = readFileSync(new URL(`../src/views/${page}.vue`, import.meta.url), 'utf8')
    assert.match(source, /<FileTile\s+:camera-enabled="false"/)
  }
  const source = readFileSync(new URL('../src/components/FileTile.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /class="camera-button"/)
  assert.match(source, /@click="addFile"/)
  assert.match(source, /:accept="cameraEnabled/)
  assert.match(source, /if \(!native\)/)
  assert.match(source, /v-if="native && cameraEnabled && recovery"/)
  assert.match(source, /v-if="native && cameraEnabled && pendingCameraCapture && !recovery"/)
})

for (const source of ['camera', 'gallery', 'files', null]) {
  test(`single attachment action dispatches ${source}`, async () => {
    const h = fileTileHarness({}, source)
    const op = h.api.addFile()
    await Promise.resolve()
    h.finish()
    h.finishFile()
    await op
    assert.equal(h.clicked(), 0)
    assert.equal(h.filePicks.length, source === 'files' ? 1 : 0)
    assert.equal(h.calls().reads, source === 'camera' || source === 'gallery' ? 1 : 0)
  })
}
for (const change of ['auth', 'route', 'account', 'unmount']) {
  test(`sheet ${change} change blocks chosen source`, async () => {
    const h = fileTileHarness({}, 'deferred')
    const op = h.api.addFile()
    if (change === 'auth') h.authChange()
    if (change === 'route') h.route.fullPath = '/other'
    if (change === 'account') h.profile.uuid = 'account-b'
    if (change === 'unmount') h.unmount()
    h.choose('files')
    await op
    assert.equal(h.clicked(), 0)
    assert.equal(h.calls().captures, 0)
  })
}
test('native PDF-only bypasses sheet and uses PDF native picker without touching pending capture', async () => {
  const h = fileTileHarness({ cameraEnabled: false }, 'deferred')
  h.capture.value = { id: 'previous', status: 'ready' }
  const op = h.api.addFile()
  assert.equal(h.clicked(), 0)
  assert.equal(h.filePicks.length, 1)
  assert.equal(h.filePicks[0].pdfOnly, true)
  h.finishFile()
  await op
  assert.equal(h.emitted.length, 1)
  assert.equal(h.capture.value.id, 'previous')
  assert.equal(h.discarded.length, 0)
})
test('file picker drops attachment after auth changes and resets input', async () => {
  const h = fileTileHarness({}, 'files', false)
  await h.api.addFile()
  h.authChange()
  const input = { files: [new File(['x'], 'test.pdf')], value: 'test.pdf' }
  h.api.loadFile({ target: input })
  assert.equal(input.value, '')
  assert.equal(h.emitted.length, 0)
})
test('completed photo survives context change as pending recovery', async () => {
  const h = fileTileHarness()
  const op = h.api.capturePhoto()
  h.authChange()
  h.finish()
  await op
  assert.equal(h.emitted.length, 0)
  assert.equal(h.capture.value.status, 'ready')
  assert.equal(h.discarded.length, 0)
})
test('canceled camera clears its own pending capture', async () => {
  const h = fileTileHarness()
  const op = h.api.capturePhoto()
  h.cancelPhoto()
  await op
  assert.equal(h.emitted.length, 0)
  assert.deepEqual(h.discarded, ['capture-1'])
})

for (const pdfOnly of [false, true]) {
  for (const change of ['auth', 'logout', 'route', 'account', 'unmount']) {
    test(`native files PDF=${pdfOnly} rejects late result after ${change}`, async () => {
      const h = fileTileHarness({ cameraEnabled: !pdfOnly }, 'files')
      h.capture.value = { id: 'previous', status: 'ready' }
      const op = h.api.addFile()
      await h.startedFile
      if (change === 'auth') h.authChange()
      if (change === 'logout') h.setToken(null)
      if (change === 'route') h.route.fullPath = '/other'
      if (change === 'account') h.profile.uuid = 'account-b'
      if (change === 'unmount') h.unmount()
      assert.equal(h.filePicks[0].isCurrent(), false)
      h.finishFile()
      await op
      assert.equal(h.emitted.length, 0)
      assert.equal(h.clicked(), 0)
      assert.equal(h.capture.value.id, 'previous')
      assert.equal(h.discarded.length, 0)
    })
  }
}
test('native file cancel is silent, preserves pending capture and allows retry', async () => {
  const h = fileTileHarness({}, 'files')
  h.capture.value = { id: 'previous', status: 'ready' }
  const op = h.api.addFile()
  await Promise.resolve()
  await h.api.addFile()
  assert.equal(h.filePicks.length, 1, 'Double tap must not launch another picker')
  h.finishFile(null)
  await op
  assert.equal(h.warnings.length, 0)
  assert.equal(h.emitted.length, 0)
  assert.equal(h.capture.value.id, 'previous')
  assert.equal(h.discarded.length, 0)
  await h.api.addFile()
  assert.equal(h.filePicks.length, 2)
})
