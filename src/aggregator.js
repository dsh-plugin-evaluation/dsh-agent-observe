/**
 * Event-driven metrics aggregator.
 * Listens to session/event and updates SessionMetrics + HourlyBucket in memory.
 * @module dsh-agent-observe/aggregator
 */

import { createSessionMetrics, createHourlyBucket, hourlyWindowKey } from './storage.js'
import { calculateCost } from './pricing.js'

/**
 * Create an aggregator that listens to the given context.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} config
 * @param {Record<string, {inputPer1k: number, outputPer1k: number}>} config.pricing
 * @param {Map<string, object>} sessionMetrics - shared map for session metrics
 * @param {Map<string, object>} hourlyBuckets - shared map for hourly buckets
 * @param {Function} onSessionUpdate - callback(sessionId) when metrics change
 * @param {Function} onHourlyUpdate - callback(windowKey) when bucket changes
 * @returns {Function} disposer
 */
export function startAggregator(ctx, config, sessionMetrics, hourlyBuckets, onSessionUpdate, onHourlyUpdate) {
  const pricing = config.pricing || {}

  /** @type {Map<string, number>} track turn start time per session */
  const turnStartTimes = new Map()

  /** @type {Map<string, string>} tool name by session and call id */
  const pendingToolNames = new Map()

  /** @type {Map<string, {stepCount: number, toolCallTotal: number, tokenIn: number, tokenOut: number, estimatedCost: number}>} */
  const hourlySnapshots = new Map()

  /** @type {Map<string, Set<string>>} */
  const hourlySessions = new Map()

  // ── session/event handler ──────────────────────────────────

  /** @param {object} session @param {object} event */
  function handleEvent(session, event) {
    const sessionId = session?.id
    if (!sessionId) return

    // Ensure metrics exist
    let metrics = sessionMetrics.get(sessionId)
    if (!metrics) {
      metrics = createSessionMetrics(sessionId, {
        cwd: session.header?.cwd,
        model: undefined,
        agentPreset: session.header?.agentPreset,
      })
      sessionMetrics.set(sessionId, metrics)
    }

    const data = event.data || {}
    const type = event.type
    const eventTime = typeof event.time === 'number' ? event.time : Date.now()

    // ── Turn tracking ──
    if (type === 'turn/start') {
      metrics.turnCount++
      turnStartTimes.set(`${sessionId}:${data.turn}`, eventTime)
    }

    if (type === 'turn/end') {
      metrics.lastActiveAt = eventTime
      const startKey = `${sessionId}:${data.turn}`
      const startTime = turnStartTimes.get(startKey)
      if (startTime !== undefined) {
        metrics.duration += Math.max(0, eventTime - startTime)
        turnStartTimes.delete(startKey)
      }
      metrics.avgStepsPerTurn = metrics.turnCount > 0
        ? metrics.stepCount / metrics.turnCount
        : 0

      onSessionUpdate(sessionId)
      updateHourly(metrics, data.reason, eventTime)
    }

    // ── Step tracking ──
    if (type === 'step/start') {
      metrics.stepCount++
    }

    // ── Token tracking ──
    if (type === 'assistant/message') {
      const usage = data.usage
      if (usage) {
        const tokenIn = usage.inputTokens ?? usage.promptTokens ?? 0
        const tokenOut = usage.outputTokens ?? usage.completionTokens ?? 0
        metrics.tokenIn += tokenIn
        metrics.tokenOut += tokenOut
        metrics.estimatedCost += calculateCost(tokenIn, tokenOut, metrics.model || 'default', pricing)
      }
    }

    // ── Model detection ──
    if (type === 'request/header') {
      const model = data.header?.config?.model
      if (typeof model === 'string' && model.length > 0) {
        metrics.model = model
      }
    }

    // ── Tool tracking ──
    if (type === 'tool/call') {
      metrics.toolCallTotal++
      const name = typeof data.name === 'string' && data.name.length > 0 ? data.name : 'unknown'
      metrics.toolCalls[name] = (metrics.toolCalls[name] || 0) + 1
      if (data.callId !== undefined) {
        pendingToolNames.set(`${sessionId}:${String(data.callId)}`, name)
      }
    }

    if (type === 'tool/result') {
      const callId = data.message?.source?.callId
      const resultBlock = data.message?.content?.find?.(block => block?.type === 'tool-result')
      const isError = data.error !== undefined || resultBlock?.isError === true
      if (isError) {
        metrics.toolErrorTotal++
        const toolName = callId === undefined
          ? 'unknown'
          : pendingToolNames.get(`${sessionId}:${String(callId)}`) || 'unknown'
        metrics.toolErrors[toolName] = (metrics.toolErrors[toolName] || 0) + 1
      }
      if (callId !== undefined) {
        pendingToolNames.delete(`${sessionId}:${String(callId)}`)
      }
    }

    // ── Approval tracking ──
    if (type === 'approval/asked') {
      metrics.approvalCount++
    }
    if (type === 'approval/decided' && data.outcome === 'rejected') {
      metrics.approvalDenied++
    }
  }

  // ── Hourly bucket update ──────────────────────────────────

  function updateHourly(metrics, turnEndReason, eventTime) {
    const windowKey = hourlyWindowKey(eventTime)
    let bucket = hourlyBuckets.get(windowKey)
    if (!bucket) {
      bucket = createHourlyBucket(windowKey)
      hourlyBuckets.set(windowKey, bucket)
    }

    bucket.turnCount++
    bucket.errorCount += turnEndReason?.kind === 'error' || turnEndReason?.kind === 'aborted' ? 1 : 0

    let sessions = hourlySessions.get(windowKey)
    if (!sessions) {
      sessions = new Set()
      hourlySessions.set(windowKey, sessions)
    }
    sessions.add(metrics.sessionId)
    bucket.sessionCount = sessions.size

    const snapshotKey = `${windowKey}:${metrics.sessionId}`
    const previous = hourlySnapshots.get(snapshotKey) || {
      stepCount: 0,
      toolCallTotal: 0,
      tokenIn: 0,
      tokenOut: 0,
      estimatedCost: 0,
    }

    bucket.stepCount += Math.max(0, metrics.stepCount - previous.stepCount)
    bucket.toolCallTotal += Math.max(0, metrics.toolCallTotal - previous.toolCallTotal)
    bucket.tokenIn += Math.max(0, metrics.tokenIn - previous.tokenIn)
    bucket.tokenOut += Math.max(0, metrics.tokenOut - previous.tokenOut)
    bucket.totalCost += Math.max(0, metrics.estimatedCost - previous.estimatedCost)

    if (metrics.model && !bucket.uniqueModels.includes(metrics.model)) {
      bucket.uniqueModels.push(metrics.model)
    }
    if (metrics.cwd && !bucket.uniqueCwds.includes(metrics.cwd)) {
      bucket.uniqueCwds.push(metrics.cwd)
    }

    hourlySnapshots.set(snapshotKey, {
      stepCount: metrics.stepCount,
      toolCallTotal: metrics.toolCallTotal,
      tokenIn: metrics.tokenIn,
      tokenOut: metrics.tokenOut,
      estimatedCost: metrics.estimatedCost,
    })

    onHourlyUpdate(windowKey)
  }

  // ── Register listener ─────────────────────────────────────

  const dispose = ctx.on('session/event', handleEvent)

  // Return disposer
  return () => {
    dispose()
    turnStartTimes.clear()
    pendingToolNames.clear()
    hourlySnapshots.clear()
    hourlySessions.clear()
  }
}