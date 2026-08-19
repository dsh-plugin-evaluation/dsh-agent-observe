import assert from 'node:assert/strict'
import { access, constants } from 'node:fs/promises'
import { randomInt } from 'node:crypto'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import test, { after, before } from 'node:test'

const enabled = process.env.DSH_E2E === '1'
const runValidation = process.env.DSH_E2E_RUN_VALIDATION === '1'
const remoteBaseUrl = process.env.DSH_E2E_BASE_URL
const dshRoot = process.env.DSH_E2E_DSH_ROOT
const dshHome = process.env.DSH_E2E_DSH_HOME
const pluginId = process.env.DSH_E2E_PLUGIN_ID ?? 'dsh-agent-observe'
const pluginRoot = process.env.DSH_E2E_PLUGIN_ROOT ?? resolve(import.meta.dirname, '../..')
const standardsRoot = process.env.DSH_STANDARDS_ROOT
const datasetRoot = process.env.DSH_DATASET_ROOT
const port = Number(process.env.DSH_E2E_PORT ?? randomInt(3100, 3900))
const baseUrl = remoteBaseUrl ?? `http://127.0.0.1:${port}`

let child
let serverAvailable = false
let childOutput = ''

function skipReason() {
  if (!enabled) return '设置 DSH_E2E=1 才运行真实 DSH E2E'
  if (remoteBaseUrl) return undefined
  if (!dshRoot) return '缺少 DSH_E2E_DSH_ROOT'
  if (!dshHome) return '缺少 DSH_E2E_DSH_HOME'
  if (!standardsRoot) return '缺少 DSH_STANDARDS_ROOT'
  if (!datasetRoot) return '缺少 DSH_DATASET_ROOT'
  return undefined
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    if (child?.spawnError) throw child.spawnError
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`DSH Web 提前退出，退出码：${child.exitCode}`)
    try {
      const response = await fetch(`${baseUrl}/`)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 250))
  }
  throw new Error(`DSH Web 启动超时：${lastError?.message ?? 'unknown error'}`)
}

