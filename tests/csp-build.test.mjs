import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { getQuasarConfEnv } from '../node_modules/@quasar/app-vite/lib/utils/env.js'
import { renderTemplate } from '../node_modules/@quasar/app-vite/lib/utils/template.js'

const root = new URL('../', import.meta.url).pathname
function config(apiUrl) {
  const source = readFileSync(new URL('../quasar.config.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env', 'configEnv')
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, configEnv: { VITE_API_URL: apiUrl },
    process: { env: {} },
    require: name => { assert.equal(name, '#q-app'); return { defineConfig: fn => fn } },
  })
  return exports.default().htmlVariables.apiOrigin
}

test('CSP config uses injected env and exposes only normalized HTTP(S) origin', () => {
  assert.equal(config('https://user:password@API.EXAMPLE.TEST:8443/api?q=%22%3E#x'), 'https://api.example.test:8443')
  assert.equal(config('https://example.test/%22%3E%3Cscript%3E'), 'https://example.test')
  assert.equal(config(undefined), '')
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/api', 'https://example.test";evil']) {
    assert.throws(() => config(value))
  }
})

test('actual Quasar renderer emits the API origin in every CSP position', () => {
  const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const origin = config('https://api.example.test/api')
  const html = renderTemplate(template, {
    productName: 'Test', productDescription: 'Test', apiOrigin: origin,
    ctx: { mode: { capacitor: true }, dev: false },
  }, { varName: false })
  assert.equal(typeof html, 'string')
  const policy = html.match(/content="(default-src[^\"]*)"/)?.[1]
  assert.ok(policy, 'Rendered template must contain CSP')
  for (const directive of ['connect-src', 'img-src', 'frame-src']) {
    const hosts = policy.split(';').map(value => value.trim()).find(value => value.startsWith(`${directive} `)).split(/\s+/).slice(1)
    assert.ok(hosts.includes(origin), `${directive} must interpolate API origin with the installed Quasar renderer`)
  }
})

test('config HTML escaping survives the actual Quasar renderer', () => {
  const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const escaped = config('https://api&edge.example.test/path')
  assert.equal(escaped, 'https://api&amp;edge.example.test')
  const html = renderTemplate(template, {
    productName: 'Test', productDescription: 'Test', apiOrigin: escaped,
    ctx: { mode: { capacitor: true }, dev: false },
  }, { varName: false })
  assert.equal(typeof html, 'string')
  const policy = html.match(/content="(default-src[^\"]*)"/)?.[1]
  assert.ok(policy)
  assert.equal(policy.match(/https:\/\/api&amp;edge\.example\.test/g)?.length, 3)
  assert.ok(!policy.includes('api&edge'), 'Ampersand must remain escaped in HTML source')
  assert.ok(!policy.includes('ws:') && !policy.includes('wss:'), 'Production must exclude development WebSockets')
})

test('synced production Android HTML permits actual env API origin with narrow CSP', {
  skip: !existsSync(new URL('../src-capacitor/www/index.html', import.meta.url)) && 'Run prepare:android for generated HTML validation',
}, () => {
  const definitions = getQuasarConfEnv({
    ctx: { appPaths: { appDir: root } }, envCfg: {}, useSnapshot: false,
  }).envDefineList
  const apiUrl = definitions['import.meta.env.VITE_API_URL']
  assert.ok(apiUrl, 'Build environment must supply API URL for this artifact check')
  const origin = new URL(JSON.parse(apiUrl)).origin
  const expected = {
    'default-src': ["'self'"], 'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': ["'self'", origin, 'https://firebaseinstallations.googleapis.com', 'https://fcmregistrations.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:', origin],
    'frame-src': ["'self'", origin], 'worker-src': ["'self'", 'blob:'],
  }
  for (const path of ['src-capacitor/www/index.html', 'src-capacitor/android/app/src/main/assets/public/index.html']) {
    const html = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    const policy = html.match(/http-equiv=(?:"Content-Security-Policy"|Content-Security-Policy)\s+content="([^"]*)"/i)?.[1]
    assert.ok(policy, 'Generated HTML must contain CSP')
    const directives = Object.fromEntries(policy.split(';').filter(part => part.trim()).map(part => {
      const [name, ...hosts] = part.trim().split(/\s+/)
      return [name, hosts]
    }))
    // Boolean assertion avoids echoing private environment-derived values.
    assert.ok(JSON.stringify(directives) === JSON.stringify(expected), 'Generated production CSP differs from exact allowlist')
    assert.ok(!html.includes('<%'), 'Generated HTML must not retain template placeholders')
  }
  const native = JSON.parse(readFileSync(new URL('../src-capacitor/android/app/src/main/assets/capacitor.config.json', import.meta.url), 'utf8'))
  assert.ok(native.plugins?.CapacitorHttp?.enabled !== true, 'Native HTTP patch must remain disabled')
})
