import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
function previewHarness() {
  const cleanups = []
  const active = new Set()
  const revoked = []
  let sequence = 0
  const exports = {}
  vm.runInNewContext(ts.transpileModule(read('src/composables/useAttachmentPreview.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => {
      assert.equal(name, 'vue')
      return { onBeforeUnmount: callback => cleanups.push(callback) }
    },
    URL: {
      createObjectURL: () => { const url = `blob:test-${++sequence}`; active.add(url); return url },
      revokeObjectURL: url => { revoked.push(url); active.delete(url) },
    },
  })
  return { create: exports.useAttachmentPreview, active, revoked, unmount: () => cleanups.forEach(fn => fn()) }
}
const image = () => new File(['photo'], 'photo.JPG', { type: 'image/jpeg' })

test('previews support image MIME and missing MIME extension; documents allocate no blob', () => {
  const h = previewHarness()
  const api = h.create()
  assert.equal(api.create(image()).noimg, false)
  assert.equal(api.create(new File(['photo'], 'PHOTO.JPEG')).noimg, false)
  const doc = api.create(new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' }))
  assert.equal(doc.preview, 'invoice.pdf')
  assert.equal(doc.noimg, true)
  api.release(doc.preview)
  api.release('https://server/private.jpg')
  assert.equal(h.revoked.length, 0)
  h.unmount()
  assert.equal(h.active.size, 0)
  assert.equal(h.revoked.length, 2)
})

test('release, clear and unmount revoke only owned URLs exactly once across instances', () => {
  const h = previewHarness()
  const a = h.create()
  const b = h.create()
  const first = a.create(image()).preview
  const second = a.create(image()).preview
  const other = b.create(image()).preview
  a.release(other)
  a.release(first)
  a.release(first)
  a.release()
  a.clear()
  a.clear()
  assert.deepEqual(h.revoked, [first, second])
  assert.ok(h.active.has(other))
  h.unmount()
  h.unmount()
  assert.deepEqual(h.revoked, [first, second, other])
})

// Execute the actual upload/delete function bodies, keeping the network pending
// so races and the exact UI state before/after completion can be asserted.
function uploadHarness(path, dialog = false, transport) {
  const h = previewHarness()
  const attachmentPreview = h.create()
  const tiles = { value: [] }
  const fieldValues = {}
  const fieldErrors = {}
  let resolveUpload, rejectUpload, progress
  const pending = new Promise((resolve, reject) => { resolveUpload = resolve; rejectUpload = reject })
  const source = read(path).match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1]
  const parsed = ts.createSourceFile(path + '.ts', source, ts.ScriptTarget.Latest, true)
  const names = dialog ? ['handleAttachFile', 'deleteAttachment'] : ['handleFileLoad', 'handleDeleteFile', 'isAllowedFile', 'isTooLarge']
  let bodies = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(parsed)).join('\n')
  assert.equal(bodies.match(/(?:async )?function /g).length, names.length)
  const sendNode = parsed.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(parsed) === 'send'))
  if (dialog) {
    const aliveNode = parsed.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(parsed) === 'alive'))
    assert.ok(aliveNode, 'Dialog send needs its actual lifecycle state declaration')
    bodies += '\n' + aliveNode.getText(parsed) + '\n' + sendNode.getText(parsed) + '\nglobalThis.sendMessage = send;'
  }
  let resolveSend, rejectSend
  let sent = null
  const sendPending = new Promise((resolve, reject) => { resolveSend = resolve; rejectSend = reject })
  const context = {
    props: { uuid: 'chat-id' }, mainStore: { load: false }, messageText: { value: 'hello' },
    sendMess: (_, payload) => { sent = payload; return sendPending },
    storeChat: { setMessgs() {} },
    attachmentPreview, files: tiles, attachmentTiles: tiles,
    MAX_SIZE: 20 * 1024 * 1024, allowedExt: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
    crypto: { randomUUID: (() => { let id = 0; return () => String(++id) })() },
    setFieldError: (key, value) => { fieldErrors[key] = value }, setFieldValue: (key, value) => { fieldValues[key] = value },
    uploadFileWithProgress: transport ?? ((_, callback) => { progress = callback; return pending }),
  }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(bodies, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
  return { ...h, tiles, fieldValues, fieldErrors,
    send: context.sendMessage, resolveSend: () => resolveSend(), rejectSend: () => rejectSend(new Error('send failed')), sent: () => sent,
    upload: context[dialog ? 'handleAttachFile' : 'handleFileLoad'],
    remove: context[dialog ? 'deleteAttachment' : 'handleDeleteFile'],
    succeed: () => resolveUpload({ data: { uuid: 'uploaded-id', url: 'https://private.test/image.jpg' } }),
    fail: () => rejectUpload(new Error('upload failed')), progress: value => progress(value),
  }
}
for (const [path, dialog] of [
  ['src/components/DocsForm.vue', false],
  ['src/components/PaymentForm.vue', false],
  ['src/views/DialogView.vue', true],
]) {
  test(`${path}: successful upload preserves local preview and stores server UUID`, async () => {
    const h = uploadHarness(path, dialog)
    const operation = h.upload(image())
    const tile = h.tiles.value[0]
    const preview = tile.preview
    assert.ok(h.active.has(preview))
    assert.equal(tile.loading, true)
    h.progress(65)
    assert.equal(tile.progress, 65)
    h.succeed()
    await operation
    assert.equal(tile.preview, preview)
    assert.equal(tile.loading, false)
    assert.equal(tile.serverId, 'uploaded-id')
    assert.equal(h.revoked.length, 0)
    if (!dialog) assert.deepEqual(Array.from(h.fieldValues.files), ['uploaded-id'])
    h.remove(tile.id)
    assert.equal(h.tiles.value.length, 0)
    assert.deepEqual(h.revoked, [preview])
    h.unmount()
    assert.equal(h.revoked.length, 1)
  })
  test(`${path}: upload failure frees preview and removes tile`, async () => {
    const h = uploadHarness(path, dialog)
    const operation = h.upload(image())
    h.fail()
    await operation
    assert.equal(h.tiles.value.length, 0)
    assert.equal(h.active.size, 0)
    assert.equal(h.revoked.length, 1)
    h.unmount()
    assert.equal(h.revoked.length, 1)
  })
  test(`${path}: delete while uploading cannot resurrect tile or revoke twice`, async () => {
    const h = uploadHarness(path, dialog)
    const operation = h.upload(image())
    h.remove(h.tiles.value[0].id)
    h.progress(100)
    h.succeed()
    await operation
    assert.equal(h.tiles.value.length, 0)
    assert.equal(h.active.size, 0)
    assert.equal(h.revoked.length, 1)
    if (!dialog) assert.equal(h.fieldValues.files, null)
  })
  test(`${path}: unmount during upload frees URLs even when upload finishes later`, async () => {
    const h = uploadHarness(path, dialog)
    const operation = h.upload(image())
    h.unmount()
    h.succeed()
    await operation
    assert.equal(h.active.size, 0)
    assert.equal(h.revoked.length, 1)
  })
}

