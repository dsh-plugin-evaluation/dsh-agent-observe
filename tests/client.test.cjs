const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path')

function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  return textOf(node.children)
}

function findByText(node, text) {
  if (node === null || node === undefined || typeof node !== 'object') return undefined
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByText(child, text)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (textOf(node).trim() === text) return node
  for (const child of node.children ?? []) {
    const found = findByText(child, text)
    if (found !== undefined) return found
  }
  return undefined
}

function findAll(node, predicate, results = []) {
  if (node === null || node === undefined || typeof node !== 'object') return results
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, results)
    return results
  }
  if (predicate(node)) results.push(node)
  for (const child of node.children ?? []) findAll(child, predicate, results)
  return results
}

function loadClient() {
  const registrations = []
  const styles = []
  const hookState = []
  let hookCursor = 0
  let deferValidation = false
  let resolveValidation
  let validationConflict = false
  let profilesServiceUnavailable = false
  const originalSetInterval = global.setInterval
  const originalClearInterval = global.clearInterval
  global.setInterval = () => 0
  global.clearInterval = () => {}
  const React = {
    createElement(type, props, ...children) {
      if (typeof type === 'function') return type({ ...(props ?? {}), children })
      return { type, props: props ?? {}, children }
    },
    Fragment: 'fragment',
    useState(initial) {
      const index = hookCursor
      hookCursor += 1
      if (!(index in hookState)) hookState[index] = typeof initial === 'function' ? initial() : initial
      return [hookState[index], value => { hookState[index] = typeof value === 'function' ? value(hookState[index]) : value }]
    },
    useEffect(callback) { callback() },
  }
  const dictionaries = { zh: {}, en: {} }
  const context = {
    locale: {
      register(_namespace, values) {
        Object.assign(dictionaries.zh, values.zh)
        Object.assign(dictionaries.en, values.en)
        return () => {}
      },
      bind() { return key => dictionaries.zh[key] ?? key },
    },
    slots: {
      inject(_name, callback) { return callback() },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
    effect(callback) { return callback() },
  }

  const storage = new Map()
  global.localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null },
    setItem(key, value) { storage.set(key, value) },
  }
  const listeners = new Map()
  global.Event = class Event { constructor(type) { this.type = type } }
  global.window = {
    addEventListener(type, handler) { listeners.set(type, handler) },
    removeEventListener(type) { listeners.delete(type) },
    dispatchEvent(event) { listeners.get(event.type)?.(event); return true },
    __ModuleLoader__: {
      load(entry) {
        const plugin = entry.factory((id) => {
          if (id === 'react') return React
          if (id === '@deepseek-ai/dsh-client-ui-primitives') return {
            Modal: ({ children, footer, description, ...props }) => React.createElement('div', { ...props, 'data-component': 'Modal' }, description, children, footer),
            Button: ({ children, ...props }) => React.createElement('button', props, children),
            Input: props => React.createElement('input', props),
            IconChecklistOutline14: props => React.createElement('svg', { ...props, 'data-component': 'IconChecklistOutline14' }),
            Toast: ({ text, ...props }) => React.createElement('div', { ...props, 'data-component': 'Toast' }, text),
          }
          throw new Error(`unexpected module: ${id}`)
        })
        plugin.apply(context)
      },
    },
  }
  global.document = {
    querySelector() { return null },
    createElement() { return { dataset: {}, textContent: '' } },
    head: { appendChild(tag) { styles.push(tag) } },
  }
  const fetchRequests = []
  global.fetch = async (url, options) => {
    const request = { url, options }
    fetchRequests.push(request)
    if (url === '/api/agent-observe/installed-plugins') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ plugins: [{ id: 'demo-knowledge', name: 'demo-knowledge', description: '查询退款、配送和电子发票知识', available: true }] }) }
    }
    if (url === '/api/agent-observe/models') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ selected: { provider: 'ark', model: 'deepseek-v4-flash' }, models: [{ provider: 'ark', model: 'deepseek-v4-flash', name: 'Ark · DeepSeek V4 Flash' }, { provider: 'ark', model: 'deepseek-v4-pro', name: 'Ark · DeepSeek V4 Pro' }] }) }
    }
    if (url === '/api/agent-observe/evaluation-profiles') {
      if (profilesServiceUnavailable) return { ok: false, status: 404, text: async () => 'not found' }
      const profiles = [{
        id: 'default-v1', name: '默认插件评测', version: '1.0.0', description: '适用于当前 DSH 插件隔离评测闭环的基础方案。', metrics: ['answer-matches-expected', 'duration'], caseCount: 2, standardVersion: 'local-609476c',
        cases: [
          { id: 'refund-window', title: '查询退款申请时限', prompt: '请查询退款时限。', expected: '30 天', profileId: 'default-v1', profileName: '默认插件评测', profileVersion: '1.0.0' },
          { id: 'shipping-sla', title: '查询标准配送时效', prompt: '请查询配送时效。', expected: '3 个工作日', profileId: 'default-v1', profileName: '默认插件评测', profileVersion: '1.0.0' },
        ],
      }]
      if (options?.method === 'POST') return { ok: true, status: 200, text: async () => JSON.stringify({ profiles }) }
      return { ok: true, status: 200, text: async () => JSON.stringify({ profiles: profiles.map(({ cases, ...profile }) => profile) }) }
    }
    const cases = [{ id: 'refund-window', title: '查询退款申请时限', expected: '30 天', profileId: 'default-v1', profileName: '默认插件评测', profileVersion: '1.0.0', output: '退款申请默认时限为 30 天。', durationMs: 400, passed: true, error: null }]
    const result = { plugin: 'demo-knowledge', status: 'passed', totalCases: cases.length, passedCases: cases.length, durationMs: 400, recordedAt: 1, cases }
    if (validationConflict) return { ok: false, status: 409, text: async () => JSON.stringify({ error: 'validation-running' }) }
    if (deferValidation) await new Promise(resolve => { resolveValidation = resolve })
    return { ok: true, status: 200, text: async () => JSON.stringify(result) }
  }

  const file = require.resolve(path.resolve(__dirname, '../src/client.js'))
  delete require.cache[file]
  require(file)
  return {
    registrations,
    styles,
    storage,
    get fetchRequests() { return fetchRequests },
    reset() {
      hookState.length = 0
      storage.clear()
      fetchRequests.length = 0
      deferValidation = false
      resolveValidation = undefined
      validationConflict = false
      profilesServiceUnavailable = false
    },
    resetHooks() { hookState.length = 0 },
    restoreTimers() { global.setInterval = originalSetInterval; global.clearInterval = originalClearInterval },
    deferValidation() { deferValidation = true },
    resolveValidation() { resolveValidation?.(); deferValidation = false; resolveValidation = undefined },
    setValidationConflict() { validationConflict = true },
    setProfilesServiceUnavailable() { profilesServiceUnavailable = true },
    render(id, props) {
      hookCursor = 0
      return registrations.find(item => item.options.id === id).component(props)
    },
  }
}

