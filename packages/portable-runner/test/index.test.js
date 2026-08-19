import assert from 'node:assert/strict'
import test from 'node:test'
import { runPortableCasePlan } from '../src/index.js'

test('runs an isolated plan without DSH dependencies', async () => {
  const result = await runPortableCasePlan({
    plan: {
      schemaVersion: 1,
      id: 'portable-runner-smoke',
      title: 'Portable runner smoke test',
      setup: [{ op: 'environment.set', name: 'TEST_VALUE', value: 'safe' }],
      run: { op: 'plugin.prompt', input: 'answer' },
      assertions: [{ op: 'output.equals', value: 'safe' }],
    },
    async runPlugin({ env }) { return { output: env.TEST_VALUE, exitCode: 0 } },
  })

  assert.equal(result.status, 'passed')
  assert.equal(result.actualOutput, 'safe')
})
