/**
 * Model-facing tools for agent observability.
 * Registers agent_stats, agent_cost, agent_audit on ctx.tools.
 * @module dsh-agent-observe/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { formatCost, formatTokens } from './pricing.js'

/**
 * Register all observability tools on the given context.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Map<string, object>} sessionMetrics
 * @param {Map<string, object>} hourlyBuckets
 */
export function registerTools(ctx, sessionMetrics, hourlyBuckets) {
  // ── agent_stats ───────────────────────────────────────────

  ctx.tools.register(defineTool({
    name: 'agent_stats',
    description: 'Get agent observability statistics: overall summary, per-session stats, or time-filtered view. Use this to understand agent behavior patterns, tool usage distribution, and error rates.',
    parameters: {
      scope: {
        type: 'string',
        description: 'Query scope: "overall" (all sessions), "today", "week", or a specific sessionId'
      },
      cwd: {
        type: 'string',
        description: 'Filter by project directory (cwd)'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }]
    },
    async execute(args) {
      const scope = args.scope || 'overall'
      const allMetrics = Array.from(sessionMetrics.values())

      // Filter by cwd if specified
      const filtered = args.cwd
        ? allMetrics.filter(m => m.cwd === args.cwd)
        : allMetrics

      if (filtered.length === 0) {
        return 'No session data available yet.'
      }

      // Per-session view
      if (scope !== 'overall' && scope !== 'today' && scope !== 'week') {
        const m = sessionMetrics.get(scope)
        if (!m) return `No metrics found for session "${scope}".`
        return formatSessionDetail(m)
      }

      // Time filter
      let timeFiltered = filtered
      const now = Date.now()
      if (scope === 'today') {
        const todayStart = new Date().setHours(0, 0, 0, 0)
        timeFiltered = filtered.filter(m => m.lastActiveAt >= todayStart)
      } else if (scope === 'week') {
        const weekStart = now - 7 * 24 * 60 * 60 * 1000
        timeFiltered = filtered.filter(m => m.lastActiveAt >= weekStart)
      }

      return formatOverallStats(timeFiltered)
    }
  }))

  // ── agent_cost ─────────────────────────────────────────────

  ctx.tools.register(defineTool({
    name: 'agent_cost',
    description: 'Get cost breakdown for agent usage. Group by model, session, project, or daily to understand where tokens and money are being spent.',
    parameters: {
      period: {
        type: 'string',
        description: 'Time period: "today", "week", "month", "all" (default)'
      },
      groupBy: {
        type: 'string',
        description: 'Group results by: "model" (default), "session", "cwd", or "daily"'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }]
    },
    async execute(args) {
      const period = args.period || 'all'
      const groupBy = args.groupBy || 'model'
      const allMetrics = Array.from(sessionMetrics.values())

      if (allMetrics.length === 0) {
        return 'No cost data available yet.'
      }

      // Time filter
      const now = Date.now()
      let filtered = allMetrics
      if (period === 'today') {
        const todayStart = new Date().setHours(0, 0, 0, 0)
        filtered = allMetrics.filter(m => m.lastActiveAt >= todayStart)
      } else if (period === 'week') {
        const weekStart = now - 7 * 24 * 60 * 60 * 1000
        filtered = allMetrics.filter(m => m.lastActiveAt >= weekStart)
      } else if (period === 'month') {
        const monthStart = now - 30 * 24 * 60 * 60 * 1000
        filtered = allMetrics.filter(m => m.lastActiveAt >= monthStart)
      }

      if (filtered.length === 0) {
        return `No cost data for period "${period}".`
      }

      return formatCostReport(filtered, groupBy, period)
    }
  }))

  // ── agent_audit ────────────────────────────────────────────

  ctx.tools.register(defineTool({
    name: 'agent_audit',
    description: 'Audit a specific session: see every turn, tool call, error, and approval in chronological order. Use this to investigate what an agent did, when, and why.',
    parameters: {
      sessionId: {
        type: 'string',
        required: true,
        description: 'The session ID to audit'
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }]
    },
    async execute(args) {
      const m = sessionMetrics.get(args.sessionId)
      if (!m) {
        return `No metrics found for session "${args.sessionId}". The session may not exist or may have been created before this plugin was loaded.`
      }
      return formatAuditReport(m)
    }
  }))
}

// ── Formatting helpers ──────────────────────────────────────