for (const success of [true, false]) {
  test(`chat ${success ? 'successful' : 'failed'} send ${success ? 'releases' : 'retains'} uploaded preview`, async () => {
    const h = uploadHarness('src/views/DialogView.vue', true)
    const upload = h.upload(image())
    h.succeed()
    await upload
    const preview = h.tiles.value[0].preview
    const sending = h.send()
    assert.equal(h.sent().images[0].uuid, 'uploaded-id')
    assert.ok(h.active.has(preview))
    if (success) {
      h.resolveSend()
      await sending
      assert.equal(h.tiles.value.length, 0)
      assert.equal(h.active.size, 0)
    } else {
      h.rejectSend()
      await assert.rejects(sending, /send failed/)
      assert.equal(h.tiles.value[0].preview, preview)
      assert.ok(h.active.has(preview))
    }
    h.unmount()
    assert.deepEqual(h.revoked, [preview])
  })
}
test('chat refuses sending while upload is pending and keeps preview alive', async () => {
  const h = uploadHarness('src/views/DialogView.vue', true)
  const upload = h.upload(image())
  await h.send()
  assert.equal(h.sent(), null)
  assert.equal(h.active.size, 1)
  h.succeed()
  await upload
  h.unmount()
  assert.equal(h.active.size, 0)
})

