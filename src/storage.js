/**
 * Storage-domain schema for agent observability metrics.
 * Two tables: sessions (per-session metrics) and hourly (time-window buckets).
 * @module dsh-agent-observe/storage
 */

import { z } from 'zod'

// ── Primitives ──────────────────────────────────────────────

const nonNegativeInt = z.number().int().nonnegative()
const toolCountsSchema = z.record(z.string(), nonNegativeInt)

// ── Session Metrics ─────────────────────────────────────────

export const sessionMetricsSchema = z.object({
  // Identity
  sessionId: z.string().min(1),
  cwd: z.string().optional(),
  model: z.string().optional(),
  agentPreset: z.string().optional(),

  // Behavior
  turnCount: nonNegativeInt,
  stepCount: nonNegativeInt,
  avgStepsPerTurn: z.number().nonnegative(),

  // Tool usage
  toolCallTotal: nonNegativeInt,
  toolCalls: toolCountsSchema,
  toolErrorTotal: nonNegativeInt,
  toolErrors: toolCountsSchema,

  // Token & cost
  tokenIn: nonNegativeInt,
  tokenOut: nonNegativeInt,
  estimatedCost: z.number().nonnegative(),

  // Approval
  approvalCount: nonNegativeInt,
  approvalDenied: nonNegativeInt,

  // Time
  createdAt: nonNegativeInt,
  lastActiveAt: nonNegativeInt,
  duration: nonNegativeInt,
})

/** @typedef {z.infer<typeof sessionMetricsSchema>} SessionMetrics */

// ── Hourly Bucket ───────────────────────────────────────────

export const hourlyBucketSchema = z.object({
  window: z.string().min(1),           // "2025-01-15T14"
  sessionCount: nonNegativeInt,
  turnCount: nonNegativeInt,
  stepCount: nonNegativeInt,
  toolCallTotal: nonNegativeInt,
  tokenIn: nonNegativeInt,
  tokenOut: nonNegativeInt,
  totalCost: z.number().nonnegative(),
  errorCount: nonNegativeInt,
  uniqueModels: z.array(z.string()),
  uniqueCwds: z.array(z.string()),
})

/** @typedef {z.infer<typeof hourlyBucketSchema>} HourlyBucket */

// ── Domain declaration ──────────────────────────────────────

/**
 * Declare the agent_observe domain for storage-domain.
 * Call this in plugin init to register the schema.
 * @param {import('@deepseek-ai/dsh-storage-domain').DomainFacility} storageDomain
 * @returns {Promise<import('@deepseek-ai/dsh-storage-domain').DomainHandle>}
 */
export async function openObserveDomain(storageDomain) {
  // We use a simplified approach: store serialized JSON objects
  // in a single domain with two tables
  const { defineDomain, domainTable } = await import('@deepseek-ai/dsh-storage-domain')

  const spec = defineDomain({
    name: 'agent_observe',
    version: 0,
    tables: {
      sessions: domainTable(sessionMetricsSchema),
      hourly: domainTable(hourlyBucketSchema),
    },
  })

  return storageDomain.open(spec)
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Create a fresh (zeroed) session metrics object.
 * @param {string} sessionId
 * @param {object} [meta]
 * @returns {SessionMetrics}
 */
export function createSessionMetrics(sessionId, meta = {}) {
  return {
    sessionId,
    cwd: meta.cwd,
    model: meta.model,
    agentPreset: meta.agentPreset,
    turnCount: 0,
    stepCount: 0,
    avgStepsPerTurn: 0,
    toolCallTotal: 0,
    toolCalls: {},
    toolErrorTotal: 0,
    toolErrors: {},
    tokenIn: 0,
    tokenOut: 0,
    estimatedCost: 0,
    approvalCount: 0,
    approvalDenied: 0,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    duration: 0,
  }
}

/**
 * Create a fresh hourly bucket.
 * @param {string} window
 * @returns {HourlyBucket}
 */
export function createHourlyBucket(window) {
  return {
    window,
    sessionCount: 0,
    turnCount: 0,
    stepCount: 0,
    toolCallTotal: 0,
    tokenIn: 0,
    tokenOut: 0,
    totalCost: 0,
    errorCount: 0,
    uniqueModels: [],
    uniqueCwds: [],
  }
}

/**
 * Get the hourly window key for a given timestamp.
 * @param {number} ts - Unix milliseconds
 * @returns {string} e.g. "2025-01-15T14"
 */
export function hourlyWindowKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}`
}