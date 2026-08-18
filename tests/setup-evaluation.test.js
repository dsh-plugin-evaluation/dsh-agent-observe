import assert from 'node:assert/strict'
import test from 'node:test'
import { setupEvaluation } from '../scripts/setup-evaluation.mjs'

test('downloads the pinned evaluation sources into the configured home', async () => {
  const calls = []
  const result = await setupEvaluation({
    root: '/tmp/dsh-evaluation-test',
    sources: [
      { name: 'standards', repository: 'https://example.com/standards.git', ref: 'v1.0.0' },
      { name: 'dataset', repository: 'https://example.com/dataset.git', ref: 'v1.0.0' },
    ],
    async execute(command, args) {
      calls.push([command, args])
    },
  })

  assert.deepEqual(result, {
    root: '/tmp/dsh-evaluation-test',
    standardsRoot: '/tmp/dsh-evaluation-test/dsh-plugin-evaluation-standards',
    datasetRoot: '/tmp/dsh-evaluation-test/dsh-security-evaluation-dataset',
  })
  assert.deepEqual(calls, [
    ['git', ['clone', '--depth', '1', '--branch', 'v1.0.0', 'https://example.com/standards.git', '/tmp/dsh-evaluation-test/standards']],
    ['git', ['clone', '--depth', '1', '--branch', 'v1.0.0', 'https://example.com/dataset.git', '/tmp/dsh-evaluation-test/dataset']],
  ])
})
