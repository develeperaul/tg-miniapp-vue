import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRouter, createMemoryHistory } from 'vue-router'

const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const routeSource = source.slice(source.indexOf('const routes = ['), source.indexOf('export let appRouter'))
  .replace(/component:\s*(\w+)/g, 'component: "$1"')
const routes = vm.runInNewContext(`${routeSource}; routes`)

test('Operator links resolve to /operator rather than Home and retain protected layout', () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const home = router.resolve({ name: 'Home' })
  const operator = router.resolve({ name: 'Operator' })
  assert.equal(home.path, '/')
  assert.equal(operator.path, '/operator')
  const direct = router.resolve('/operator')
  assert.equal(direct.name, 'Operator')
  assert.equal(direct.matched.at(-1).components.default, 'OperatorView')
  assert.equal(direct.meta.auth, true)
  assert.equal(direct.meta.requiresPin, true)
  assert.equal(router.resolve({ name: 'Order' }).path, '/operator/create')
})