const client = loadClient()

test.beforeEach(() => { client.reset() })
test.after(() => { client.restoreTimers() })

function projections() {
  return {
    sessionStats: {
      turns: 2, steps: 8, llmMs: 4200, toolMs: 900, ttftMs: 300,
      ttftSteps: 2, decodeMs: 3900, decodeTokens: 200,
    },
    tokenUsage: {
      uncachedInputTokens: 1000, outputTokens: 500, cacheReadTokens: 250, cacheWriteTokens: 50,
    },
    agentObserve: {
      model: 'deepseek-v4-pro', toolCalls: 3, toolErrors: 1, approvals: 1,
      approvalDenied: 1, turnErrors: 1, estimatedCost: 0.012,
      tools: { bash: { calls: 3, errors: 1, totalMs: 900 } },
      failures: [{
        callId: 'call-17', name: 'bash', turn: 2, step: 3,
        arguments: '{"command":"exit 1"}', durationMs: 230,
        errorName: 'ExitError', errorCode: 'EXIT_1', errorMessage: 'command failed',
        result: 'command failed', failedAt: 500,
      }],
    },
  }
}

test('registers the observe view and renders projected metrics and evidence', () => {
  const observe = client.registrations.find(item => item.options.id === 'observe')
  const evaluation = client.registrations.find(item => item.options.id === 'evaluation')
  assert.equal(observe.options.order, 20)
  assert.equal(evaluation.options.order, 30)
  assert.equal(client.styles.length, 1)

  const node = client.render('observe', {
    sessionId: 'session-1', useProjection: key => projections()[key], openView() {}, t: key => key,
  })
  const text = textOf(node)
  assert.match(text, /summary\.title/)
  assert.match(text, /status\.attention/)
  assert.match(text, /deepseek-v4-pro/)
  assert.match(text, /call-17/)
  assert.match(text, /EXIT_1/)
  assert.match(text, /command failed/)
  assert.match(text, /\$0\.012/)
})

