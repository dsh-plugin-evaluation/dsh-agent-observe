import { z } from 'zod'
import { calculateCost } from './pricing.js'

const MAX_FAILURES = 20
const MAX_ARGUMENTS = 4_000
const MAX_RESULT = 4_000

const toolStatsSchema = z.record(z.object({
  calls: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  totalMs: z.number().nonnegative(),
}))

const failureSchema = z.object({
  callId: z.string(),
  name: z.string(),
  turn: z.number().int().nonnegative(),
  step: z.number().int().nonnegative(),
  arguments: z.string(),
  calledAt: z.number().nonnegative(),
  failedAt: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  errorName: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  result: z.string(),
})

const projectionSchema = z.object({
  model: z.string().nullable(),
  toolCalls: z.number().int().nonnegative(),
  toolErrors: z.number().int().nonnegative(),
  approvals: z.number().int().nonnegative(),
  approvalDenied: z.number().int().nonnegative(),
  turnErrors: z.number().int().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  tools: toolStatsSchema,
  failures: z.array(failureSchema),
}).strict()

function usageTokens(usage) {
  if (typeof usage !== 'object' || usage === null) return null
  const input = usage.inputTokens ?? usage.promptTokens
  const output = usage.outputTokens ?? usage.completionTokens
  if (typeof input !== 'number' || !Number.isFinite(input) || input < 0) return null
  if (typeof output !== 'number' || !Number.isFinite(output) || output < 0) return null
  return { input, output }
}

function toolResultError(message) {
  return message?.content?.some?.(block => block?.type === 'tool-result' && block.isError === true) === true
}

function truncate(value, limit) {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? ''
  return text.length <= limit ? text : `${text.slice(0, limit)}…`
}

function resultText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : []
  const parts = []
  for (const block of blocks) {
    if (typeof block?.text === 'string') parts.push(block.text)
    if (typeof block?.content === 'string') parts.push(block.content)
    else if (Array.isArray(block?.content)) {
      for (const item of block.content) {
        if (typeof item?.text === 'string') parts.push(item.text)
      }
    }
  }
  return truncate(parts.length > 0 ? parts.join('\n') : blocks, MAX_RESULT)
}

function failureEvidence(event, pending) {
  const result = resultText(event.data.message)
  const errorName = event.data.error?.name ?? 'ToolError'
  const errorCode = event.data.error?.code ?? 'TOOL_RESULT_ERROR'
  return {
    callId: String(event.data.message.source.callId),
    name: pending.name,
    turn: pending.turn,
    step: pending.step,
    arguments: pending.arguments,
    calledAt: pending.time,
    failedAt: event.time,
    durationMs: Math.max(0, event.time - pending.time),
    errorName,
    errorCode,
    errorMessage: result || `${errorName}: ${errorCode}`,
    result,
  }
}

export function createAgentObserveProjection(pricing) {
  return {
    key: 'agentObserve',
    schema: projectionSchema,
    init: () => ({
      model: null,
      toolCalls: 0,
      toolErrors: 0,
      approvals: 0,
      approvalDenied: 0,
      turnErrors: 0,
      estimatedCost: 0,
      tools: {},
      failures: [],
      pendingCalls: {},
    }),
    apply: (state, event) => {
      switch (event.type) {
        case 'request/header': {
          const model = event.data.header?.config?.model
          return typeof model === 'string' && model.length > 0 && model !== state.model
            ? { ...state, model }
            : state
        }
        case 'assistant/message': {
          const usage = usageTokens(event.data.usage)
          if (usage === null) return state
          return {
            ...state,
            estimatedCost: state.estimatedCost + calculateCost(
              usage.input,
              usage.output,
              state.model ?? 'default',
              pricing,
            ),
          }
        }
        case 'tool/call': {
          const name = event.data.name || 'unknown'
          const current = state.tools[name] ?? { calls: 0, errors: 0, totalMs: 0 }
          return {
            ...state,
            toolCalls: state.toolCalls + 1,
            tools: { ...state.tools, [name]: { ...current, calls: current.calls + 1 } },
            pendingCalls: {
              ...state.pendingCalls,
              [event.data.callId]: {
                name,
                turn: event.data.turn ?? 0,
                step: event.data.step ?? 0,
                arguments: truncate(event.data.arguments ?? '', MAX_ARGUMENTS),
                time: event.time,
              },
            },
          }
        }
        case 'tool/result': {
          const callId = event.data.message.source.callId
          const pending = Object.hasOwn(state.pendingCalls, callId)
            ? state.pendingCalls[callId]
            : undefined
          if (pending === undefined) return state
          const isError = event.data.error !== undefined || toolResultError(event.data.message)
          const current = state.tools[pending.name] ?? { calls: 0, errors: 0, totalMs: 0 }
          const pendingCalls = Object.fromEntries(
            Object.entries(state.pendingCalls).filter(([id]) => id !== callId),
          )
          const failures = isError
            ? [...state.failures, failureEvidence(event, pending)].slice(-MAX_FAILURES)
            : state.failures
          return {
            ...state,
            toolErrors: state.toolErrors + (isError ? 1 : 0),
            tools: {
              ...state.tools,
              [pending.name]: {
                ...current,
                errors: current.errors + (isError ? 1 : 0),
                totalMs: current.totalMs + Math.max(0, event.time - pending.time),
              },
            },
            failures,
            pendingCalls,
          }
        }
        case 'approval/asked':
          return { ...state, approvals: state.approvals + 1 }
        case 'approval/decided':
          return event.data.outcome === 'rejected'
            ? { ...state, approvalDenied: state.approvalDenied + 1 }
            : state
        case 'turn/end': {
          const failed = event.data.reason?.kind === 'error' || event.data.reason?.kind === 'aborted'
          const pendingCalls = Object.keys(state.pendingCalls).length === 0 ? state.pendingCalls : {}
          if (!failed && pendingCalls === state.pendingCalls) return state
          return {
            ...state,
            turnErrors: state.turnErrors + (failed ? 1 : 0),
            pendingCalls,
          }
        }
        default:
          return state
      }
    },
    view: state => ({
      model: state.model,
      toolCalls: state.toolCalls,
      toolErrors: state.toolErrors,
      approvals: state.approvals,
      approvalDenied: state.approvalDenied,
      turnErrors: state.turnErrors,
      estimatedCost: state.estimatedCost,
      tools: state.tools,
      failures: state.failures,
    }),
    stateVersion: 2,
  }
}
