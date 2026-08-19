import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, sep } from 'node:path'

function check(id, passed, reason) {
  return reason ? { id, passed, reason } : { id, passed }
}

function workspacePath(root, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || relativePath.includes('\0')) {
    throw new Error('portable case workspace path is invalid')
  }
  if (relativePath.startsWith('/') || relativePath.split('/').includes('..')) {
    throw new Error('portable case workspace path must be relative')
  }
  const path = resolve(root, relativePath)
  const boundary = root.endsWith(sep) ? root : `${root}${sep}`
  if (path !== root && !path.startsWith(boundary)) throw new Error('portable case workspace path escapes workspace')
  return path
}

async function setupPlan(root, plan, environment) {
  if (!Array.isArray(plan.setup)) throw new Error('portable case setup must be an array')
  for (const action of plan.setup) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error('portable case setup action must be an object')
    if (action.op === 'environment.set') {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(action.name) || typeof action.value !== 'string' || action.value.includes('\0')) {
        throw new Error('portable case environment action is invalid')
      }
      environment[action.name] = action.value
      continue
    }
    if (action.op !== 'workspace.write' && action.op !== 'workspace.read') {
      throw new Error(`portable case setup operation is unsupported: ${String(action.op)}`)
    }
    const path = workspacePath(root, action.path)
    if (action.op === 'workspace.write') {
      if (typeof action.content !== 'string') throw new Error('portable case workspace.write content is required')
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, action.content, 'utf8')
    } else {
      await readFile(path, 'utf8')
    }
  }
}

function evaluateAssertions(assertions, output) {
  return assertions.map((assertion, index) => {
    const passed = assertion.op === 'output.equals'
      ? output === assertion.value
      : assertion.op === 'output.contains'
        ? output.includes(assertion.value)
        : !output.includes(assertion.value)
    const id = `assertion-${index + 1}`
    return check(id, passed, passed ? undefined : `输出未满足 ${assertion.op} 断言`)
  })
}

export async function runPortableCasePlan({ plan, runPlugin, baseEnvironment = {} } = {}) {
  if (!plan || typeof plan !== 'object') throw new Error('portable case plan is required')
  if (typeof runPlugin !== 'function') throw new Error('portable case plan runPlugin is required')
  if (!plan.run || plan.run.op !== 'plugin.prompt' || typeof plan.run.input !== 'string' || !plan.run.input) {
    throw new Error('portable case plugin.prompt action is required')
  }
  if (!Array.isArray(plan.assertions) || plan.assertions.length === 0) throw new Error('portable case assertions are required')
  for (const assertion of plan.assertions) {
    if (!assertion || typeof assertion !== 'object' || !['output.equals', 'output.contains', 'output.notContains'].includes(assertion.op) || typeof assertion.value !== 'string') {
      throw new Error('portable case assertion is invalid')
    }
  }

  const root = await mkdtemp(resolve(tmpdir(), 'dsh-portable-case-'))
  const environment = { ...baseEnvironment }
  const startedAt = Date.now()
  try {
    await setupPlan(root, plan, environment)
    const execution = await runPlugin({ input: plan.run.input, cwd: root, env: environment })
    const output = typeof execution.output === 'string' ? execution.output : String(execution.output ?? '')
    const checks = [
      ...(execution.exitCode && execution.exitCode !== 0
        ? [check('plugin-exit-code', false, '插件运行失败')]
        : []),
      ...evaluateAssertions(plan.assertions, output),
    ]
    const reasons = checks.filter(item => !item.passed).map(item => item.reason)
    return {
      status: reasons.length === 0 ? 'passed' : 'failed',
      reasons,
      checks,
      actualOutput: output,
      exitCode: execution.exitCode ?? 0,
      durationMs: Date.now() - startedAt,
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