test('locates the failed call in Trajectory through the owner navigation contract', () => {
  const calls = []
  const node = client.render('observe', {
    sessionId: 'session-1', useProjection: key => projections()[key],
    openView: (...args) => calls.push(args), t: key => key,
  })
  const button = findAll(node, item => item.type === 'button' && textOf(item) === 'failures.trajectory')[0]
  assert.ok(button)
  button.props.onClick()
  assert.deepEqual(calls, [['trajectory', { callId: 'call-17' }]])
})

test('saves a human-admission Badcase draft rather than an active regression case', () => {
  const props = {
    sessionId: 'session-1', useProjection: key => projections()[key], openView() {}, t: key => key,
  }
  let node = client.render('observe', props)
  const create = findAll(node, item => item.type === 'button' && textOf(item) === 'failures.candidate')[0]
  create.props.onClick()

  node = client.render('observe', props)
  assert.ok(findByText(node, 'candidate.notice'))
  const textareas = findAll(node, item => item.type === 'textarea')
  assert.equal(textareas.length, 2)
  textareas[0].props.onChange({ target: { value: '工具失败时应返回可操作建议' } })

  node = client.render('observe', props)
  const form = findAll(node, item => item.type === 'form')[0]
  form.props.onSubmit({ preventDefault() {} })

  const database = JSON.parse(client.storage.get('dsh-agent-observe.evaluation.v1'))
  assert.equal(database.candidates.length, 1)
  assert.equal(database.candidates[0].status, 'pending_review')
  assert.equal(database.candidates[0].caseSource, 'badcase')
  assert.equal(database.candidates[0].reviewStatus, 'pending')
  assert.equal(database.candidates[0].kind, 'regression')
  assert.equal(database.candidates[0].expected, '工具失败时应返回可操作建议')
  assert.equal(database.candidates[0].source.sessionId, 'session-1')
  assert.equal(database.candidates[0].source.callId, 'call-17')
})

test('session evaluation is a shortcut to the workspace evaluation center', () => {
  const props = {
    sessionId: 'session-1', useProjection: key => projections()[key], openView() {}, t: key => key,
  }
  const node = client.render('evaluation', props)
  assert.match(textOf(node), /当前 Session 评测/)
  assert.match(textOf(node), /当前失败/)
  assert.match(textOf(node), /在评测中心打开/)
  assert.doesNotMatch(textOf(node), /评测标准/)
})

test('sidebar evaluation center opens as a workspace-level view', () => {
  const launcher = client.registrations.find(item => item.options.id === 'evaluation-center')
  assert.equal(launcher.options.name, 'sidebar.footer.action')
  let node = client.render('evaluation-center', { wide: true })
  const open = findAll(node, item => item.type === 'button' && item.props.title === '评测中心')[0]
  assert.ok(open)
  assert.equal(textOf(open).trim(), '评测中心')
  assert.equal(open.props.className, 'aev-launcher')
  assert.equal(findAll(open, item => item.props?.['data-component'] === 'IconChecklistOutline14').length, 1)
  assert.equal(findAll(open, item => item.props?.className === 'aev-launcherLabel').length, 1)
  open.props.onClick()

  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /插件评测中心/)
  assert.match(textOf(node), /实验记录/)
  assert.equal(findAll(node, item => item.props?.className === 'aev-nav').length, 0)
  assert.doesNotMatch(textOf(node), /Badcase 审核/)
  assert.match(textOf(node), /返回会话/)
})

function openEvaluationCenter() {
  let node = client.render('evaluation-center', { wide: true })
  const open = findAll(node, item => item.type === 'button' && item.props.title === '评测中心')[0]
  open.props.onClick()
  return client.render('evaluation-center', { wide: true })
}

test('loads the profile service only after the user opens the scheme picker', async () => {
  client.setProfilesServiceUnavailable()
  let node = openEvaluationCenter()
  await findAll(node, item => item.type === 'button' && textOf(item) === '创建实验')[0].props.onClick()
  assert.deepEqual(client.fetchRequests.map(item => item.url).sort(), ['/api/agent-observe/installed-plugins', '/api/agent-observe/models'])
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /创建实验/)
  assert.doesNotMatch(textOf(node), /评测方案服务尚未就绪/)

  await findAll(node, item => item.type === 'button' && textOf(item) === '选择评测方案')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /评测方案服务未就绪，请重启 DSH Web 后重试/)
  assert.doesNotMatch(textOf(node), /Unexpected token|not valid JSON|重新检查/)
  assert.ok(findAll(node, item => item.props?.['data-component'] === 'Toast')[0])
  assert.ok(findAll(node, item => item.props?.['data-component'] === 'Modal' && item.props.className === 'aev-createModal')[0])
})

