import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import test from 'node:test'
import { reserveE2ePort, resolveStartupTimeout } from './e2e/support.js'

test('uses a configurable positive E2E startup timeout', () => {
  assert.equal(resolveStartupTimeout(undefined), 60_000)
  assert.equal(resolveStartupTimeout('90000'), 90_000)
  assert.throws(() => resolveStartupTimeout('0'), /positive integer/)
})

test('selects an available E2E port when the requested port is occupied', async () => {
  const occupied = createServer()
  await new Promise((resolvePromise, reject) => {
    occupied.once('error', reject)
    occupied.listen(0, '127.0.0.1', resolvePromise)
  })
  const address = occupied.address()
  assert.ok(address && typeof address === 'object')

  try {
    const port = await reserveE2ePort(address.port)
    assert.notEqual(port, address.port)
  } finally {
    await new Promise(resolvePromise => occupied.close(resolvePromise))
  }
})
