import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ky from 'ky'
import ts from 'typescript'

// Execute the installed Android bridge's actual fetch patch. Native transport
// is stubbed: these checks establish JS compatibility, not emulator/server proof.
function patchHarness(nativePromise, serverUrl = 'https://localhost') {
  const source = readFileSync(new URL('../src-capacitor/node_modules/@capacitor/android/capacitor/src/main/assets/native-bridge.js', import.meta.url), 'utf8')
  const helpers = source.slice(source.indexOf('    const readFileAsBase64'), source.indexOf('    const initBridge'))
  const patch = source.slice(source.indexOf('                    window.fetch = async'), source.indexOf('                    window.XMLHttpRequest = function'))
  const calls = []
  const window = {
    Capacitor: { getServerUrl: () => serverUrl },
    CapacitorWebFetch: async request => { calls.push(request); return new Response('{}') },
  }
  vm.runInNewContext(helpers + patch, {
    window, win: window, platform: 'android',
    cap: { getServerUrl: () => serverUrl, nativePromise },
    Request, Response, Headers, URL, URLSearchParams, FormData, File,
    ReadableStream, Uint8Array, TextDecoder,
    console: { time() {}, timeEnd() {} },
  })
  return { fetch: window.fetch, calls }
}

test('setFRB applies a 15-second ky timeout and retains explicit session options', async () => {
  let options
  const exports = {}
  const mocks = {
    './index': { api: { mainKy: { post: (path, value) => {
      assert.equal(path, 'firebase/token')
      options = value
      return { json: async () => ({}) }
    } } } },
    './tokens': {},
  }
  const source = readFileSync(new URL('../src/api/main.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_API_URL', '"https://api.example.test"')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, FormData, require: name => {
    assert.ok(name in mocks); return mocks[name]
  } })
  const controller = new AbortController()
  await exports.setFRB('synthetic-token', {
    signal: controller.signal, headers: { Authorization: 'Bearer original-session' },
  })
  assert.equal(options.timeout, 15000)
  assert.equal(options.signal, controller.signal)
  assert.equal(options.headers.Authorization, 'Bearer original-session')
})

test('ky timeout rejects a native POST even when transport ignores abort', async () => {
  let complete
  const bridge = patchHarness(async () => {
    await new Promise(resolve => { complete = resolve })
    return { status: 200, headers: {}, data: '', url: 'https://api.example.test' }
  })
  // Same installed ky timeout path, shortened to avoid a 15-second test delay.
  await assert.rejects(ky.post('https://api.example.test/api/firebase/token', {
    fetch: bridge.fetch, body: 'synthetic-token', timeout: 25, retry: 0,
  }), error => error.name === 'TimeoutError')
  assert.equal(typeof complete, 'function')
  complete()
})

for (const origin of ['https://localhost', 'capacitor://localhost']) {
  test(`local camera URIs bypass native HTTP/proxy at ${origin}`, async () => {
    const bridge = patchHarness(() => assert.fail('Local photo must use WebView fetch'), origin)
    for (const prefix of ['_capacitor_file_', '_capacitor_content_']) {
      const path = `${origin}/${prefix}/photo.jpeg`
      await bridge.fetch(path)
      assert.equal(bridge.calls.at(-1), path)
    }
  })
}

test('installed native HTTP patch preserves ky GET Request auth and signal through proxy', async () => {
  const bridge = patchHarness(() => assert.fail('GET uses proxy transport'))
  const controller = new AbortController()
  await ky.get('https://api.example.test/api/profile', {
    fetch: bridge.fetch, signal: controller.signal,
    headers: { Authorization: 'Bearer synthetic-session', 'X-Requested-With': 'ky' },
  })
  const request = bridge.calls[0]
  const url = new URL(request.url)
  assert.equal(url.origin, 'https://localhost')
  assert.equal(url.pathname, '/_capacitor_http_interceptor_')
  assert.equal(url.searchParams.get('u'), 'https://api.example.test/api/profile')
  assert.equal(request.headers.get('Authorization'), 'Bearer synthetic-session')
  assert.equal(request.headers.get('X-Requested-With'), 'ky')
  controller.abort()
  assert.equal(request.signal.aborted, true)
})

test('installed native HTTP POST ignores abort; explicit ky credentials remain pinned', async () => {
  let complete
  let options
  const bridge = patchHarness(async (_plugin, _method, value) => {
    options = value
    await new Promise(resolve => { complete = resolve })
    return { status: 200, headers: { 'Content-Type': 'application/json' }, data: {}, url: value.url }
  })
  const controller = new AbortController()
  const body = new FormData()
  body.append('token', 'synthetic-fcm-token')
  const operation = ky.post('https://api.example.test/api/firebase/token', {
    fetch: bridge.fetch, timeout: false, signal: controller.signal, body,
    headers: { Authorization: 'Bearer original-session' },
  })
  while (!complete) await new Promise(resolve => setImmediate(resolve))
  controller.abort()
  assert.equal(options.headers.authorization, 'Bearer original-session')
  assert.match(options.data, /synthetic-fcm-token/)
  assert.equal('signal' in options, false)
  complete()
  assert.equal((await operation).status, 200,
    'Installed bridge resolves an aborted POST; callers must retain generation guards')
})

test('installed native HTTP patch corrupts binary multipart in a ky Request body', async () => {
  let options
  const bridge = patchHarness(async (_plugin, _method, value) => {
    options = value
    return { status: 200, headers: {}, data: '', url: value.url }
  })
  const body = new FormData()
  body.append('media', new File([new Uint8Array([0xff, 0xd8, 0x80])], 'photo.jpeg', { type: 'image/jpeg' }))
  await ky.post('https://api.example.test/api/temp-media', { fetch: bridge.fetch, body })
  assert.equal(options.dataType, 'text')
  assert.match(options.data, /\uFFFD/,
    'Request stream is decoded as UTF-8 instead of retaining binary multipart bytes')
})