function formatOverallStats(metrics) {
  if (metrics.length === 0) return 'No data.'

  const total = metrics.reduce((acc, m) => {
    acc.turns += m.turnCount
    acc.steps += m.stepCount
    acc.toolCalls += m.toolCallTotal
    acc.toolErrors += m.toolErrorTotal
    acc.tokenIn += m.tokenIn
    acc.tokenOut += m.tokenOut
    acc.cost += m.estimatedCost
    acc.approvals += m.approvalCount
    acc.denied += m.approvalDenied
    return acc
  }, { turns: 0, steps: 0, toolCalls: 0, toolErrors: 0, tokenIn: 0, tokenOut: 0, cost: 0, approvals: 0, denied: 0 })

  // Aggregate tool usage across all sessions
  const toolTotals = {}
  for (const m of metrics) {
    for (const [name, count] of Object.entries(m.toolCalls || {})) {
      toolTotals[name] = (toolTotals[name] || 0) + count
    }
  }
  const topTools = Object.entries(toolTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const avgSteps = total.turns > 0 ? (total.steps / total.turns).toFixed(1) : '0'
  const errorRate = total.toolCalls > 0 ? ((total.toolErrors / total.toolCalls) * 100).toFixed(1) : '0'
  const approvalRate = total.approvals > 0 ? (((total.approvals - total.denied) / total.approvals) * 100).toFixed(0) : '100'

  const lines = [
    `# Agent Statistics`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Sessions | ${metrics.length} |`,
    `| Total Turns | ${total.turns} |`,
    `| Total Steps | ${total.steps} |`,
    `| Avg Steps/Turn | ${avgSteps} |`,
    `| Total Tokens | ${formatTokens(total.tokenIn)} in / ${formatTokens(total.tokenOut)} out |`,
    `| Estimated Cost | ${formatCost(total.cost)} |`,
    `| Tool Calls | ${total.toolCalls} |`,
    `| Tool Error Rate | ${errorRate}% |`,
    `| Approval Rate | ${approvalRate}% |`,
    ``,
    `## Top Tools`,
    ``,
  ]

  if (topTools.length > 0) {
    const maxCount = topTools[0][1]
    for (const [name, count] of topTools) {
      const bar = '█'.repeat(Math.max(1, Math.round((count / maxCount) * 20)))
      const pct = total.toolCalls > 0 ? ((count / total.toolCalls) * 100).toFixed(0) : '0'
      lines.push(`| ${name} | ${bar} | ${count} (${pct}%) |`)
    }
  } else {
    lines.push('(no tool calls recorded)')
  }

  return lines.join('\n')
}

function formatSessionDetail(m) {
  const topTools = Object.entries(m.toolCalls || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const lines = [
    `# Session: ${m.sessionId}`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Model | ${m.model || 'unknown'} |`,
    `| Project | ${m.cwd || 'unknown'} |`,
    `| Turns | ${m.turnCount} |`,
    `| Steps | ${m.stepCount} (avg ${m.avgStepsPerTurn.toFixed(1)}/turn) |`,
    `| Tokens | ${formatTokens(m.tokenIn)} in / ${formatTokens(m.tokenOut)} out |`,
    `| Cost | ${formatCost(m.estimatedCost)} |`,
    `| Tool Calls | ${m.toolCallTotal} |`,
    `| Tool Errors | ${m.toolErrorTotal} |`,
    `| Approvals | ${m.approvalCount} (${m.approvalDenied} denied) |`,
    `| Duration | ${formatDuration(m.duration)} |`,
    ``,
  ]

  if (topTools.length > 0) {
    lines.push(`## Tools Used`, ``)
    for (const [name, count] of topTools) {
      lines.push(`- ${name}: ${count}`)
    }
  }

  return lines.join('\n')
}

function formatCostReport(metrics, groupBy, period) {
  const total = metrics.reduce((sum, m) => sum + m.estimatedCost, 0)
  const totalTokensIn = metrics.reduce((sum, m) => sum + m.tokenIn, 0)
  const totalTokensOut = metrics.reduce((sum, m) => sum + m.tokenOut, 0)

  const lines = [
    `# Cost Report (${period})`,
    ``,
    `| Summary | Value |`,
    `|---------|-------|`,
    `| Sessions | ${metrics.length} |`,
    `| Total Tokens | ${formatTokens(totalTokensIn)} in / ${formatTokens(totalTokensOut)} out |`,
    `| Total Cost | ${formatCost(total)} |`,
    ``,
  ]

  if (groupBy === 'model') {
    const byModel = {}
    for (const m of metrics) {
      const key = m.model || 'unknown'
      if (!byModel[key]) byModel[key] = { cost: 0, tokens: 0, sessions: 0 }
      byModel[key].cost += m.estimatedCost
      byModel[key].tokens += m.tokenIn + m.tokenOut
      byModel[key].sessions++
    }
    const sorted = Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost)

    lines.push(`## By Model`, ``)
    for (const [model, data] of sorted) {
      const pct = total > 0 ? ((data.cost / total) * 100).toFixed(0) : '0'
      lines.push(`| ${model} | ${formatCost(data.cost)} (${pct}%) | ${data.sessions} sessions | ${formatTokens(data.tokens)} tokens |`)
    }
  } else if (groupBy === 'session') {
    const sorted = [...metrics].sort((a, b) => b.estimatedCost - a.estimatedCost).slice(0, 20)
    lines.push(`## Top Sessions by Cost`, ``)
    for (const m of sorted) {
      lines.push(`| ${m.sessionId.slice(0, 12)}... | ${formatCost(m.estimatedCost)} | ${m.turnCount} turns | ${m.model || '?'} |`)
    }
  } else if (groupBy === 'cwd') {
    const byCwd = {}
    for (const m of metrics) {
      const key = m.cwd || 'unknown'
      if (!byCwd[key]) byCwd[key] = { cost: 0, sessions: 0 }
      byCwd[key].cost += m.estimatedCost
      byCwd[key].sessions++
    }
    const sorted = Object.entries(byCwd).sort((a, b) => b[1].cost - a[1].cost)
    lines.push(`## By Project`, ``)
    for (const [cwd, data] of sorted) {
      const pct = total > 0 ? ((data.cost / total) * 100).toFixed(0) : '0'
      lines.push(`| ${cwd} | ${formatCost(data.cost)} (${pct}%) | ${data.sessions} sessions |`)
    }
  } else if (groupBy === 'daily') {
    const byDay = {}
    for (const m of metrics) {
      const day = new Date(m.lastActiveAt).toISOString().slice(0, 10)
      if (!byDay[day]) byDay[day] = { cost: 0, tokens: 0 }
      byDay[day].cost += m.estimatedCost
      byDay[day].tokens += m.tokenIn + m.tokenOut
    }
    const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))
    lines.push(`## Daily Breakdown`, ``)
    const maxCost = Math.max(...sorted.map(([, d]) => d.cost), 0.01)
    for (const [day, data] of sorted) {
      const bar = '█'.repeat(Math.max(1, Math.round((data.cost / maxCost) * 15)))
      lines.push(`| ${day} | ${bar} | ${formatCost(data.cost)} | ${formatTokens(data.tokens)} |`)
    }
  }

  return lines.join('\n')
}

