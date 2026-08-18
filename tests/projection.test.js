import assert from 'node:assert/strict'
import test from 'node:test'
import { createAgentObserveProjection } from '../src/projection.js'

function harness(pricing = {}) {
  const unit = createAgentObserveProjection(pricing)
  let state = unit.init()
  return {
    unit,
    apply(type, time, data) {
      state = unit.apply(state, { type, time, data })
    },
    state: () => state,
    view: () => unit.view(state),
  }
}

test('folds model, cost, tool, approval, turn failures, and structured evidence', () => {
  const h = harness({ model: { inputPer1k: 1, outputPer1k: 2 } })

  h.apply('request/header', 100, { header: { config: { model: 'model' } } })
  h.apply('assistant/message', 200, { usage: { inputTokens: 10, outputTokens: 20 } })
  h.apply('tool/call', 300, {
    turn: 2,
    step: 3,
    callId: 'c1',
    name: 'bash',
    arguments: '{"command":"exit 1"}',
  })
  h.apply('tool/result', 500, {
    turn: 2,
    step: 3,
    message: {
      source: { callId: 'c1' },
      content: [{
        type: 'tool-result',
        isError: true,
        content: [{ type: 'text', text: 'command failed' }],
      }],
    },
    error: { name: 'ExitError', code: 'EXIT_1' },
  })
  h.apply('approval/asked', 600, {})
  h.apply('approval/decided', 700, { outcome: 'rejected' })
  h.apply('turn/end', 800, { reason: { kind: 'error' } })

  const view = h.view()
  assert.deepEqual(h.unit.schema.parse(view), {
    model: 'model',
    toolCalls: 1,
    toolErrors: 1,
    approvals: 1,
    approvalDenied: 1,
    turnErrors: 1,
    estimatedCost: 0.05,
    tools: {
      bash: { calls: 1, errors: 1, totalMs: 200 },
    },
    failures: [{
      callId: 'c1',
      name: 'bash',
      turn: 2,
      step: 3,
      arguments: '{"command":"exit 1"}',
      calledAt: 300,
      failedAt: 500,
      durationMs: 200,
      errorName: 'ExitError',
      errorCode: 'EXIT_1',
      errorMessage: 'command failed',
      result: 'command failed',
    }],
  })
  assert.doesNotThrow(() => JSON.stringify(h.state()))
})

test('retains only the latest bounded failure evidence and truncates large fields', () => {
  const h = harness()
  for (let index = 0; index < 22; index += 1) {
    const callId = `c${index}`
    h.apply('tool/call', index * 10, {
      turn: 1,
      step: index + 1,
      callId,
      name: 'write',
      arguments: 'a'.repeat(5_000),
    })
    h.apply('tool/result', index * 10 + 5, {
      message: {
        source: { callId },
        content: [{ type: 'tool-result', isError: true, content: 'r'.repeat(5_000) }],
      },
    })
  }

  const failures = h.view().failures
  assert.equal(failures.length, 20)
  assert.equal(failures[0].callId, 'c2')
  assert.equal(failures.at(-1).callId, 'c21')
  assert.equal(failures[0].arguments.length, 4_001)
  assert.equal(failures[0].result.length, 4_001)
})

test('returns the same state for unrelated events and ignores unmatched results', () => {
  const unit = createAgentObserveProjection({})
  const initial = unit.init()
  assert.equal(unit.apply(initial, { type: 'step/start', time: 1, data: {} }), initial)
  assert.equal(unit.apply(initial, {
    type: 'tool/result',
    time: 2,
    data: { message: { source: { callId: 'absent' }, content: [] } },
  }), initial)
})
