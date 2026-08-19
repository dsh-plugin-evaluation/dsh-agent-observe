import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { delimiter, resolve } from 'node:path'
import { evaluatePromptInjectionOutput } from './security-evaluator.js'
import { runPortableCasePlan } from './portable-case-plan-runner.js'
import { combinePromptInjectionEvaluation, promptInjectionCaseToPortablePlan } from './portable-case-adapter.js'

const DSH_ROOT = process.env.DSH_ROOT ?? process.cwd()
const DSH_HOME = process.env.DSH_HOME ?? resolve(DSH_ROOT, '.dsh')
const DEMO_PLUGIN = process.env.DSH_DEMO_PLUGIN ?? resolve(DSH_ROOT, 'demo-plugin')
const HEADLESS_BUNDLE = resolve(DSH_ROOT, 'packages/bundle/headless')
const CLI = resolve(DSH_ROOT, 'apps/cli/lib/bin.js')

function validationEnv() {
  return { ...process.env, DSH_HOME }
}

const WEB_PROFILE_PACKAGE = `${DSH_HOME}/profiles/web/package.json`
const CORE_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'])

export async function listInstalledPlugins({ readPackage = path => readFile(path, 'utf8') } = {}) {
  const profile = JSON.parse(await readPackage(WEB_PROFILE_PACKAGE))
  const bundles = profile.dsh?.profile?.bundles
  if (!Array.isArray(bundles)) return []
  return Promise.all(bundles.filter(bundle => typeof bundle === 'string' && !CORE_BUNDLES.has(bundle)).map(async id => {
    const dependency = profile.dependencies?.[id]
    if (typeof dependency !== 'string') return { id, name: id, description: '', available: false }
    const packagePath = dependency.startsWith('link:') ? resolve(dependency.slice('link:'.length), 'package.json') : undefined
    if (packagePath === undefined) return { id, name: id, description: '', available: false }
    try {
      const manifest = JSON.parse(await readPackage(packagePath))
      return { id, name: manifest.name ?? id, description: manifest.description ?? '', available: true }
    } catch {
      return { id, name: id, description: '', available: false }
    }
  }))
}

export async function readInstalledPluginManifest(pluginId, { readPackage = path => readFile(path, 'utf8') } = {}) {
  const profile = JSON.parse(await readPackage(WEB_PROFILE_PACKAGE))
  if (!profile.dsh?.profile?.bundles?.includes(pluginId)) throw new Error('插件不在当前 Web Profile 中')
  const dependency = profile.dependencies?.[pluginId]
  if (typeof dependency !== 'string' || !dependency.startsWith('link:')) throw new Error('插件 manifest 不可读取')
  const packagePath = resolve(dependency.slice('link:'.length), 'package.json')
  return JSON.parse(await readPackage(packagePath))
}

export function parseGeneratedCases(text, count) {
  const normalized = text.trim().replace(/^```json\s*|\s*```$/g, '')
  const arrays = []
  for (let start = normalized.indexOf('['); start >= 0; start = normalized.indexOf('[', start + 1)) {
    let depth = 0
    let quoted = false
    let escaped = false
    for (let end = start; end < normalized.length; end += 1) {
      const char = normalized[end]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
        continue
      }
      if (char === '"') quoted = true
      else if (char === '[') depth += 1
      else if (char === ']') {
        depth -= 1
        if (depth === 0) {
          try {
            const value = JSON.parse(normalized.slice(start, end + 1))
            if (Array.isArray(value)) arrays.push(value)
          } catch {}
          break
        }
      }
    }
  }
  const value = arrays[0]
  if (value === undefined) throw new Error('模型没有返回有效的 JSON 用例')
  const cases = value.slice(0, count).map((item, index) => {
    if (typeof item !== 'object' || item === null || typeof item.title !== 'string' || typeof item.prompt !== 'string' || typeof item.expected !== 'string') {
      throw new Error(`第 ${index + 1} 条用例缺少 title、prompt 或 expected`)
    }
    const title = item.title.trim()
    const prompt = item.prompt.trim()
    const expected = item.expected.trim()
    if (!title || !prompt || !expected) throw new Error(`第 ${index + 1} 条用例不能为空`)
    return { id: `generated-${index + 1}`, title, prompt, expected }
  })
  if (cases.length === 0) throw new Error('模型未生成测试用例')
  return cases
}

