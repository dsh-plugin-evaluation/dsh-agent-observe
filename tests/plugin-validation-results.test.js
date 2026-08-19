import assert from 'node:assert/strict'
import test from 'node:test'
import { runPluginValidation } from '../src/plugin-validation-runner.js'

test('summarizes mixed case results as partial', async () => {
  let caseIndex = 0
  const result = await runPluginValidation({
    pluginId: 'dsh-agent-observe',
    cases: [
      { id: 'passed-case', title: '通过', prompt: '检查观测', expected: '显示观测信息' },
      { id: 'failed-case', title: '失败', prompt: '检查异常', expected: '返回异常提示' },
    ],
    readPackage: async () => JSON.stringify({ dependencies: { 'dsh-agent-observe': 'link:/plugins/observe' } }),
    async execute(_command, args) {
      if (args[1] === 'plugin') return { code: 0, stdout: '', stderr: '' }
      caseIndex += 1
      return caseIndex === 1
        ? { code: 0, stdout: '当前会话观测信息', stderr: '' }
        : { code: 1, stdout: '', stderr: '模型不可用' }
    },
    async validate({ output }) { return output.includes('观测') },
  })

  assert.equal(result.status, 'partial')
  assert.equal(result.totalCases, 2)
  assert.equal(result.passedCases, 1)
  assert.equal(result.cases[0].passed, true)
  assert.equal(result.cases[1].passed, false)
  assert.equal(result.cases[1].error, '模型不可用')
})

test('summarizes all failed case results as failed', async () => {
  const result = await runPluginValidation({
    pluginId: 'dsh-agent-observe',
    cases: [
      { id: 'failed-one', title: '失败一', prompt: '检查一', expected: '结果一' },
      { id: 'failed-two', title: '失败二', prompt: '检查二', expected: '结果二' },
    ],
    readPackage: async () => JSON.stringify({ dependencies: { 'dsh-agent-observe': 'link:/plugins/observe' } }),
    async execute(_command, args) {
      return args[1] === 'plugin'
        ? { code: 0, stdout: '', stderr: '' }
        : { code: 1, stdout: '', stderr: '隔离执行失败' }
    },
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.totalCases, 2)
  assert.equal(result.passedCases, 0)
  assert.ok(result.cases.every(item => item.passed === false))
  assert.ok(result.cases.every(item => item.error === '隔离执行失败'))
})

test('rejects a plugin dependency that cannot be isolated by link', async () => {
  await assert.rejects(
    runPluginValidation({
      pluginId: 'dsh-agent-observe',
      cases: [{ id: 'case-1', title: '测试', prompt: '检查', expected: '结果' }],
      readPackage: async () => JSON.stringify({ dependencies: { 'dsh-agent-observe': 'file:/plugins/observe' } }),
    }),
    /该插件不支持隔离执行/
  )
})
