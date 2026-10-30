import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const MAX = 20 * 1024 * 1024
const picked = { name: 'Справка.pdf', mimeType: 'application/pdf', size: 3, path: 'content://provider/report' }
function harness({ native = true, file = picked, error, response, afterPick, afterFetch, afterBlob } = {}) {
  const calls = []
  let current = true
  const exports = {}
  const mocks = {
    '@capacitor/core': { Capacitor: { convertFileSrc: path => { calls.push(['convert', path]); return 'https://localhost/_capacitor_content_/report' } } },
    '@capawesome/capacitor-file-picker': { FilePicker: { pickFiles: async options => {
      calls.push(['pick', options])
      if (error) throw error
      afterPick?.(() => { current = false })
      return { files: file ? [file] : [] }
    } } },
    '../utils/native': { isNativeApp: () => native },
  }
  const source = readFileSync(new URL('../src/composables/useNativeFiles.ts', import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, File, Blob,
    require: name => { assert.ok(name in mocks, name); return mocks[name] },
    fetch: async url => {
      calls.push(['fetch', url])
      afterFetch?.(() => { current = false })
      return response || {
        ok: true, headers: new Headers(),
        blob: async () => { calls.push(['blob']); afterBlob?.(() => { current = false }); return new Blob(['pdf']) },
      }
    },
  })
  return { api: exports, calls, isCurrent: () => current }
}

test('native picker preserves filename and MIME; URI converted, no base64 or permissions', async () => {
  const h = harness()
  const file = await h.api.pickNativeFile(false, h.isCurrent)
  assert.equal(file.name, picked.name)
  assert.equal(file.type, picked.mimeType)
  assert.equal(await file.text(), 'pdf')
  assert.equal(h.calls[0][1].limit, 1)
  assert.equal(h.calls[0][1].readData, false)
  assert.equal(h.calls[0][1].types, undefined)
  assert.deepEqual(h.calls.slice(1), [['convert', picked.path], ['fetch', 'https://localhost/_capacitor_content_/report'], ['blob']])
})
test('PDF-only sends MIME restriction and rejects non-PDF before reading', async () => {
  const h = harness({ file: { ...picked, name: 'test.jpg', mimeType: 'image/jpeg' } })
  await assert.rejects(h.api.pickNativeFile(true), /PDF/)
  assert.deepEqual(Array.from(h.calls[0][1].types), ['application/pdf'])
  assert.equal(h.calls.length, 1)
})
for (const size of [MAX + 1, NaN, -1, undefined]) {
  test(`invalid metadata size ${size} prevents URI read`, async () => {
    const h = harness({ file: { ...picked, size } })
    await assert.rejects(h.api.pickNativeFile(), /размер/i)
    assert.equal(h.calls.length, 1)
  })
}
test('20MB boundary accepted; actual oversized payload rejected despite small metadata', async () => {
  const boundary = harness({ file: { ...picked, size: MAX } })
  assert.ok(await boundary.api.pickNativeFile() instanceof File)
  const h = harness({ response: { ok: true, headers: new Headers(), blob: async () => new Blob([new Uint8Array(MAX + 1)]) } })
  await assert.rejects(h.api.pickNativeFile(), /20 МБ/)
})
test('oversized content-length rejects before reading body', async () => {
  const h = harness({ response: { ok: true, headers: new Headers({ 'content-length': String(MAX + 1) }), blob: () => assert.fail('Body must not be read') } })
  await assert.rejects(h.api.pickNativeFile(), /20 МБ/)
})
for (const message of ['pickFiles canceled.', 'pickFiles cancelled.', 'User cancelled']) {
  test(`cancel is silent: ${message}`, async () => {
    const h = harness({ error: { message } })
    assert.equal(await h.api.pickNativeFile(), null)
    assert.equal(h.calls.length, 1)
  })
}
test('empty result returns null; real picker failures reject', async () => {
  assert.equal(await harness({ file: null }).api.pickNativeFile(), null)
  await assert.rejects(harness({ error: new Error('Provider unavailable') }).api.pickNativeFile(), /выбор файла/)
})
for (const phase of ['afterPick', 'afterFetch', 'afterBlob']) {
  test(`context invalidated ${phase} stops file delivery`, async () => {
    const h = harness({ [phase]: invalidate => invalidate() })
    assert.equal(await h.api.pickNativeFile(false, h.isCurrent), null)
    if (phase === 'afterPick') assert.equal(h.calls.length, 1)
    if (phase === 'afterFetch') assert.equal(h.calls.some(call => call[0] === 'blob'), false)
  })
}
for (const path of [undefined, 'https://remote.test/report.pdf']) {
  test(`invalid file path ${path} is never fetched`, async () => {
    const h = harness({ file: { ...picked, path } })
    await assert.rejects(h.api.pickNativeFile(), /прочитать/)
    assert.equal(h.calls.length, 1)
  })
}
test('failed local URI response rejects; web never invokes native picker', async () => {
  await assert.rejects(harness({ response: { ok: false } }).api.pickNativeFile(), /прочитать/)
  const h = harness({ native: false })
  assert.equal(await h.api.pickNativeFile(), null)
  assert.equal(h.calls.length, 0)
})
