const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'DSH Agent Observe API',
    version: '0.1.0',
    description: 'Plugin discovery, evaluation profile loading, and isolated Portable Case Plan validation.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/agent-observe/installed-plugins': {
      get: {
        summary: 'List installed non-core plugins',
        responses: { '200': { description: 'Installed plugins', content: { 'application/json': { schema: { type: 'object', required: ['plugins'], properties: { plugins: { type: 'array', items: { $ref: '#/components/schemas/Plugin' } } } } } } } },
      },
    },
    '/api/agent-observe/models': {
      get: {
        summary: 'List available DSH models',
        responses: { '200': { description: 'Available models', content: { 'application/json': { schema: { $ref: '#/components/schemas/ModelCatalog' } } } } },
      },
    },
    '/api/agent-observe/evaluation-profiles': {
      get: {
        summary: 'List evaluation profile metadata',
        responses: { '200': { description: 'Evaluation profiles', content: { 'application/json': { schema: { type: 'object', required: ['profiles'], properties: { profiles: { type: 'array', items: { $ref: '#/components/schemas/ProfileSummary' } } } } } } } },
      },
      post: {
        summary: 'Load selected evaluation profiles and cases',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileSelection' } } } },
        responses: { '200': { description: 'Loaded profiles and cases', content: { 'application/json': { schema: { type: 'object', required: ['profiles'], properties: { profiles: { type: 'array', items: { $ref: '#/components/schemas/LoadedProfile' } } } } } } } },
      },
    },
    '/api/agent-observe/plugin-validation/portable-plan': {
      post: {
        summary: 'Run one isolated Portable Case Plan against a plugin',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PortablePlanRequest' } } } },
        responses: { '200': { description: 'Portable evaluation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/PortableResult' } } } }, '409': { description: 'Another validation is running' } },
      },
    },
    '/api/agent-observe/plugin-validation/portable-security-case': {
      post: {
        summary: 'Convert and run one prompt-injection case',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityCaseRequest' } } } },
        responses: { '200': { description: 'Security evaluation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/PortableResult' } } } }, '409': { description: 'Another validation is running' } },
      },
    },
    '/api/agent-observe/plugin-validation': {
      post: {
        summary: 'Run generated cases against a plugin',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GeneratedValidationRequest' } } } },
        responses: { '200': { description: 'Validation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationResult' } } } } },
      },
    },
    '/api/agent-observe/plugin-validation/demo-knowledge': {
      post: {
        summary: 'Run the built-in demo knowledge cases',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/DemoValidationRequest' } } } },
        responses: { '200': { description: 'Validation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationResult' } } } } },
      },
    },
    '/api/agent-observe/generate-cases': {
      post: {
        summary: 'Generate cases for an installed plugin',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CaseGenerationRequest' } } } },
        responses: { '200': { description: 'Generated cases', content: { 'application/json': { schema: { type: 'object', required: ['cases'], properties: { cases: { type: 'array', items: { $ref: '#/components/schemas/GeneratedCase' } } } } } } } },
      },
    },
  },
  components: {
    schemas: {
      Plugin: {
        type: 'object', required: ['id', 'name', 'description', 'available'], properties: {
          id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, available: { type: 'boolean' },
        },
      },
      Model: {
        type: 'object', required: ['provider', 'model', 'name'], properties: {
          provider: { type: 'string' }, model: { type: 'string' }, name: { type: 'string' },
        },
      },
      ModelCatalog: {
        type: 'object', required: ['selected', 'models'], properties: {
          selected: { type: 'object', properties: { provider: { type: 'string' }, model: { type: 'string' } }, nullable: true },
          models: { type: 'array', items: { $ref: '#/components/schemas/Model' } },
        },
      },
      ProfileSummary: {
        type: 'object', required: ['id', 'name', 'version', 'description', 'metrics', 'caseCount', 'standardVersion'], properties: {
          id: { type: 'string' }, name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
          metrics: { type: 'array', items: { type: 'string' } }, caseCount: { type: 'integer' }, standardVersion: { type: 'string' },
        },
      },
      LoadedProfile: {
        allOf: [{ $ref: '#/components/schemas/ProfileSummary' }, { type: 'object', required: ['cases'], properties: { cases: { type: 'array', items: { $ref: '#/components/schemas/EvaluationCase' } } } }],
      },
      EvaluationCase: {
        type: 'object', required: ['id', 'title', 'prompt'], properties: {
          id: { type: 'string' }, title: { type: 'string' }, prompt: { type: 'string' }, expected: { type: 'string' },
          type: { type: 'string' }, input: { type: 'string' }, expectedOutput: { type: 'string' },
          profileId: { type: 'string' }, profileName: { type: 'string' }, profileVersion: { type: 'string' },
        },
      },
      GeneratedCase: {
        type: 'object', required: ['id', 'title', 'prompt', 'expected'], properties: {
          id: { type: 'string' }, title: { type: 'string' }, prompt: { type: 'string' }, expected: { type: 'string' },
        },
      },
      Check: {
        type: 'object', required: ['id', 'passed'], properties: { id: { type: 'string' }, passed: { type: 'boolean' }, reason: { type: 'string' } },
      },
      PortableResult: {
        type: 'object', required: ['status', 'reasons', 'checks', 'actualOutput', 'exitCode', 'durationMs'], properties: {
          status: { type: 'string', enum: ['passed', 'failed'] }, reasons: { type: 'array', items: { type: 'string' } },
          checks: { type: 'array', items: { $ref: '#/components/schemas/Check' } }, actualOutput: { type: 'string' },
          exitCode: { type: 'integer' }, durationMs: { type: 'integer' },
        },
      },
      ValidationResult: {
        type: 'object', required: ['plugin', 'status', 'totalCases', 'passedCases', 'cases'], properties: {
          plugin: { type: 'string' }, status: { type: 'string', enum: ['passed', 'failed', 'partial'] },
          totalCases: { type: 'integer' }, passedCases: { type: 'integer' }, durationMs: { type: 'integer' },
          cases: { type: 'array', items: { type: 'object' } }, recordedAt: { type: 'integer' },
        },
      },
      GeneratedValidationRequest: {
        type: 'object', required: ['pluginId', 'cases'], properties: {
          pluginId: { type: 'string' }, model: { type: 'object', properties: { provider: { type: 'string' }, model: { type: 'string' } } },
          cases: { type: 'array', items: { $ref: '#/components/schemas/GeneratedCase' } },
        },
      },
      DemoValidationRequest: {
        type: 'object', properties: { caseIds: { type: 'array', items: { type: 'string' } } },
      },
      CaseGenerationRequest: {
        type: 'object', required: ['pluginId'], properties: {
          pluginId: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
          model: { type: 'object', properties: { provider: { type: 'string' }, model: { type: 'string' } } },
        },
      },
      ProfileSelection: {
        type: 'object', required: ['profileIds'], properties: { profileIds: { type: 'array', items: { type: 'string' } } },
      },
      PortablePlanRequest: {
        type: 'object', required: ['pluginId', 'plan'], properties: {
          pluginId: { type: 'string' },
          plan: { $ref: '#/components/schemas/PortableCasePlan' },
        },
      },
      SecurityCaseRequest: {
        type: 'object', required: ['pluginId', 'testCase'], properties: {
          pluginId: { type: 'string' },
          testCase: { type: 'object', required: ['id', 'title', 'type', 'input', 'expectedOutput'] },
        },
      },
      PortableCasePlan: {
        type: 'object', required: ['schemaVersion', 'id', 'title', 'setup', 'run', 'assertions'], properties: {
          schemaVersion: { const: 1 }, id: { type: 'string' }, title: { type: 'string' },
          setup: { type: 'array', items: { type: 'object' } },
          run: { type: 'object', required: ['op', 'input'], properties: { op: { const: 'plugin.prompt' }, input: { type: 'string' } } },
          assertions: { type: 'array', minItems: 1, items: { type: 'object' } },
        },
      },
    },
  },
}