async function waitForObserveRoutes(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/agent-observe/installed-plugins`)
      if (response.headers.get('content-type')?.includes('application/json')) return
      lastError = new Error(`HTTP ${response.status} ${response.headers.get('content-type') ?? 'unknown'}`)
    } catch (error) {
      lastError = error
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 250))
  }
  throw new Error(`agent-observe API 路由启动超时：${lastError?.message ?? 'unknown error'}`)
}

async function installLocalPlugin() {
  const install = spawn('pnpm', ['dsh', 'plugin', '--profile', 'web', 'add', `link:${pluginRoot}`], {
    cwd: dshRoot,
    env: { ...process.env, DSH_HOME: dshHome },
    stdio: process.env.DSH_E2E_VERBOSE === '1' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  install.stdout?.on('data', chunk => { output += String(chunk) })
  install.stderr?.on('data', chunk => { output += String(chunk) })
  const exitCode = await new Promise((resolvePromise, reject) => {
    install.once('error', reject)
    install.once('exit', code => resolvePromise(code ?? 1))
  })
  if (exitCode !== 0) throw new Error(`安装本地评测插件失败（退出码 ${exitCode}）：${output}`)
}

async function jsonRequest(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options?.headers ?? {}) },
  })
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`评测 API 未返回 JSON：${path} HTTP ${response.status} content-type=${response.headers.get('content-type') ?? 'unknown'} body=${text.slice(0, 160)}`)
  }
  return { response, body }
}

const skip = skipReason()

test('real DSH E2E prerequisites are configured', { skip }, async () => {
  if (remoteBaseUrl) return
  for (const path of [dshRoot, dshHome, standardsRoot, datasetRoot]) {
    await access(path, constants.R_OK)
  }
})

before(async () => {
  if (skip) return
  if (remoteBaseUrl) {
    await waitForServer()
    serverAvailable = true
    return
  }
  await installLocalPlugin()
  child = spawn('pnpm', ['dsh', 'web', '--port', String(port)], {
    cwd: dshRoot,
    env: {
      ...process.env,
      DSH_HOME: dshHome,
      DSH_STANDARDS_ROOT: standardsRoot,
      DSH_DATASET_ROOT: datasetRoot,
    },
    stdio: process.env.DSH_E2E_VERBOSE === '1' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', chunk => { childOutput += String(chunk) })
  child.stderr?.on('data', chunk => { childOutput += String(chunk) })
  child.once('error', error => { child.spawnError = error })
  await waitForServer()
  await waitForObserveRoutes()
  serverAvailable = true
})

after(async () => {
  if (!child) return
  child.kill('SIGTERM')
  await new Promise(resolvePromise => child.once('exit', resolvePromise))
  if (process.env.DSH_E2E_VERBOSE !== '1' && childOutput) process.stderr.write(`\n[DSH E2E child output]\n${childOutput}\n`)
})

test('loads the real DSH Web shell', { skip }, async () => {
  assert.equal(serverAvailable, true)
  const response = await fetch(`${baseUrl}/`)
  assert.equal(response.status, 200)
  assert.match(await response.text(), /DSH|DeepSeek|root|script/i)
})

test('discovers the installed observe plugin through the real route', { skip }, async () => {
  const { response, body } = await jsonRequest('/api/agent-observe/installed-plugins', { method: 'GET' })
  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body.plugins))
  assert.ok(body.plugins.some(plugin => plugin.id === pluginId && plugin.available === true))
})

test('lists evaluation catalog metadata without loading cases', { skip }, async () => {
  const { response, body } = await jsonRequest('/api/agent-observe/evaluation-profiles', { method: 'GET' })
  assert.equal(response.status, 200)
  assert.ok(Array.isArray(body.profiles))
  const profile = body.profiles.find(item => item.id === 'prompt-injection-basic-v1')
  assert.ok(profile)
  assert.equal(profile.version, '1.1.0')
  assert.equal(profile.caseCount, 6)
  assert.deepEqual(profile.metrics, ['prompt-injection-safety'])
})

test('loads the selected external dataset on demand', { skip }, async () => {
  const { response, body } = await jsonRequest('/api/agent-observe/evaluation-profiles', {
    method: 'POST',
    body: JSON.stringify({ profileIds: ['prompt-injection-basic-v1'] }),
  })
  assert.equal(response.status, 200)
  assert.equal(body.profiles.length, 1)
  const [profile] = body.profiles
  assert.equal(profile.id, 'prompt-injection-basic-v1')
  assert.equal(profile.cases.length, 6)
  assert.equal(profile.cases[0].type, 'prompt-injection')
  assert.equal(profile.cases[0].expectedOutput, '运输中')
})

test('rejects invalid profile selections through the real route', { skip }, async () => {
  const { response, body } = await jsonRequest('/api/agent-observe/evaluation-profiles', {
    method: 'POST',
    body: JSON.stringify({ profileIds: ['missing-profile'] }),
  })
  assert.equal(response.status, 500)
  assert.match(body.error, /未找到评测方案/)
})

test('runs the real security evaluation and returns a report', { skip: skip || !runValidation }, async () => {
  const loaded = await jsonRequest('/api/agent-observe/evaluation-profiles', {
    method: 'POST',
    body: JSON.stringify({ profileIds: ['prompt-injection-basic-v1'] }),
  })
  assert.equal(loaded.response.status, 200)
  const result = await jsonRequest('/api/agent-observe/plugin-validation', {
    method: 'POST',
    body: JSON.stringify({ pluginId, cases: loaded.body.profiles[0].cases }),
  })
  assert.equal(result.response.status, 200)
  assert.equal(result.body.plugin, pluginId)
  assert.equal(result.body.totalCases, 6)
  assert.equal(result.body.passedCases, result.body.totalCases)
  assert.equal(result.body.status, 'passed')
  assert.equal(result.body.cases.length, 6)
  assert.ok(result.body.cases.every(item => item.passed === true))
  assert.ok(result.body.cases.every(item => item.evaluation?.status === 'passed'))
  assert.ok(result.body.cases.every(item => typeof item.output === 'string'))
})

test('runs one loaded security case through the Portable Security Case route', { skip: skip || !runValidation }, async () => {
  const loaded = await jsonRequest('/api/agent-observe/evaluation-profiles', {
    method: 'POST',
    body: JSON.stringify({ profileIds: ['prompt-injection-basic-v1'] }),
  })
  assert.equal(loaded.response.status, 200)
  const testCase = loaded.body.profiles[0].cases[0]
  const result = await jsonRequest('/api/agent-observe/plugin-validation/portable-security-case', {
    method: 'POST',
    body: JSON.stringify({ pluginId, testCase }),
  })
  assert.equal(result.response.status, 200)
  assert.equal(result.body.status, 'passed')
  assert.equal(result.body.actualOutput.includes(testCase.expectedOutput), true)
  assert.ok(result.body.checks.some(check => check.id === 'original-task-completed' && check.passed === true))
})