export const demoKnowledgeCases = [
  {
    id: 'refund-window',
    prompt: '请使用 demo_knowledge_lookup 工具查询退款时限，并只回答查询到的退款申请默认时限。',
    expected: '30 天',
  },
  {
    id: 'shipping-sla',
    prompt: '请使用 demo_knowledge_lookup 工具查询标准配送，并只回答查询到的标准配送承诺时效。',
    expected: '3 个工作日',
  },
  {
    id: 'invoice-channel',
    prompt: '请使用 demo_knowledge_lookup 工具查询电子发票，并只回答查询到的电子发票发送渠道。',
    expected: '订单绑定邮箱',
  },
]

async function executable(path, accessFile = access) {
  try {
    await accessFile(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export async function resolveNodeExecutable({ current = process.execPath, pathEnv = process.env.PATH, accessFile = access } = {}) {
  if (current && await executable(current, accessFile)) return current
  for (const directory of (pathEnv ?? '').split(delimiter).filter(Boolean)) {
    const candidate = resolve(directory, process.platform === 'win32' ? 'node.exe' : 'node')
    if (await executable(candidate, accessFile)) return candidate
  }
  throw new Error('运行环境失败：找不到可用的 Node.js 可执行文件')
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.once('error', error => reject(error.code === 'ENOENT' ? new Error(`运行环境失败：无法启动 ${command}`) : error))
    child.once('close', code => resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }))
  })
}

async function executeNode(args, options, execute = run, resolveNode = resolveNodeExecutable) {
  const node = await resolveNode()
  return execute(node, args, options)
}

async function ensureDemoProfile(execute, resolveNode) {
  if (!DEMO_PLUGIN) throw new Error('未配置 DSH_DEMO_PLUGIN')
  const result = await executeNode([CLI, 'plugin', '--profile', 'plugin-eval', 'add', `link:${DEMO_PLUGIN}`, `link:${HEADLESS_BUNDLE}`], { cwd: DSH_ROOT, env: validationEnv() }, execute, resolveNode)
  if (result.code !== 0) throw new Error(result.stderr || '无法初始化插件验证环境')
}

function pluginProfileName(pluginId) {
  return `plugin-eval-${pluginId.replace(/[^a-z0-9-]/gi, '-').slice(0, 48)}`
}

async function installedPluginLink(pluginId, readPackage = path => readFile(path, 'utf8')) {
  const profile = JSON.parse(await readPackage(WEB_PROFILE_PACKAGE))
  const dependency = profile.dependencies?.[pluginId]
  if (typeof dependency !== 'string' || !dependency.startsWith('link:')) throw new Error('该插件不支持隔离执行')
  return dependency
}

export async function runPluginValidation({ pluginId, cases, validate, execute = run, resolveNode = resolveNodeExecutable, readPackage } = {}) {
  if (typeof pluginId !== 'string' || pluginId.length === 0) throw new Error('请选择插件')
  if (!Array.isArray(cases) || cases.length === 0) throw new Error('至少选择一条测试用例')
  const profile = pluginProfileName(pluginId)
  const pluginLink = await installedPluginLink(pluginId, readPackage)
  const setup = await executeNode([CLI, 'plugin', '--profile', profile, 'add', pluginLink, `link:${HEADLESS_BUNDLE}`], { cwd: DSH_ROOT, env: validationEnv() }, execute, resolveNode)
  if (setup.code !== 0) throw new Error(setup.stderr || '无法初始化隔离插件环境')
  const startedAt = Date.now()
  const results = []
  for (const item of cases) {
    const caseStartedAt = Date.now()
    const prompt = item.type === 'prompt-injection' ? item.input : item.prompt
    const output = await executeNode([CLI, '--profile', profile, prompt], { cwd: DSH_ROOT, env: validationEnv() }, execute, resolveNode)
    const text = output.stdout
    let passed = false
    let error = output.code === 0 ? null : output.stderr || '验证运行失败'
    let evaluation
    if (output.code === 0) {
      try {
        evaluation = item.type === 'prompt-injection'
          ? evaluatePromptInjectionOutput({ output: text, expectedOutput: item.expectedOutput })
          : { status: await validate({ prompt, expected: item.expected, output: text }) ? 'passed' : 'failed', reasons: [], checks: [], actualOutput: text }
        passed = evaluation.status === 'passed'
        if (!passed) error = evaluation.reasons.join('；') || '未满足评测要求'
      } catch (failure) {
        error = `模型判定失败：${failure instanceof Error ? failure.message : String(failure)}`
      }
    }
    results.push({ id: item.id, title: item.title, expected: item.expected, profileId: item.profileId, profileName: item.profileName, profileVersion: item.profileVersion, output: text, durationMs: Date.now() - caseStartedAt, passed, error, evaluation })
  }
  const passedCases = results.filter(item => item.passed).length
  return { plugin: pluginId, status: passedCases === results.length ? 'passed' : passedCases === 0 ? 'failed' : 'partial', totalCases: results.length, passedCases, durationMs: Date.now() - startedAt, cases: results, recordedAt: Date.now() }
}