test('plugin experiment loads plugins, real models, and community evaluation profiles', async () => {
  let node = openEvaluationCenter()
  assert.match(textOf(node), /实验记录/)
  assert.match(textOf(node), /创建实验/)

  await findAll(node, item => item.type === 'button' && textOf(item) === '创建实验')[0].props.onClick()
  assert.deepEqual(client.fetchRequests.map(item => item.url).sort(), ['/api/agent-observe/installed-plugins', '/api/agent-observe/models'])
  node = client.render('evaluation-center', { wide: true })
  await findAll(node, item => item.type === 'button' && textOf(item) === '选择评测方案')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  const modal = findAll(node, item => item.props?.['data-component'] === 'Modal')[0]
  assert.ok(modal)
  assert.equal(modal.props.className, 'aev-createModal')
  assert.match(textOf(node), /当前 Web Profile/)
  assert.match(textOf(node), /生成与判定模型/)
  assert.match(textOf(node), /评测方案/)
  assert.match(textOf(node), /默认插件评测 v1\.0\.0/)
  assert.doesNotMatch(textOf(node), /评测指标|生成用例数量|AI生成/)
  assert.equal(findAll(node, item => item.type === 'select').length, 2)
  assert.equal(findAll(node, item => item.type === 'input' && item.props.type === 'number').length, 0)
})

test('searches and multi-selects community profiles before fetching their case snapshots', async () => {
  let node = openEvaluationCenter()
  await findAll(node, item => item.type === 'button' && textOf(item) === '创建实验')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  await findAll(node, item => item.type === 'button' && textOf(item) === '选择评测方案')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /方案和测试用例来自固定版本的社区评测标准库/)
  assert.equal(findAll(node, item => item.props?.className === 'aev-profileOption').length, 1)
  const search = findAll(node, item => item.type === 'input' && item.props.placeholder === '搜索评测方案')[0]
  search.props.onChange({ target: { value: '不存在' } })
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /没有匹配的评测方案/)
})

test('creates an experiment from selected profile snapshots without generating cases', async () => {
  let node = openEvaluationCenter()
  await findAll(node, item => item.type === 'button' && textOf(item) === '创建实验')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  findAll(node, item => item.type === 'select')[1].props.onChange({ target: { value: 'ark:deepseek-v4-pro' } })
  node = client.render('evaluation-center', { wide: true })
  await findAll(node, item => item.type === 'button' && textOf(item) === '选择评测方案')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  findAll(node, item => item.type === 'input' && item.props.type === 'checkbox')[0].props.onChange()
  node = client.render('evaluation-center', { wide: true })
  findAll(node, item => item.type === 'button' && textOf(item) === '确定选择 (1)')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  findAll(node, item => item.type === 'form' && item.props.className === 'aob-form aev-createForm')[0].props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  const request = client.fetchRequests.find(item => item.url === '/api/agent-observe/evaluation-profiles' && item.options?.method === 'POST')
  assert.deepEqual(JSON.parse(request.options.body), { profileIds: ['default-v1'] })
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /已选评测方案与用例/)
  assert.match(textOf(node), /默认插件评测/)
  assert.match(textOf(node), /执行已选用例 \(2\)/)
  const database = JSON.parse(client.storage.get('dsh-agent-observe.evaluation.v1'))
  assert.equal(database.records[0].profiles[0].standardVersion, 'local-609476c')
  assert.equal(database.records[0].cases.length, 2)
})