function formatAuditReport(m) {
  const lines = [
    `# Session Audit: ${m.sessionId}`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Model | ${m.model || 'unknown'} |`,
    `| Project | ${m.cwd || 'unknown'} |`,
    `| Preset | ${m.agentPreset || 'default'} |`,
    `| Created | ${new Date(m.createdAt).toISOString()} |`,
    `| Last Active | ${new Date(m.lastActiveAt).toISOString()} |`,
    `| Duration | ${formatDuration(m.duration)} |`,
    ``,
    `## Behavior Summary`,
    ``,
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Turns | ${m.turnCount} |`,
    `| Steps | ${m.stepCount} (avg ${m.avgStepsPerTurn.toFixed(1)}/turn) |`,
    `| Tool Calls | ${m.toolCallTotal} |`,
    `| Tool Errors | ${m.toolErrorTotal} |`,
    `| Tokens | ${formatTokens(m.tokenIn)} in / ${formatTokens(m.tokenOut)} out |`,
    `| Cost | ${formatCost(m.estimatedCost)} |`,
    `| Approvals | ${m.approvalCount} requested, ${m.approvalDenied} denied |`,
    ``,
  ]

  // Tool usage breakdown
  const tools = Object.entries(m.toolCalls || {})
  if (tools.length > 0) {
    tools.sort((a, b) => b[1] - a[1])
    lines.push(`## Tool Usage`, ``)
    for (const [name, count] of tools) {
      const errors = m.toolErrors?.[name] || 0
      const status = errors > 0 ? ` (${errors} errors)` : ''
      lines.push(`- ${name}: ${count} calls${status}`)
    }
    lines.push('')
  }

  // Anomaly flags
  const flags = []
  if (m.avgStepsPerTurn > 5) flags.push(`⚠️ High avg steps/turn (${m.avgStepsPerTurn.toFixed(1)}) — may indicate inefficient tool use`)
  if (m.toolErrorTotal > 0 && m.toolCallTotal > 0 && (m.toolErrorTotal / m.toolCallTotal) > 0.2) {
    flags.push(`⚠️ High tool error rate (${((m.toolErrorTotal / m.toolCallTotal) * 100).toFixed(0)}%)`)
  }
  if (m.approvalDenied > 0) flags.push(`🔒 ${m.approvalDenied} approval(s) denied`)
  if (flags.length > 0) {
    lines.push(`## Anomalies`, ``)
    for (const flag of flags) lines.push(flag)
  }

  return lines.join('\n')
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.round((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}