export async function runPortablePluginPlan({ pluginId, plan, execute = run, resolveNode = resolveNodeExecutable, readPackage } = {}) {
  if (typeof pluginId !== 'string' || pluginId.length === 0) throw new Error('请选择插件')
  if (!plan || typeof plan !== 'object') throw new Error('portable case plan is required')
  const profile = pluginProfileName(pluginId)
  const pluginLink = await installedPluginLink(pluginId, readPackage)
  const setup = await executeNode([CLI, 'plugin', '--profile', profile, 'add', pluginLink, `link:${HEADLESS_BUNDLE}`], { cwd: DSH_ROOT, env: validationEnv() }, execute, resolveNode)
  if (setup.code !== 0) throw new Error(setup.stderr || '无法初始化隔离插件环境')

  return runPortableCasePlan({
    plan,
    baseEnvironment: validationEnv(),
    async runPlugin({ input, cwd, env }) {
      const result = await executeNode([CLI, '--profile', profile, input], {
        cwd,
        env: { ...env, DSH_HOME },
      }, execute, resolveNode)
      return { output: result.stdout, exitCode: result.code }
    },
  })
}

export async function runPortablePluginSecurityCase({ pluginId, testCase, execute = run, resolveNode = resolveNodeExecutable, readPackage } = {}) {
  const plan = promptInjectionCaseToPortablePlan(testCase)
  const result = await runPortablePluginPlan({ pluginId, plan, execute, resolveNode, readPackage })
  return combinePromptInjectionEvaluation({ portableResult: result, expectedOutput: testCase.expectedOutput })
}

export async function runDemoKnowledgeValidation({ execute = run, resolveNode = resolveNodeExecutable, caseIds = demoKnowledgeCases.map(item => item.id) } = {}) {
  const selected = demoKnowledgeCases.filter(item => caseIds.includes(item.id))
  if (selected.length === 0) throw new Error('至少选择一条测试用例')
  await ensureDemoProfile(execute, resolveNode)
  const startedAt = Date.now()
  const cases = []
  for (const item of selected) {
    const caseStartedAt = Date.now()
    const result = await executeNode([CLI, '--profile', 'plugin-eval', item.prompt], { cwd: DSH_ROOT, env: validationEnv() }, execute, resolveNode)
    const output = result.stdout
    const passed = result.code === 0 && output.includes(item.expected)
    cases.push({
      id: item.id,
      expected: item.expected,
      output,
      durationMs: Date.now() - caseStartedAt,
      passed,
      error: result.code === 0 ? null : result.stderr || '验证运行失败',
    })
  }
  const passedCases = cases.filter(item => item.passed).length
  return {
    plugin: 'demo-knowledge',
    status: passedCases === cases.length ? 'passed' : passedCases === 0 ? 'failed' : 'partial',
    totalCases: cases.length,
    passedCases,
    durationMs: Date.now() - startedAt,
    cases,
    recordedAt: Date.now(),
  }
}

function writeJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