// Real API implementation with manual XHR events: no network or 60-second wait.
function xhrHarness() {
  const requests = []
  class XHR {
    upload = {}
    constructor() { requests.push(this) }
    open() {}
    setRequestHeader() {} // Never record or print credentials.
    send() {}
  }
  const exports = {}
  const source = read('src/api/main.ts').replaceAll('import.meta.env.VITE_API_URL', '"https://upload.invalid"')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, XMLHttpRequest: XHR, FormData,
    require: name => {
      if (name === './index') return { api: {} }
      if (name === './tokens') return { getAccessToken: () => null }
      assert.fail(`Unexpected dependency: ${name}`)
    },
  })
  return { requests, upload: exports.uploadFileWithProgress }
}
for (const [event, message] of [
  ['ontimeout', 'Upload timed out'], ['onabort', 'Upload cancelled'], ['onerror', 'Upload failed'],
]) {
  test(`XHR ${event} rejects with an error and ignores a late success`, async () => {
    const xhr = xhrHarness()
    const operation = xhr.upload(image())
    const request = xhr.requests[0]
    assert.equal(request.timeout, 60000)
    const rejection = assert.rejects(operation, error => error.message === message)
    request[event]()
    request.status = 200
    request.responseText = JSON.stringify({ data: { uuid: 'late-id' } })
    request.onload()
    await rejection
  })
  for (const [path, dialog] of [
    ['src/components/DocsForm.vue', false],
    ['src/components/PaymentForm.vue', false],
    ['src/views/DialogView.vue', true],
  ]) {
    test(`${path}: actual XHR ${event} clears loading/preview, preserves other attachments, allows retry`, async () => {
      const xhr = xhrHarness()
      const h = uploadHarness(path, dialog, xhr.upload)
      const existing = h.upload(image())
      xhr.requests[0].status = 200
      xhr.requests[0].responseText = JSON.stringify({ data: { uuid: 'existing-id' } })
      xhr.requests[0].onload()
      await existing
      const retained = h.tiles.value[0].preview
      const failed = h.upload(image())
      const failedPreview = h.tiles.value[1].preview
      assert.equal(h.tiles.value.some(f => f.loading), true)
      xhr.requests[1].upload.onprogress({ lengthComputable: true, loaded: 1, total: 2 })
      assert.equal(h.tiles.value[1].progress, 50)
      xhr.requests[1][event]()
      await failed
      assert.equal(h.tiles.value.some(f => f.loading), false)
      assert.equal(h.tiles.value.length, 1)
      assert.equal(h.tiles.value[0].preview, retained)
      assert.ok(h.active.has(retained))
      assert.deepEqual(h.revoked, [failedPreview])
      if (!dialog) {
        assert.equal(h.fieldErrors.files, 'Не удалось загрузить файл. Попробуйте ещё раз.')
        assert.deepEqual(Array.from(h.fieldValues.files), ['existing-id'])
      }
      const retry = h.upload(image())
      if (!dialog) assert.equal(h.fieldErrors.files, '')
      xhr.requests[2].status = 200
      xhr.requests[2].responseText = JSON.stringify({ data: { uuid: 'retry-id' } })
      xhr.requests[2].onload()
      await retry
      assert.equal(h.tiles.value.length, 2)
      assert.equal(h.tiles.value[1].serverId, 'retry-id')
      assert.equal(h.tiles.value.some(f => f.loading), false)
      h.unmount()
      assert.equal(h.active.size, 0)
      assert.equal(new Set(h.revoked).size, h.revoked.length)
    })
  }
}
