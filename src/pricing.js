/**
 * Model pricing table and cost calculation.
 * @module dsh-agent-observe/pricing
 */

/**
 * Default pricing table (USD per 1K tokens).
 * Users can override via config.
 * @type {Record<string, {inputPer1k: number, outputPer1k: number}>}
 */
export const DEFAULT_PRICING = {
  'deepseek-v4-pro':      { inputPer1k: 0.002,  outputPer1k: 0.008 },
  'deepseek-v4-flash':    { inputPer1k: 0.001,  outputPer1k: 0.004 },
  'doubao-seed-2-1-turbo': { inputPer1k: 0.0008, outputPer1k: 0.002 },
  'doubao-seed-2.0-lite': { inputPer1k: 0.0003, outputPer1k: 0.001 },
  'glm-5.3':              { inputPer1k: 0.001,  outputPer1k: 0.004 },
  'glm-5.2':              { inputPer1k: 0.0008, outputPer1k: 0.003 },
  'kimi-k2.7-code':       { inputPer1k: 0.001,  outputPer1k: 0.004 },
  'kimi-k2.6':            { inputPer1k: 0.0008, outputPer1k: 0.003 },
  'minimax-m3':           { inputPer1k: 0.0005, outputPer1k: 0.002 },
  'minimax-m2.7':         { inputPer1k: 0.0003, outputPer1k: 0.001 },
}

/** Default pricing for unknown models. */
const DEFAULT_FALLBACK = { inputPer1k: 0.001, outputPer1k: 0.004 }

/**
 * Calculate cost from token usage.
 * @param {number} tokenIn
 * @param {number} tokenOut
 * @param {string} model
 * @param {Record<string, {inputPer1k: number, outputPer1k: number}>} pricing
 * @returns {number} cost in USD
 */
export function calculateCost(tokenIn, tokenOut, model, pricing) {
  const rate = pricing[model] || DEFAULT_FALLBACK
  return (tokenIn / 1000) * rate.inputPer1k + (tokenOut / 1000) * rate.outputPer1k
}

/**
 * Merge user pricing overrides with defaults.
 * @param {Record<string, {inputPer1k: number, outputPer1k: number}>} [overrides]
 * @returns {Record<string, {inputPer1k: number, outputPer1k: number}>}
 */
export function resolvePricing(overrides) {
  return { ...DEFAULT_PRICING, ...(overrides || {}) }
}

/**
 * Format cost as USD string.
 * @param {number} cost
 * @returns {string}
 */
export function formatCost(cost) {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Format token count with K/M suffix.
 * @param {number} tokens
 * @returns {string}
 */
export function formatTokens(tokens) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}