test('groups same-id cases by profile without deduplicating them', () => {
  client.storage.set('dsh-agent-observe.evaluation.v1', JSON.stringify({
    version: 1,
    records: [{
      id: 'experiment-grouped', name: '多方案实验', pluginId: 'demo-knowledge', metrics: [], createdAt: 1, status: 'failed',
      cases: [
        { id: 'shared-case', title: 'Alpha 用例', selected: true, expected: 'A', profileId: 'alpha-v1', profileName: 'Alpha 方案', profileVersion: '1.0.0' },
        { id: 'shared-case', title: 'Beta 用例', selected: true, expected: 'B', profileId: 'beta-v1', profileName: 'Beta 方案', profileVersion: '2.0.0' },
      ],
      result: { status: 'failed', totalCases: 2, passedCases: 1, durationMs: 100, cases: [
        { id: 'shared-case', title: 'Alpha 用例', expected: 'A', passed: true, output: 'A', profileId: 'alpha-v1', profileName: 'Alpha 方案', profileVersion: '1.0.0' },
        { id: 'shared-case', title: 'Beta 用例', expected: 'B', passed: false, error: '不匹配', output: 'x', profileId: 'beta-v1', profileName: 'Beta 方案', profileVersion: '2.0.0' },
      ] },
    }],
    candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
  }))
  let node = openEvaluationCenter()
  findAll(node, item => item.type === 'button' && textOf(item) === '查看失败')[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /Alpha 方案/)
  assert.match(textOf(node), /Beta 方案/)
  assert.equal(findAll(node, item => item.type === 'article' && item.props.className.startsWith('aev-resultCase')).length, 2)
  assert.equal(findAll(node, item => item.type === 'input' && item.props.type === 'checkbox').length, 2)
})

test('shows execution feedback and locks experiment controls while validation runs', async () => {
  client.storage.set('dsh-agent-observe.evaluation.v1', JSON.stringify({
    version: 1,
    records: [{
      id: 'experiment-running', name: '运行中的实验', pluginId: 'demo-knowledge', metrics: ['工具调用成功'], createdAt: 1,
      status: 'draft', cases: [{ id: 'generated-1', title: '查询退款申请时限', selected: true, expected: '返回退款申请默认时限。' }],
      candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
    }],
    candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
  }))
  let node = openEvaluationCenter()
  assert.ok(findByText(node, '待执行'))
  findAll(node, item => item.type === 'button' && textOf(item) === '继续执行')[0].props.onClick()
  client.deferValidation()
  node = client.render('evaluation-center', { wide: true })
  const execution = findAll(node, item => item.type === 'button' && textOf(item).startsWith('执行已选用例'))[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /正在隔离环境中执行 1 条用例/)
  assert.match(textOf(node), /已耗时/)
  assert.match(textOf(node), /请保持页面打开/)
  assert.equal(findAll(node, item => item.type === 'input' && item.props.type === 'checkbox')[0].props.disabled, true)
  assert.equal(findAll(node, item => item.type === 'button' && textOf(item) === '返回实验记录')[0].props.disabled, true)
  client.resolveValidation()
  await execution
})

test('explains when another isolated validation is already running', async () => {
  client.storage.set('dsh-agent-observe.evaluation.v1', JSON.stringify({
    version: 1,
    records: [{ id: 'experiment-conflict', name: '并发实验', pluginId: 'demo-knowledge', metrics: [], createdAt: 1, status: 'draft', cases: [{ id: 'case-1', title: '检查日志', selected: true, expected: '返回日志。' }] }],
    candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
  }))
  let node = openEvaluationCenter()
  findAll(node, item => item.type === 'button' && textOf(item) === '继续执行')[0].props.onClick()
  client.setValidationConflict()
  node = client.render('evaluation-center', { wide: true })
  await findAll(node, item => item.type === 'button' && textOf(item).startsWith('执行已选用例'))[0].props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /已有实验正在隔离环境中执行，请等待它完成后再试。/)
})

test('summarizes failed experiment results before the expandable raw output', () => {
  client.storage.set('dsh-agent-observe.evaluation.v1', JSON.stringify({
    version: 1,
    records: [{
      id: 'experiment-failed', name: '失败实验', pluginId: 'demo-knowledge', metrics: [], createdAt: 1, status: 'failed',
      cases: [{ id: 'case-1', title: '检查审计日志', selected: true, expected: '返回最近的审计日志。' }],
      result: { status: 'failed', totalCases: 1, passedCases: 0, durationMs: 65000, cases: [{ id: 'case-1', title: '检查审计日志', expected: '返回最近的审计日志。', passed: false, error: '模型未返回有效结论', output: '很长的原始模型输出' }] },
    }],
    candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
  }))
  let node = openEvaluationCenter()
  assert.ok(findByText(node, '未通过'))
  const action = findAll(node, item => item.type === 'button' && textOf(item) === '查看失败')[0]
  assert.equal(action.props.className, 'aob-button aev-recordAction failed')
  action.props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /实验未通过/)
  assert.match(textOf(node), /通过用例/)
  assert.match(textOf(node), /失败用例/)
  assert.match(textOf(node), /执行耗时/)
  assert.match(textOf(node), /失败原因：模型未返回有效结论/)
  assert.ok(findByText(node, '查看运行详情'))
  assert.equal(findAll(node, item => item.props?.className === 'aev-resultStat ok').length, 1)
  assert.equal(findAll(node, item => item.props?.className === 'aev-resultStat bad').length, 1)
  assert.equal(findAll(node, item => item.type === 'article' && item.props.className === 'aev-resultCase failed').length, 1)
})