export function registerInstalledPluginsRoute(webServer) {
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/installed-plugins',
    async handler(req, res) {
      if (req.method !== 'GET') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      try {
        writeJson(res, 200, { plugins: await listInstalledPlugins() })
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}

export function registerModelsRoute(webServer, listModels) {
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/models',
    async handler(req, res) {
      if (req.method !== 'GET') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      try {
        writeJson(res, 200, await listModels())
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}

export function registerEvaluationProfilesRoute(webServer, listProfiles, loadProfiles) {
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/evaluation-profiles',
    async handler(req, res) {
      if (req.method === 'GET') {
        try {
          writeJson(res, 200, { profiles: await listProfiles() })
        } catch (error) {
          writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      try {
        let body = {}
        try { body = await new Promise((resolve, reject) => {
          let raw = ''
          req.on('data', chunk => { raw += String(chunk) })
          req.once('end', () => resolve(raw ? JSON.parse(raw) : {}))
          req.once('error', reject)
        }) } catch { throw new Error('请求体必须是 JSON') }
        const profileIds = Array.isArray(body.profileIds) ? body.profileIds.filter(item => typeof item === 'string') : []
        writeJson(res, 200, { profiles: await loadProfiles(profileIds) })
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}

export function registerCaseGenerationRoute(webServer, generateCases) {
  let running = false
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/generate-cases',
    async handler(req, res) {
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      if (running) {
        writeJson(res, 409, { error: 'generation-running' })
        return
      }
      running = true
      try {
        let body = {}
        try { body = await new Promise((resolve, reject) => {
          let raw = ''
          req.on('data', chunk => { raw += String(chunk) })
          req.once('end', () => resolve(raw ? JSON.parse(raw) : {}))
          req.once('error', reject)
        }) } catch { throw new Error('请求体必须是 JSON') }
        const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
        const count = Math.min(20, Math.max(1, Number(body.count) || 5))
        const model = typeof body.model?.provider === 'string' && typeof body.model?.model === 'string'
          ? { provider: body.model.provider, model: body.model.model }
          : undefined
        if (!pluginId) throw new Error('请选择插件')
        const manifest = await readInstalledPluginManifest(pluginId)
        writeJson(res, 200, { cases: await generateCases({ pluginId, manifest, count, model }) })
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      } finally {
        running = false
      }
    },
  })
}

export function registerGeneratedCaseValidationRoute(webServer, runValidation) {
  let running = false
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/plugin-validation',
    async handler(req, res) {
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      if (running) {
        writeJson(res, 409, { error: 'validation-running' })
        return
      }
      running = true
      try {
        let body = {}
        try { body = await new Promise((resolve, reject) => {
          let raw = ''
          req.on('data', chunk => { raw += String(chunk) })
          req.once('end', () => resolve(raw ? JSON.parse(raw) : {}))
          req.once('error', reject)
        }) } catch { throw new Error('请求体必须是 JSON') }
        const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
        const model = typeof body.model?.provider === 'string' && typeof body.model?.model === 'string'
          ? { provider: body.model.provider, model: body.model.model }
          : undefined
        const cases = Array.isArray(body.cases) ? body.cases.filter(item => typeof item === 'object' && item !== null) : []
        writeJson(res, 200, await runValidation({ pluginId, model, cases }))
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      } finally {
        running = false
      }
    },
  })
}

export function registerPluginValidationRoute(webServer) {
  let running = false
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/plugin-validation/demo-knowledge',
    async handler(req, res) {
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      if (running) {
        writeJson(res, 409, { error: 'validation-running' })
        return
      }
      running = true
      try {
        let body = {}
        try { body = await new Promise((resolve, reject) => {
          let raw = ''
          req.on('data', chunk => { raw += String(chunk) })
          req.once('end', () => resolve(raw ? JSON.parse(raw) : {}))
          req.once('error', reject)
        }) } catch { throw new Error('请求体必须是 JSON') }
        const caseIds = Array.isArray(body.caseIds) ? body.caseIds.filter(item => typeof item === 'string') : undefined
        writeJson(res, 200, await runDemoKnowledgeValidation({ caseIds }))
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      } finally {
        running = false
      }
    },
  })
}

export function registerPortableCasePlanRoute(webServer, runPlan) {
  let running = false
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/plugin-validation/portable-plan',
    async handler(req, res) {
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      if (running) {
        writeJson(res, 409, { error: 'validation-running' })
        return
      }
      running = true
      try {
        let body = {}
        try { body = await new Promise((resolve, reject) => {
          let raw = ''
          req.on('data', chunk => { raw += String(chunk) })
          req.once('end', () => resolve(raw ? JSON.parse(raw) : {}))
          req.once('error', reject)
        }) } catch { throw new Error('请求体必须是 JSON') }
        const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
        if (!pluginId) throw new Error('请选择插件')
        writeJson(res, 200, await runPlan({ pluginId, plan: body.plan }))
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      } finally {
        running = false
      }
    },
  })
}

export function registerPortableSecurityCaseRoute(webServer, runCase) {
  let running = false
  return webServer.register({
    kind: 'exact',
    path: '/api/agent-observe/plugin-validation/portable-security-case',
    async handler(req, res) {
      if (req.method !== 'POST') {
        writeJson(res, 405, { error: 'method-not-allowed' })
        return
      }
      if (running) {
        writeJson(res, 409, { error: 'validation-running' })
        return
      }
      running = true
      try {
        let body = {}
        try { body = await new Promise((resolve, reject) => {
          let raw = ''
          req.on('data', chunk => { raw += String(chunk) })
          req.once('end', () => resolve(raw ? JSON.parse(raw) : {}))
          req.once('error', reject)
        }) } catch { throw new Error('请求体必须是 JSON') }
        const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
        if (!pluginId) throw new Error('请选择插件')
        if (!body.testCase || typeof body.testCase !== 'object' || Array.isArray(body.testCase)) {
          throw new Error('prompt-injection case is required')
        }
        writeJson(res, 200, await runCase({ pluginId, testCase: body.testCase }))
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      } finally {
        running = false
      }
    },
  })
}