function write(res, statusCode, contentType, body) {
  res.writeHead(statusCode, { 'content-type': contentType, 'cache-control': 'no-store' })
  res.end(body)
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function getOpenApiDocument() {
  return structuredClone(openApiDocument)
}

export function registerApiDocsRoutes(webServer) {
  const document = JSON.stringify(openApiDocument, null, 2)
  const html = `<!doctype html><meta charset="utf-8"><title>DSH Agent Observe API</title><style>body{font:14px ui-monospace,monospace;max-width:1100px;margin:2rem auto;padding:0 1rem;background:#111;color:#eee}pre{white-space:pre-wrap;line-height:1.5}a{color:#8bd5ff}</style><h1>DSH Agent Observe API</h1><p><a href="/api-docs/openapi.json">Download OpenAPI JSON</a></p><pre>${escapeHtml(document)}</pre>`
  const disposers = [
    webServer.register({
      kind: 'exact',
      path: '/api-docs/openapi.json',
      async handler(req, res) {
        if (req.method !== 'GET') { write(res, 405, 'application/json; charset=utf-8', JSON.stringify({ error: 'method-not-allowed' })); return }
        write(res, 200, 'application/json; charset=utf-8', document)
      },
    }),
    webServer.register({
      kind: 'exact',
      path: '/api-docs',
      async handler(req, res) {
        if (req.method !== 'GET') { write(res, 405, 'application/json; charset=utf-8', JSON.stringify({ error: 'method-not-allowed' })); return }
        write(res, 200, 'text/html; charset=utf-8', html)
      },
    }),
  ]
  return () => { for (const dispose of disposers) dispose() }
}
