/**
 * DSH Agent Observability Plugin
 *
 * Provides in-process agent observability: behavior metrics, cost tracking,
 * and session audit — all powered by the existing session event log.
 * No external platform required.
 *
 * @module dsh-agent-observe
 */

import { z } from 'zod'
import { startAggregator } from './aggregator.js'
import { registerTools } from './tools.js'
import { resolvePricing } from './pricing.js'
import { createAgentObserveProjection } from './projection.js'
import { judgePluginCase } from './llm-case-generation.js'
import { listAvailableModels } from './model-catalog.js'
import { listEvaluationProfiles, loadEvaluationProfiles } from './evaluation-standards.js'
import { registerEvaluationProfilesRoute, registerGeneratedCaseValidationRoute, registerInstalledPluginsRoute, registerModelsRoute, registerPluginValidationRoute, registerPortableCasePlanRoute, registerPortableSecurityCaseRoute, runPluginValidation, runPortablePluginPlan, runPortablePluginSecurityCase } from './plugin-validation-runner.js'

export const name = 'agent-observe'

export const inject = ['tools', 'sessionProjections', 'llm', 'agentDefaultModel']

/**
 * @typedef {Object} Config
 * @property {Record<string, {inputPer1k: number, outputPer1k: number}>} [pricing]
 * @property {number} [retentionDays]
 * @property {number} [maxSessions]
 */

export const Config = z.object({
  pricing: z.record(z.object({
    inputPer1k: z.number().nonnegative(),
    outputPer1k: z.number().nonnegative(),
  })).optional(),
  retentionDays: z.number().int().positive().default(90),
  maxSessions: z.number().int().positive().default(10000),
})

/**
 * Apply the agent observability plugin.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Config} config
 */
export function apply(ctx, config) {
  const resolved = Config.parse(config ?? {})
  ctx.logger?.info?.('[agent-observe] apply entered')
  const pricing = resolvePricing(resolved.pricing)

  ctx.sessionProjections.register(createAgentObserveProjection(pricing))

  // ── In-memory state ───────────────────────────────────────

  /** @type {Map<string, object>} */
  const sessionMetrics = new Map()

  /** @type {Map<string, object>} */
  const hourlyBuckets = new Map()

  // ── Callbacks ─────────────────────────────────────────────

  /**
   * Called when a session's metrics change (turn end).
   * Prunes old sessions if over maxSessions.
   */
  function onSessionUpdate(sessionId) {
    // Prune if over limit
    if (sessionMetrics.size > resolved.maxSessions) {
      const entries = Array.from(sessionMetrics.entries())
      entries.sort((a, b) => a[1].lastActiveAt - b[1].lastActiveAt)
      const toRemove = entries.slice(0, entries.length - resolved.maxSessions)
      for (const [id] of toRemove) {
        sessionMetrics.delete(id)
      }
    }
  }

  /**
   * Called when an hourly bucket changes.
   * Prunes old buckets.
   */
  function onHourlyUpdate(_windowKey) {
    const cutoff = Date.now() - resolved.retentionDays * 24 * 60 * 60 * 1000
    for (const [key] of hourlyBuckets) {
      // Parse window key to timestamp
      const bucketTime = new Date(key + ':00:00Z').getTime()
      if (bucketTime < cutoff) {
        hourlyBuckets.delete(key)
      }
    }
  }

  // ── Start aggregator ──────────────────────────────────────

  ctx.effect(() => startAggregator(
    ctx, { pricing }, sessionMetrics, hourlyBuckets,
    onSessionUpdate, onHourlyUpdate
  ), 'agent-observe:aggregator')

  // ── Register tools ────────────────────────────────────────

  registerTools(ctx, sessionMetrics, hourlyBuckets)

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => registerInstalledPluginsRoute(webCtx.webServer), 'agent-observe:installed-plugins-route')
    webCtx.effect(() => registerModelsRoute(webCtx.webServer, () => listAvailableModels(ctx)), 'agent-observe:models-route')
    webCtx.effect(() => registerEvaluationProfilesRoute(webCtx.webServer, listEvaluationProfiles, loadEvaluationProfiles), 'agent-observe:evaluation-profiles-route')
    webCtx.effect(() => registerGeneratedCaseValidationRoute(webCtx.webServer, request => runPluginValidation({
      ...request,
      validate: item => judgePluginCase(ctx, { ...item, model: request.model }),
    })), 'agent-observe:generated-case-validation-route')
    webCtx.effect(() => registerPluginValidationRoute(webCtx.webServer), 'agent-observe:plugin-validation-route')
    webCtx.effect(() => registerPortableCasePlanRoute(webCtx.webServer, runPortablePluginPlan), 'agent-observe:portable-plan-route')
    webCtx.effect(() => registerPortableSecurityCaseRoute(webCtx.webServer, runPortablePluginSecurityCase), 'agent-observe:portable-security-case-route')
  })

  // ── Log startup ───────────────────────────────────────────

  ctx.logger?.info?.(
    `[agent-observe] Started. Tracking sessions with ${Object.keys(pricing).length} pricing entries.`
  )
}