test('paginates experiment records in groups of ten', () => {
  const records = Array.from({ length: 11 }, (_, index) => ({
    id: `experiment-${index + 1}`, name: `实验 ${index + 1}`, pluginId: 'demo-knowledge', metrics: [], cases: [], status: 'draft', createdAt: index + 1,
  }))
  client.storage.set('dsh-agent-observe.evaluation.v1', JSON.stringify({
    version: 1, records,
    candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
  }))
  let node = openEvaluationCenter()
  assert.match(textOf(node), /第 1\/2 页 · 共 11 条/)
  assert.match(textOf(node), /实验 11/)
  assert.doesNotMatch(textOf(node), /实验 1\b/)
  const next = findAll(node, item => item.type === 'button' && item.props['aria-label'] === '下一页')[0]
  assert.equal(next.props.disabled, false)
  next.props.onClick()
  node = client.render('evaluation-center', { wide: true })
  assert.match(textOf(node), /第 2\/2 页 · 共 11 条/)
  assert.match(textOf(node), /实验 1\b/)
  assert.doesNotMatch(textOf(node), /实验 11/)
})

test('lists plugin experiments by their latest execution or creation time', () => {
  client.storage.set('dsh-agent-observe.evaluation.v1', JSON.stringify({
    version: 1,
    records: [
      { id: 'old', name: '较早创建', pluginId: 'demo-knowledge', metrics: [], cases: [], status: 'draft', createdAt: 100 },
      { id: 'recent-run', name: '最近执行', pluginId: 'demo-knowledge', metrics: [], cases: [], status: 'passed', createdAt: 200, executedAt: 400 },
      { id: 'recent-create', name: '最近创建', pluginId: 'demo-knowledge', metrics: [], cases: [], status: 'draft', createdAt: 300 },
    ],
    candidates: [], samples: [], datasets: [], scenarioFamilies: [], scoreProfiles: [], baselines: [], optimizationRequests: [], pluginExperiments: [], iterations: [], releases: [],
  }))
  const node = openEvaluationCenter()
  const rows = findAll(node, item => item.type === 'tr')
  assert.match(textOf(rows[0]), /创建时间/)
  assert.equal(textOf(rows[1]).includes('最近执行'), true)
  assert.equal(textOf(rows[2]).includes('最近创建'), true)
  assert.equal(textOf(rows[3]).includes('较早创建'), true)
})

test('keeps collected Badcase candidates out of the simplified evaluation center', () => {
  const props = {
    sessionId: 'session-1', useProjection: key => projections()[key], openView() {}, t: key => key,
  }
  let node = client.render('observe', props)
  findAll(node, item => item.type === 'button' && textOf(item) === 'failures.candidate')[0].props.onClick()
  node = client.render('observe', props)
  findAll(node, item => item.type === 'textarea')[0].props.onChange({ target: { value: '返回可操作的修复建议' } })
  node = client.render('observe', props)
  findAll(node, item => item.type === 'form')[0].props.onSubmit({ preventDefault() {} })

  client.resetHooks()
  node = openEvaluationCenter()
  assert.doesNotMatch(textOf(node), /Badcase 审核/)

  const database = JSON.parse(client.storage.get('dsh-agent-observe.evaluation.v1'))
  assert.equal(database.candidates[0].status, 'pending_review')
  assert.equal(database.samples.length, 0)
})

test('workspace evaluation center exposes only the first-version experiment workflow', () => {
  const node = openEvaluationCenter()
  const text = textOf(node)
  assert.match(text, /实验记录/)
  assert.match(text, /创建实验/)
  assert.doesNotMatch(text, /Badcase 审核/)
  assert.doesNotMatch(text, /Badcase 候选/)
  assert.doesNotMatch(text, /数据集/)
  assert.doesNotMatch(text, /场景族/)
  assert.doesNotMatch(text, /评测标准/)
  assert.doesNotMatch(text, /AI 优化中心/)
  assert.doesNotMatch(text, /Agent 迭代/)
  assert.doesNotMatch(text, /版本归档/)
})
